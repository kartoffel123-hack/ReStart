/**
 * Ticket 3C-4 · V02 · classified mating interfaces (implementation plan §3C step 4).
 *
 * Which pieces are fitted together, and along what line, decides every generated move: the
 * release direction, which contact may persist during a stroke, and which neighbour has to come
 * off first. Getting this wrong in the permissive direction invents clearance that a real kit
 * does not have, and the mechanic's hands find out. So the pairing kernel is tested against
 * hand-built faces that each break one rule, and the real snapshot is tested against its
 * witnesses.
 *
 * The snapshot numbers are asserted, not printed: a change here means the dataset revision
 * moved, and everything generated downstream is stale.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseStepEntities, type StepIndex } from '../../tools/lib/step-file.js';
import { buildAssemblyTree, type AssemblyTree, type Vec3 } from '../../tools/lib/step-tree.js';
import { extractFeatureTable, type FeatureTable } from '../../tools/lib/features.js';
import {
    candidateKind,
    extractCandidateInterfaces,
    pairInterfaces,
    worldFaces,
    type MatingInterface,
    type WorldFace
} from '../../tools/lib/interfaces.js';

const STEP_PATH = 'assets/lego-helicopter-30465-1.snapshot.9/STEP File Assembly - Lego Helicopter - 30465.STEP';
const STAGE1_AXLE = '30465/NAUO1/NAUO79';
/** LEGO's line-to-line fit: an axle of 2.35 mm in a hole of 2.4 mm. */
const AXLE_RADIUS = 2.35;
const BORE_RADIUS = 2.4;

const X: Vec3 = [1, 0, 0];
const Y: Vec3 = [0, 1, 0];

function face(
    occurrenceId: string,
    name: string,
    sourceEntityId: string,
    radiusMm: number,
    origin: Vec3,
    axis: Vec3
): WorldFace {
    return {
        occurrenceId,
        occurrenceName: name,
        definitionId: `pd:${occurrenceId}`,
        sourceEntityId,
        radiusMm,
        origin,
        axis
    };
}

const axle = (origin: Vec3 = [0, 0, 0], axis: Vec3 = X): WorldFace =>
    face('axle-1', 'Axle 3', '#10', AXLE_RADIUS, origin, axis);
const bore = (origin: Vec3 = [0, 0, 0], axis: Vec3 = X): WorldFace =>
    face('beam-1', 'Beam 3', '#20', BORE_RADIUS, origin, axis);

const of = (found: readonly MatingInterface[]): MatingInterface => {
    const first = found[0];
    if (first === undefined) throw new Error('expected an interface');
    return first;
};

describe('pairing cylindrical faces', () => {
    it('joins an axle to the bore it runs through and offers both travel directions', () => {
        const found = pairInterfaces([axle(), bore()]);
        expect(found).toHaveLength(1);
        const join = of(found);
        expect(join.kind).toBe('axle-bore');
        expect(join.male.radiusMm).toBeCloseTo(AXLE_RADIUS, 9);
        expect(join.female.radiusMm).toBeCloseTo(BORE_RADIUS, 9);
        expect(join.radialGapMm).toBeCloseTo(0.05, 9);
        expect(join.axisOffsetMm).toBeLessThanOrEqual(0.05);
        // A cylinder has no inherent sense: neither end may be chosen silently.
        expect(join.releaseDirections).toEqual([X, [-1, 0, 0]]);
    });

    it('does not connect two holes drilled in the same piece', () => {
        // A beam's near and far hole faces are one piece's own geometry. Reading them as a
        // joint would invent a blocker that can never be removed.
        const near = face('beam-1', 'Beam 3', '#20', BORE_RADIUS, [0, 0, 0], X);
        const far = face('beam-1', 'Beam 3', '#21', BORE_RADIUS, [8, 0, 0], X);
        expect(pairInterfaces([near, far])).toHaveLength(0);
    });

    it('does not call parallel cylinders coaxial when their axes are a millimetre apart', () => {
        // The counterexample for a rule that only checks direction: these are perfectly parallel
        // and perfectly fitted in radius, and nothing about them is the same line.
        expect(pairInterfaces([axle(), bore([0, 1, 0])])).toHaveLength(0);
        expect(pairInterfaces([axle(), bore([0, 0.04, 0])])).toHaveLength(1);
    });

    it('does not call a loose cylinder a fit', () => {
        const loose = face('beam-1', 'Beam 3', '#20', 2.85, [0, 0, 0], X);
        expect(pairInterfaces([axle(), loose])).toHaveLength(0);
    });

    it('does not call perpendicular cylinders a fit', () => {
        expect(pairInterfaces([axle(), bore([0, 0, 0], Y)])).toHaveLength(0);
    });

    it('reads a bore end-to-end as the same interface as the axle through it', () => {
        // A hole's surface direction depends on which way its boundary was traversed, so the
        // same physical joint arrives with either sign. It must still be one interface.
        const reversed = bore([0, 0, 0], [-1, 0, 0]);
        const found = pairInterfaces([axle(), reversed]);
        expect(found).toHaveLength(1);
        expect(of(found).axis).toEqual(X);
        expect(of(found).releaseDirections).toEqual([X, [-1, 0, 0]]);
    });

    it('names the same joint the same thing whichever order the faces arrive in', () => {
        const forwards = pairInterfaces([axle(), bore()]);
        const backwards = pairInterfaces([bore(), axle()]);
        expect(backwards).toEqual(forwards);
    });

    it('names a class only when the male piece says what it is', () => {
        expect(candidateKind('Pin 3L', 'Beam 5')).toBe('pin-hole');
        expect(candidateKind('Axle 5', 'Beam 5')).toBe('axle-bore');
        expect(candidateKind('Bush', 'Beam 5')).toBe('friction');
        // An unrecognised name is `other`, which is a review item, not a guess dressed up as data.
        expect(candidateKind('Brick 2 x 4', 'Plate 2 x 2')).toBe('other');
    });
});

describe('the mating interfaces of the pinned snapshot', () => {
    let index: StepIndex;
    let tree: AssemblyTree;
    let table: FeatureTable;
    let report: ReturnType<typeof extractCandidateInterfaces>;

    beforeAll(() => {
        index = parseStepEntities(readFileSync(STEP_PATH, 'utf8'));
        tree = buildAssemblyTree(index);
        table = extractFeatureTable(index, tree);
        report = extractCandidateInterfaces(table, tree);
    });

    it('places every cylindrical face of all 70 occurrences', () => {
        // 1,295 cylinders across the 31 definitions, and a definition is used more than once:
        // the same 70 pieces carry 2,312 cylindrical faces in the assembly.
        expect(worldFaces(table, tree)).toHaveLength(2312);
        expect(report.facesConsidered).toBe(2312);
        expect(report.sourceRevision).toBe(tree.sourceRevision);
    });

    it('finds the Stage 1 axle fitted into the beams it passes through', () => {
        const axleJoins = report.candidates.filter(
            (entry) => entry.male.occurrenceId === STAGE1_AXLE || entry.female.occurrenceId === STAGE1_AXLE
        );
        expect(axleJoins.length).toBeGreaterThan(0);
        // The witness: all five of the axle's cylinders are 2.35 mm, so it is always the male.
        for (const join of axleJoins) {
            expect(join.male.occurrenceId).toBe(STAGE1_AXLE);
            expect(join.male.radiusMm).toBeCloseTo(AXLE_RADIUS, 9);
            expect(join.radialGapMm).toBeLessThanOrEqual(0.1);
        }
        const faces = new Set(axleJoins.map((join) => join.male.sourceEntityId));
        expect(faces.size).toBeGreaterThan(0);
    });

    it('emits only joins that really are coaxial, fitted, and between two pieces', () => {
        for (const join of report.candidates) {
            expect(join.a.occurrenceId).not.toBe(join.b.occurrenceId);
            expect(join.radialGapMm).toBeLessThanOrEqual(report.fitToleranceMm);
            expect(join.axisOffsetMm).toBeLessThanOrEqual(report.axisToleranceMm);
            expect(join.axis).toEqual(join.male.axis);
            expect(join.id).toBe(
                `mi:${join.a.occurrenceId}:${join.a.sourceEntityId}:${join.b.occurrenceId}:${join.b.sourceEntityId}`
            );
        }
    });

    it('reports each interface once, so a rebuild cannot double-count a joint', () => {
        const ids = report.candidates.map((entry) => entry.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('holds the measured candidate baseline, and admits a candidate is not a joint', () => {
        // 8,102 coaxial radius-matched pairs across 70 pieces is more joints than the
        // helicopter has, because two empty bores on one line satisfy the rule too. This number
        // is pinned so a revision change is loud, and so nobody mistakes it for the graph: the
        // confirmation step has to collapse it to the pairs whose faces actually touch.
        expect(report.candidates.length).toBe(8102);
        expect(report.kindCounts['axle-bore'] ?? 0).toBeGreaterThan(0);
    });
});
