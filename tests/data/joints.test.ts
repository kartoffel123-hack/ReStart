/**
 * Ticket 5 · V02 · one joint per piece pair per axis line (plan 02 §3C step 4, RV-003b).
 *
 * `contacts.ts` confirms 1,632 *face-pair* joints, but a long bore is modelled as several
 * cylindrical faces and a stepped pin has a face per step, so those 1,632 describe far fewer
 * real connections. The graph must be built from connections, not from the tessellator's
 * face boundaries, and a stroke planned from a face-pair count would ask the mechanic to free
 * the same fit several times.
 *
 * The aggregate keeps what the move generator is allowed to use — the contact region and the
 * release direction established for that interface (plan 02 §3C step 4) — and keeps every
 * face-pair id it merged, so a reviewer can walk back to the STEP entities behind it.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseStepEntities } from '../../tools/lib/step-file.js';
import { buildAssemblyTree } from '../../tools/lib/step-tree.js';
import { extractFeatureTable } from '../../tools/lib/features.js';
import { extractCandidateInterfaces } from '../../tools/lib/interfaces.js';
import { tessellateStep } from '../../tools/lib/step-meshes.js';
import { buildCrosswalk } from '../../tools/lib/crosswalk.js';
import { confirmInterfaces, worldMesh, type WorldMesh } from '../../tools/lib/contacts.js';
import type { Vec3 } from '../../tools/lib/step-tree.js';
import type { MatingInterface, WorldFace } from '../../tools/lib/interfaces.js';
import type { ConfirmedInterface } from '../../tools/lib/contacts.js';
import { aggregateJoints } from '../../tools/lib/joints.js';

const STEP_PATH = 'assets/lego-helicopter-30465-1.snapshot.9/STEP File Assembly - Lego Helicopter - 30465.STEP';
const STAGE1_AXLE = '30465/NAUO1/NAUO79';

const Z: Vec3 = [0, 0, 1];

function face(occurrenceId: string, entityId: string, radiusMm: number, origin: Vec3, axis: Vec3): WorldFace {
    return {
        occurrenceId,
        occurrenceName: occurrenceId.startsWith('pin') ? 'Axle 3' : 'Beam 3',
        definitionId: `pd:${occurrenceId}`,
        sourceEntityId: entityId,
        radiusMm,
        origin,
        axis
    };
}

/**
 * A confirmed face pair: a pin face and a beam face on one line, gripping between
 * `fromMm` and `toMm` measured along the *pin's* own axis from the *pin's* own origin, which is
 * the frame `contacts.ts` reports.
 */
function pair(
    id: string,
    pinOrigin: Vec3,
    beamOrigin: Vec3,
    fromMm: number,
    toMm: number,
    options: Readonly<{ pinAxis?: Vec3; pinRadius?: number; beamRadius?: number; contactMm?: number }> = {}
): ConfirmedInterface {
    const pinAxis = options.pinAxis ?? Z;
    const male = face('pin-1', `${id}:pin`, options.pinRadius ?? 2.35, pinOrigin, pinAxis);
    const female = face('beam-1', `${id}:beam`, options.beamRadius ?? 2.4, beamOrigin, Z);
    const source: MatingInterface = {
        id: `mi:${id}`,
        a: male,
        b: female,
        male,
        female,
        kind: 'axle-bore',
        axis: pinAxis,
        origin: pinOrigin,
        radialGapMm: Math.abs(male.radiusMm - female.radiusMm),
        axisOffsetMm: 0,
        releaseDirections: [pinAxis, [-pinAxis[0], -pinAxis[1], -pinAxis[2]] as Vec3]
    };
    return {
        source,
        contactMm: options.contactMm ?? 0.02,
        engagementMm: toMm - fromMm,
        contactSpanMm: [fromMm, toMm],
        grippedTriangles: 8,
        maleSide: 'shaft',
        femaleSide: 'void'
    };
}

describe('collapsing face pairs into the connections a graph needs', () => {
    it('merges the faces of a bore split along its length into one joint', () => {
        // One beam wall modelled as three cylindrical faces, so the same 7.85 mm grip is
        // described three times over.
        const joints = aggregateJoints([
            pair('a', [0, 0, 0], [0, 0, 0], 0, 2.6),
            pair('b', [0, 0, 0], [0, 0, 0], 2.6, 5.2),
            pair('c', [0, 0, 0], [0, 0, 0], 5.2, 7.85)
        ]);
        expect(joints.facePairJoints).toBe(3);
        expect(joints.joints).toHaveLength(1);
        const joint = joints.joints[0];
        expect(joint?.pieces).toEqual(['beam-1', 'pin-1']);
        expect(joint?.engagementMm).toBeCloseTo(7.85, 6);
        expect(joint?.spanMm[0]).toBeCloseTo(0, 6);
        expect(joint?.spanMm[1]).toBeCloseTo(7.85, 6);
        expect(joint?.faces.map((f) => f.id)).toEqual(['mi:a', 'mi:b', 'mi:c']);
    });

    it('never counts a grip twice because two face pairs describe the same stretch', () => {
        // The counterexample to summing: the same 3 mm reported by three face pairs of a pin
        // whose profile is stepped, which would read as a 9 mm grip and ask for a 9 mm stroke.
        const joints = aggregateJoints([
            pair('a', [0, 0, 0], [0, 0, 0], 0, 3, { pinRadius: 2.35 }),
            pair('b', [0, 0, 0], [0, 0, 0], 0, 3, { pinRadius: 2.35 }),
            pair('c', [0, 0, 0], [0, 0, 0], 0, 3, { pinRadius: 2.35 })
        ]);
        expect(joints.joints).toHaveLength(1);
        expect(joints.joints[0]?.engagementMm).toBeCloseTo(3, 6);
        expect(joints.joints[0]?.bands).toHaveLength(1);
    });

    it('keeps two grips on two parallel lines as two joints', () => {
        // A cross-block fitted on two axles: one pair of pieces, two distinct lines 8 mm apart.
        // Folding them together would invent a single release direction for two strokes.
        const joints = aggregateJoints([
            pair('a', [0, 0, 0], [0, 0, 0], 0, 4),
            pair('b', [8, 0, 0], [8, 0, 0], 0, 4)
        ]);
        expect(joints.joints).toHaveLength(2);
        for (const joint of joints.joints) expect(joint.engagementMm).toBeCloseTo(4, 6);
    });

    it('reports a split grip as two bands rather than one long one', () => {
        // A pin gripped by a bush and again by a beam further along the same line, with air
        // between. The bounding region is 14 mm but only 7 mm of it is grip, and the manual has
        // to say where the pin actually binds.
        const joints = aggregateJoints([
            pair('a', [0, 0, 0], [0, 0, 0], 0, 3),
            pair('b', [0, 0, 0], [0, 0, 0], 10, 14)
        ]);
        const joint = joints.joints[0];
        expect(joint?.bands).toHaveLength(2);
        expect(joint?.bands[0]).toEqual([0, 3]);
        expect(joint?.bands[1]).toEqual([10, 14]);
        expect(joint?.engagementMm).toBeCloseTo(7, 6);
        expect(joint?.spanMm).toEqual([0, 14]);
    });

    it('reads the same line however each face recorded its own origin and sense', () => {
        // The pin's cylinder records its axis 20 mm along the line and the beam's points the
        // other way: one line, one joint, one grip.
        const joints = aggregateJoints([
            pair('a', [0, 0, 20], [0, 0, 0], -20, -17),
            pair('b', [0, 0, 3], [0, 0, 12], 0, 3, { pinAxis: [0, 0, -1] })
        ]);
        expect(joints.joints).toHaveLength(1);
        expect(joints.joints[0]?.engagementMm).toBeCloseTo(3, 6);
    });

    it('names one release axis whose sense does not depend on which face arrived first', () => {
        // The same 3 mm of world grip, recorded twice: once from a cylinder whose axis runs up
        // and starts at z=0, once from one that runs down and starts at z=3. The joint, its
        // bands and its id must come out identical, or the graph would depend on CAD winding.
        const forward = aggregateJoints([pair('a', [0, 0, 0], [0, 0, 0], 0, 3)]);
        const reversed = aggregateJoints([pair('a', [0, 0, 3], [0, 0, 0], 0, 3, { pinAxis: [0, 0, -1] })]);
        expect(reversed.joints[0]?.axis).toEqual(forward.joints[0]?.axis);
        expect(reversed.joints[0]?.bands).toEqual(forward.joints[0]?.bands);
        expect(reversed.joints[0]?.id).toBe(forward.joints[0]?.id);
    });

    it('keeps a stepped fit as one joint and says it is stepped', () => {
        // A pin whose 2.35 mm section grips one face and whose 2.45 mm section grips another on
        // the same line: one connection, two diameters, and a reviewer flag rather than a split.
        const joints = aggregateJoints([
            pair('a', [0, 0, 0], [0, 0, 0], 0, 3, { pinRadius: 2.35, beamRadius: 2.4 }),
            pair('b', [0, 0, 0], [0, 0, 0], 3, 6, { pinRadius: 2.45, beamRadius: 2.5 })
        ]);
        expect(joints.joints).toHaveLength(1);
        expect(joints.joints[0]?.radii).toEqual([
            { maleMm: 2.35, femaleMm: 2.4 },
            { maleMm: 2.45, femaleMm: 2.5 }
        ]);
    });

    it('is not changed by the order the confirmed pairs arrive in', () => {
        const inputs = [
            pair('a', [0, 0, 0], [0, 0, 0], 0, 2.6),
            pair('b', [0, 0, 0], [0, 0, 0], 2.6, 5.2),
            pair('c', [8, 0, 0], [8, 0, 0], 0, 4),
            pair('d', [0, 0, 20], [0, 0, 0], -20, -17)
        ];
        const forward = aggregateJoints(inputs);
        const backward = aggregateJoints([...inputs].reverse());
        expect(backward.joints).toEqual(forward.joints);
        expect(backward.joints.map((j) => j.id)).toEqual(forward.joints.map((j) => j.id));
    });

    it('reports the widest gap and the offset folded into the line, rather than hiding them', () => {
        const joints = aggregateJoints([
            pair('a', [0, 0, 0], [0, 0, 0], 0, 3, { contactMm: 0.02 }),
            pair('b', [0, 0, 0], [0, 0, 0], 3, 6, { contactMm: 0.05 })
        ]);
        expect(joints.joints[0]?.contactMm).toBeCloseTo(0.05, 6);
        expect(joints.joints[0]?.axisOffsetMm).toBe(0);
    });
});

describe('the joints of the pinned snapshot', () => {
    let confirmed: readonly ConfirmedInterface[];
    let report: ReturnType<typeof aggregateJoints>;

    beforeAll(async () => {
        const bytes = new Uint8Array(readFileSync(STEP_PATH));
        const index = parseStepEntities(new TextDecoder().decode(bytes));
        const tree = buildAssemblyTree(index);
        const tessellation = await tessellateStep(bytes);
        const crosswalk = buildCrosswalk(tree.occurrences, tessellation.meshes);
        const meshes = new Map<string, WorldMesh>();
        for (const entry of crosswalk.entries) {
            const mesh = tessellation.meshes[entry.meshIndex];
            if (mesh !== undefined) meshes.set(entry.occurrenceId, worldMesh(entry.occurrenceId, mesh));
        }
        confirmed = confirmInterfaces(
            extractCandidateInterfaces(extractFeatureTable(index, tree), tree).candidates,
            meshes
        ).confirmed;
        report = aggregateJoints(confirmed);
    }, 240_000);

    it('folds 1,632 face pairs into the 84 connections the graph is built from', () => {
        expect(report.facePairJoints).toBe(1632);
        expect(report.joints).toHaveLength(84);
        // Every pair of pieces grips along exactly one line in this kit, because a LEGO
        // connection is one pin or one axle: a beam held by three pins is three pairs, each with
        // its own line. An entry here would mean two release directions for one pair of pieces.
        expect(report.ambiguous).toEqual([]);
        expect(new Set(report.joints.map((joint) => joint.pieces.join('|'))).size).toBe(84);
    });

    it('keeps every face pair exactly once, so nothing is lost or counted twice', () => {
        const folded = report.joints.flatMap((joint) => joint.faces.map((face) => face.id));
        expect(folded).toHaveLength(confirmed.length);
        expect(new Set(folded).size).toBe(confirmed.length);
        expect(new Set(folded)).toEqual(new Set(confirmed.map((joint) => joint.source.id)));
    });

    it('never reports more grip than the face pairs it merged', () => {
        // Merging can only remove double counting, never invent grip. A joint wider than the
        // face pairs it came from means the bands were summed instead of laid end to end.
        const byId = new Map(confirmed.map((joint) => [joint.source.id, joint]));
        for (const joint of report.joints) {
            const summed = joint.faces.reduce((total, face) => total + (byId.get(face.id)?.engagementMm ?? 0), 0);
            expect(joint.engagementMm, joint.id).toBeLessThanOrEqual(summed + 1e-9);
            const bands = joint.bands;
            expect(bands.length, joint.id).toBeGreaterThan(0);
            for (let index = 1; index < bands.length; index += 1) {
                // Bands are disjoint and ordered, with a real gap between them.
                expect(bands[index]![0], joint.id).toBeGreaterThan(bands[index - 1]![1]! + report.bandGapMm);
            }
            expect(joint.spanMm[0], joint.id).toBe(bands[0]![0]);
            expect(joint.spanMm[1], joint.id).toBe(bands[bands.length - 1]![1]);
        }
    });

    it('grips over the kit\u2019s own dimensions once folded, and never invents a stroke', () => {
        const engagements = report.joints.map((joint) => joint.engagementMm);
        expect(Math.min(...engagements)).toBeGreaterThanOrEqual(1.8);
        expect(Math.max(...engagements)).toBeLessThanOrEqual(8.001);
        expect(Math.max(...report.joints.map((joint) => joint.contactMm))).toBeLessThan(0.06);
        expect(Math.max(...report.joints.map((joint) => joint.axisOffsetMm))).toBeLessThanOrEqual(
            report.axisToleranceMm
        );
    });

    it('leaves the Stage 1 axle gripping the beam it runs through, as one connection', () => {
        const axle = report.joints.filter((joint) => joint.pieces.includes(STAGE1_AXLE));
        expect(axle.length).toBeGreaterThan(0);
        for (const joint of axle) {
            // The axle is 22.45 mm long and a beam wall is 7.9 mm, so a folded grip above the
            // wall would mean the faces of one bore were laid end to end from different zeros.
            expect(joint.engagementMm, joint.id).toBeLessThanOrEqual(8.001);
            expect(joint.kind, joint.id).toBe('axle-bore');
            expect(joint.faces.length, joint.id).toBeGreaterThan(1);
        }
    });

    it('is the same when the snapshot\u2019s face pairs are shuffled', () => {
        // A deterministic shuffle: the graph must not depend on the order the tessellator
        // happened to emit faces in.
        let state = 0x2545f491;
        const next = (bound: number): number => {
            state = (state * 1664525 + 1013904223) >>> 0;
            return state % bound;
        };
        const shuffled = [...confirmed];
        for (let index = shuffled.length - 1; index > 0; index -= 1) {
            const swap = next(index + 1);
            const held = shuffled[index] as ConfirmedInterface;
            shuffled[index] = shuffled[swap] as ConfirmedInterface;
            shuffled[swap] = held;
        }
        const remeasured = aggregateJoints(shuffled);
        expect(remeasured.joints).toEqual(report.joints);
    });
});
