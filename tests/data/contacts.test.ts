/**
 * Ticket 3C-4 · V02 · confirming a mating interface by face contact (plan 02 §3C step 4).
 *
 * `interfaces.ts` produces 8,102 coaxial radius-matched pairs for a 70-piece helicopter, because
 * an untrimmed `CYLINDRICAL_SURFACE` cannot tell a joint from two empty bores that happen to line
 * up. This file pins the two facts that collapse that list — the two faces' material must be on
 * opposite sides of the cylinder, and their own material must actually run together along it — and
 * the engagement that a release stroke has to overcome.
 *
 * Every synthetic case below is a counterexample to one permissive reading of the rule. The two
 * snapshot cases assert the measured collapse and the kit's own dimensions, because a joint count
 * that moves means the dataset revision moved.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseStepEntities, type StepIndex } from '../../tools/lib/step-file.js';
import { buildAssemblyTree, type AssemblyTree, type Vec3 } from '../../tools/lib/step-tree.js';
import { extractFeatureTable, type FeatureTable } from '../../tools/lib/features.js';
import { extractCandidateInterfaces, pairInterfaces, type MatingInterface, type WorldFace } from '../../tools/lib/interfaces.js';
import { tessellateStep, type Tessellation } from '../../tools/lib/step-meshes.js';
import { buildCrosswalk } from '../../tools/lib/crosswalk.js';
import {
    confirmInterfaces,
    faceTriangles,
    materialSide,
    worldMesh,
    type ConfirmationReport,
    type WorldMesh
} from '../../tools/lib/contacts.js';

const STEP_PATH = 'assets/lego-helicopter-30465-1.snapshot.9/STEP File Assembly - Lego Helicopter - 30465.STEP';
const STAGE1_AXLE = '30465/NAUO1/NAUO79';
/** The measured mesh deflection, and therefore the finest grip this dataset can evidence. */
const DEFLECTION_MM = 0.12;

const Z: Vec3 = [0, 0, 1];

/**
 * A cylindrical surface along Z between two heights, as an indexed mesh.
 *
 * `shaft` winds its triangles so their normals point away from the axis, which is what material
 * on the inside of the cylinder means; `void` reverses the winding, which is what a bore means.
 * Vertices sit exactly on the radius, so face membership is decided by geometry and not tolerance.
 */
function cylinder(
    occurrenceId: string,
    radiusMm: number,
    startMm: number,
    endMm: number,
    side: 'shaft' | 'void',
    segments = 64
): WorldMesh {
    const positions: number[] = [];
    const indices: number[] = [];
    for (const z of [startMm, endMm]) {
        for (let step = 0; step < segments; step += 1) {
            const angle = (step / segments) * Math.PI * 2;
            positions.push(radiusMm * Math.cos(angle), radiusMm * Math.sin(angle), z);
        }
    }
    for (let step = 0; step < segments; step += 1) {
        const next = (step + 1) % segments;
        const near = step;
        const nearNext = next;
        const far = segments + step;
        const farNext = segments + next;
        const first = side === 'shaft' ? [near, nearNext, far] : [near, far, nearNext];
        const second = side === 'shaft' ? [nearNext, farNext, far] : [nearNext, far, farNext];
        indices.push(...first, ...second);
    }
    return { occurrenceId, positions, indices };
}

function face(
    occurrenceId: string,
    name: string,
    sourceEntityId: string,
    radiusMm: number,
    origin: Vec3 = [0, 0, 0],
    axis: Vec3 = Z
): WorldFace {
    return { occurrenceId, occurrenceName: name, definitionId: `pd:${occurrenceId}`, sourceEntityId, radiusMm, origin, axis };
}

const shaft = (): WorldMesh => cylinder('shaft-1', 2.35, 0, 22.45, 'shaft');
const bore = (startMm = 0, endMm = 7.85): WorldMesh => cylinder('bore-1', 2.4, startMm, endMm, 'void');

const shaftFace = (radiusMm = 2.35): WorldFace => face('shaft-1', 'Axle 3', '#10', radiusMm);
const boreFace = (radiusMm = 2.4, occurrenceId = 'bore-1'): WorldFace =>
    face(occurrenceId, 'Beam 3', '#20', radiusMm);

function join(male: WorldFace, female: WorldFace, fitToleranceMm = 0.1): readonly MatingInterface[] {
    return pairInterfaces([male, female], { fitToleranceMm });
}

function meshesOf(...meshes: readonly WorldMesh[]): Map<string, WorldMesh> {
    return new Map(meshes.map((mesh) => [mesh.occurrenceId, mesh]));
}

const digest = (triangles: readonly number[]): string => {
    const trianglesByCorner: string[] = [];
    for (let index = 0; index + 8 < triangles.length; index += 9) {
        trianglesByCorner.push(triangles.slice(index, index + 9).map((value) => value.toFixed(6)).join(','));
    }
    return trianglesByCorner.sort().join(';');
};

describe('reading a face out of a piece', () => {
    it('takes only the triangles whose vertices all lie on the cylinder', () => {
        const mesh = cylinder('beam-1', 2.4, 0, 8, 'void');
        const onFace = faceTriangles(mesh, boreFace(), 0.05);
        expect(onFace.length / 9).toBe(128);

        // A flat shoulder at a different radius is a different face and must not be swept in.
        const withShoulder: WorldMesh = {
            occurrenceId: 'beam-1',
            positions: [...mesh.positions, 4, 0, 8, 0, 4, 8, -4, 0, 8],
            indices: [...mesh.indices, 128, 129, 130]
        };
        expect(faceTriangles(withShoulder, boreFace(), 0.05).length).toBe(onFace.length);
    });

    it('finds the same triangles after the vertices are renumbered', () => {
        // Which triangles belong to a face is a question about topology. Reading the position
        // buffer three vertices at a time instead groups arbitrary neighbours into shapes that
        // are not triangles of the piece, and the answer then depends on how the tessellator
        // happened to order its vertices.
        const forward = cylinder('shaft-1', 2.35, 0, 22.45, 'shaft', 24);
        const positions: number[] = [];
        const indices: number[] = [];
        const order: number[] = [];
        for (let vertex = forward.indices.length / 3 - 1; vertex >= 0; vertex -= 1) order.push(vertex);
        const rank = new Map(order.map((vertex, position) => [vertex, position]));
        for (const vertex of order) {
            positions.push(
                forward.positions[vertex * 3] as number,
                forward.positions[vertex * 3 + 1] as number,
                forward.positions[vertex * 3 + 2] as number
            );
        }
        for (const vertex of forward.indices) indices.push(rank.get(vertex) as number);
        const renumbered: WorldMesh = { occurrenceId: 'shaft-1', positions, indices };

        expect(digest(faceTriangles(renumbered, shaftFace(), 0.05))).toBe(
            digest(faceTriangles(forward, shaftFace(), 0.05))
        );
    });

    it('calls a surface whose material is inside the cylinder a shaft, and a bore a void', () => {
        const shaftMesh = cylinder('shaft-1', 2.35, 0, 8, 'shaft');
        const boreMesh = cylinder('bore-1', 2.4, 0, 8, 'void');
        expect(materialSide(faceTriangles(shaftMesh, shaftFace(), 0.05), shaftFace())).toBe('shaft');
        expect(materialSide(faceTriangles(boreMesh, boreFace(), 0.05), boreFace())).toBe('void');
    });

    it('reports a face whose side cannot be read as unknown rather than picking one', () => {
        // Two copies of one triangle wound opposite ways: the radial normals cancel, so the mean
        // says nothing. Guessing here would silently invent or delete a joint.
        const positions = [2.35, 0, 0, 2.35 * Math.cos(0.1), 2.35 * Math.sin(0.1), 0, 2.35, 0, 4];
        const mesh: WorldMesh = { occurrenceId: 'odd-1', positions, indices: [0, 1, 2, 2, 1, 0] };
        const odd = face('odd-1', 'Unknown', '#30', 2.35);
        expect(materialSide(faceTriangles(mesh, odd, 0.05), odd)).toBe('unknown');
    });
});

describe('confirming a joint from contact', () => {
    it('confirms a shaft seated in a bore and reports the grip, not the shaft', () => {
        const found = join(shaftFace(), boreFace());
        expect(found).toHaveLength(1);
        const report = confirmInterfaces(found, meshesOf(shaft(), bore()));
        expect(report.confirmed).toHaveLength(1);
        const joint = report.confirmed[0];
        expect(joint?.maleSide).toBe('shaft');
        expect(joint?.femaleSide).toBe('void');
        expect(joint?.contactMm).toBeLessThanOrEqual(report.toleranceMm);
    });

    it('measures the engagement where the material runs together, not the length of the axle', () => {
        // The counterexample for reading an untrimmed surface: a 22.45 mm axle through a 7.85 mm
        // hole engages 7.85 mm. Reporting 22.45 would tell a mechanic to withdraw the axle by
        // three times the distance the kit actually needs.
        const report = confirmInterfaces(join(shaftFace(), boreFace()), meshesOf(shaft(), bore()));
        const joint = report.confirmed[0];
        expect(joint?.engagementMm).toBeCloseTo(7.85, 6);
        expect(joint?.engagementMm).toBeLessThan(10);
        expect(joint?.contactSpanMm?.[0]).toBeCloseTo(0, 6);
        expect(joint?.contactSpanMm?.[1]).toBeCloseTo(7.85, 6);
        expect(joint?.grippedTriangles).toBeGreaterThan(0);
    });

    it('does not call two bores on one line a joint', () => {
        // 3,402 of this snapshot's 8,102 candidates are this pair. Their surfaces meet at the same
        // radius, and there is nothing to take apart.
        const near = cylinder('beam-a', 2.4, 0, 8, 'void');
        const far = cylinder('beam-b', 2.4, 0, 8, 'void');
        const report = confirmInterfaces(
            join(face('beam-a', 'Beam 3', '#20', 2.4), face('beam-b', 'Beam 5', '#21', 2.4)),
            meshesOf(near, far)
        );
        expect(report.confirmed).toHaveLength(0);
        expect(report.rejected[0]?.reason).toBe('same-side');
    });

    it('does not call two shafts end to end on one line a joint', () => {
        const first = cylinder('pin-a', 2.35, 0, 8, 'shaft');
        const second = cylinder('pin-b', 2.35, 0, 8, 'shaft');
        const report = confirmInterfaces(
            join(face('pin-a', 'Pin 3L', '#30', 2.35), face('pin-b', 'Pin 3L', '#31', 2.35)),
            meshesOf(first, second)
        );
        expect(report.confirmed).toHaveLength(0);
        expect(report.rejected[0]?.reason).toBe('same-side');
    });

    it('records a shaft that misses the bore with the distance that missed it', () => {
        const report = confirmInterfaces(join(shaftFace(), boreFace()), meshesOf(cylinder('shaft-1', 2.35, 10, 22.45, 'shaft'), bore()));
        expect(report.confirmed).toHaveLength(0);
        expect(report.rejected[0]?.reason).toBe('apart');
        expect(report.rejected[0]?.contactMm).toBeLessThan(0);
    });

    it('rejects a loose fit by the measured gap rather than by the rule that paired it', () => {
        const report = confirmInterfaces(
            join(shaftFace(), boreFace(2.55), 0.25),
            meshesOf(shaft(), cylinder('bore-1', 2.55, 0, 7.85, 'void'))
        );
        expect(report.confirmed).toHaveLength(0);
        expect(report.rejected[0]?.reason).toBe('apart');
        expect(report.rejected[0]?.contactMm).toBeCloseTo(0.2, 2);
    });

    it('drops a grip finer than the mesh can resolve, and says so', () => {
        // Both faces are well-formed here; only their overlap is finer than 0.12 mm.
        const report = confirmInterfaces(
            join(shaftFace(), boreFace()),
            meshesOf(cylinder('shaft-1', 2.35, 7.8, 22.45, 'shaft'), bore())
        );
        expect(report.confirmed).toHaveLength(0);
        expect(report.rejected[0]?.reason).toBe('below-resolution');
    });

    it('keeps every verdict inside the tolerance it was measured against', () => {
        const report: ConfirmationReport = confirmInterfaces(
            join(shaftFace(), boreFace()),
            meshesOf(shaft(), bore())
        );
        for (const joint of report.confirmed) {
            expect(joint.contactMm).toBeLessThanOrEqual(report.toleranceMm);
            expect(joint.engagementMm).toBeGreaterThanOrEqual(report.engagementFloorMm);
            expect(joint.grippedTriangles).toBeGreaterThan(0);
        }
        expect(report.confirmed.length + report.rejected.length).toBe(report.candidates);
    });
});

describe('the joints of the pinned snapshot', () => {
    let index: StepIndex;
    let tree: AssemblyTree;
    let table: FeatureTable;
    let tessellation: Tessellation;
    let report: ConfirmationReport;
    let piecePairs: number;

    beforeAll(async () => {
        const bytes = new Uint8Array(readFileSync(STEP_PATH));
        index = parseStepEntities(new TextDecoder().decode(bytes));
        tree = buildAssemblyTree(index);
        table = extractFeatureTable(index, tree);
        tessellation = await tessellateStep(bytes);
        const crosswalk = buildCrosswalk(tree.occurrences, tessellation.meshes);
        const meshes = new Map<string, WorldMesh>();
        for (const entry of crosswalk.entries) {
            const mesh = tessellation.meshes[entry.meshIndex];
            if (mesh !== undefined) meshes.set(entry.occurrenceId, worldMesh(entry.occurrenceId, mesh));
        }
        report = confirmInterfaces(extractCandidateInterfaces(table, tree).candidates, meshes);
        piecePairs = new Set(
            report.confirmed.map((joint) => [joint.source.male.occurrenceId, joint.source.female.occurrenceId].sort().join('|'))
        ).size;
    }, 180_000);

    it('collapses 8,102 candidates to the joints a 70-piece helicopter could have', () => {
        const reasons = new Map<string, number>();
        for (const rejected of report.rejected) {
            reasons.set(rejected.reason, (reasons.get(rejected.reason) ?? 0) + 1);
        }
        expect(report.candidates).toBe(8102);
        expect(report.confirmed).toHaveLength(1632);
        expect(reasons.get('same-side')).toBe(6335);
        expect(reasons.get('apart')).toBe(82);
        expect(reasons.get('side-unknown')).toBe(53);
        // Nothing is below resolution once both faces are read in one frame. The 8 joints that
        // used to land here were mis-measured overlaps, and 85 more were mis-measured as apart.
        expect(reasons.get('below-resolution')).toBeUndefined();
        // The number the graph is built from: one joint per pair of pieces that really grip.
        expect(piecePairs).toBe(84);
    });

    it('grips over the kit’s own dimensions, not over an untrimmed surface', () => {
        const engagements = report.confirmed.map((joint) => joint.engagementMm);
        // The grips land on discrete kit heights, not on a continuum: 1.80 mm is the friction
        // section of a Friction Pin with Stud (30465), 3.00 mm is one bush, 8.00 mm is the width
        // a bevel gear or beam holds an axle over. Anything outside 1.80..8.00 means the
        // measurement has fallen back to reading the infinite untrimmed surface.
        // The bound carries 1 um because a grip is a measured float: the widest evaluates at
        // 8.000000000000004, which is the arithmetic, not a piece 8 micrometres wider.
        expect(Math.min(...engagements)).toBeGreaterThanOrEqual(1.8);
        expect(Math.max(...engagements)).toBeLessThanOrEqual(8.001);
        expect(Math.min(...engagements)).toBeCloseTo(1.8, 6);
        expect(Math.max(...engagements)).toBeCloseTo(8, 6);
        // The radial gap never exceeds LEGO's 0.05 mm line-to-line fit by more than the deflection.
        expect(Math.max(...report.confirmed.map((joint) => joint.contactMm))).toBeLessThan(0.06);
    });

    it('confirms the Stage 1 axle against the bores it runs through', () => {
        const axle = report.confirmed.filter(
            (joint) => joint.source.male.occurrenceId === STAGE1_AXLE || joint.source.female.occurrenceId === STAGE1_AXLE
        );
        expect(axle.length).toBeGreaterThan(0);
        for (const joint of axle) {
            expect(joint.source.male.radiusMm, joint.source.id).toBeCloseTo(2.35, 6);
            expect(joint.source.female.radiusMm, joint.source.id).toBeCloseTo(2.4, 6);
            expect(joint.maleSide, joint.source.id).toBe('shaft');
            expect(joint.femaleSide, joint.source.id).toBe('void');
            expect(joint.engagementMm, joint.source.id).toBeGreaterThan(0);
        }
    });

    it('gives every occurrence at least one joint, the light stud included', () => {
        // RV-003a. The light stud used to be the only piece with no joint: its single candidate
        // was measured in two frames at once, came out below the 0.12 mm deflection, and was
        // discarded. Read in one frame it grips its own friction pin over 1.80 mm at a 0.0216 mm
        // gap, which is what a friction fit is. No occurrence is left unexplained.
        const joined = new Set<string>();
        for (const joint of report.confirmed) {
            joined.add(joint.source.male.occurrenceId);
            joined.add(joint.source.female.occurrenceId);
        }
        const orphans = tree.occurrences.filter((occurrence) => !joined.has(occurrence.id));
        expect(orphans.map((occurrence) => occurrence.id)).toEqual([]);

        const stud = report.confirmed.filter(
            (joint) => joint.source.male.occurrenceId === '30465/NAUO33/NAUO39' ||
                joint.source.female.occurrenceId === '30465/NAUO33/NAUO39'
        );
        expect(stud.length).toBeGreaterThan(0);
        for (const joint of stud) {
            expect(joint.engagementMm).toBeCloseTo(1.8, 6);
            expect(joint.contactMm).toBeLessThan(0.05);
        }
    });

    it('is decided by geometry alone, so the same candidates confirm the same way twice', () => {
        const bytes = new Uint8Array(readFileSync(STEP_PATH));
        const remeasured = confirmInterfaces(
            extractCandidateInterfaces(extractFeatureTable(index, tree), tree).candidates,
            new Map(
                buildCrosswalk(tree.occurrences, tessellation.meshes).entries.map((entry) => [
                    entry.occurrenceId,
                    worldMesh(entry.occurrenceId, tessellation.meshes[entry.meshIndex]!)
                ])
            )
        );
        expect(remeasured.confirmed.map((joint) => joint.source.id)).toEqual(
            report.confirmed.map((joint) => joint.source.id)
        );
        expect(remeasured.confirmed.map((joint) => joint.engagementMm)).toEqual(
            report.confirmed.map((joint) => joint.engagementMm)
        );
    });
});

/**
 * A STEP `CYLINDRICAL_SURFACE` stores an axis location of its own, so two faces of two pieces
 * that are genuinely coaxial almost never measure from the same point along the line, and this
 * snapshot has 978 joints whose two faces point opposite ways along it. `MatingInterface.axis`
 * and `.origin` are the *male's* own, so the interface frame is the male's frame, and the
 * female extent has to be carried into it before anything is intersected.
 *
 * Measured on the snapshot before this was fixed: 1,175 of 1,539 confirmed joints reported an
 * engagement that differed from the true overlap by more than 0.05 mm (worst 1.74 mm), and
 * 1,535 of them had their two origins more than 0.05 mm apart along the line.
 */
describe('measuring a grip when the two faces disagree about the line', () => {
    /** A short axle: its own face spans 0..8 mm along +Z from its own origin. */
    const shortShaft = (): WorldMesh => cylinder('shaft-1', 2.35, 0, 8, 'shaft');
    /** A beam wall that sits at 0..7.85 mm, so the true overlap with the axle is 7.85 mm. */
    const wallAtZero = (): WorldMesh => cylinder('bore-1', 2.4, 0, 7.85, 'void');

    it('confirms a joint whose faces measure the line from different points along it', () => {
        // The beam's cylinder records its axis 20 mm further along the line, so its own extent
        // reads -20..-12.15. Intersected with the axle's 0..8 as printed, the two look disjoint
        // and the joint is rejected as apart -- a real joint missing from the graph.
        const female = face('bore-1', 'Beam 3', '#20', 2.4, [0, 0, 20], Z);
        const found = join(shaftFace(), female);
        expect(found).toHaveLength(1);
        const report = confirmInterfaces(found, meshesOf(shortShaft(), wallAtZero()));
        expect(report.rejected.map((entry) => entry.reason)).toEqual([]);
        expect(report.confirmed).toHaveLength(1);
        expect(report.confirmed[0]?.engagementMm).toBeCloseTo(7.85, 2);
    });

    it('measures the grip where the material runs together, not where the numbers happen to overlap', () => {
        // Same geometry, axis recorded 5 mm short: the two spans overlap by 3 mm on paper and by
        // 7.85 mm in the assembly, and a release stroke planned from the first number stops short.
        const female = face('bore-1', 'Beam 3', '#20', 2.4, [0, 0, -5], Z);
        const report = confirmInterfaces(join(shaftFace(), female), meshesOf(shortShaft(), wallAtZero()));
        expect(report.confirmed[0]?.engagementMm).toBeCloseTo(7.85, 2);
    });

    it('carries a face that points the other way along the line into the interface frame', () => {
        // A cylinder wound the opposite way is the same line. Its extent reads 4.15..12, which
        // intersects 0..8 in 3.85 mm; the grip is still the whole wall.
        const female = face('bore-1', 'Beam 3', '#20', 2.4, [0, 0, 12], [0, 0, -1]);
        const report = confirmInterfaces(join(shaftFace(), female), meshesOf(shortShaft(), wallAtZero()));
        expect(report.confirmed[0]?.engagementMm).toBeCloseTo(7.85, 2);
    });

    it('still rejects two faces that are genuinely apart, however their origins are recorded', () => {
        // The counterexample to "just shift everything": moving the origin must not turn a gap
        // into a joint. The wall sits at 12..19.85 mm and the axle ends at 8 mm.
        for (const origin of [[0, 0, 0], [0, 0, 20], [0, 0, -30]] as const) {
            const female = face('bore-1', 'Beam 3', '#20', 2.4, [...origin] as Vec3, Z);
            const apart = cylinder('bore-1', 2.4, 12, 19.85, 'void');
            const report = confirmInterfaces(join(shaftFace(), female), meshesOf(shortShaft(), apart));
            expect(report.confirmed).toEqual([]);
            expect(report.rejected[0]?.reason).toBe('apart');
        }
    });
});
