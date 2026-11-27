/**
 * Ticket 3C-1 · V01/V02 · candidate interface features from the STEP snapshot
 * (implementation plan §3C step 1).
 *
 * Moves are generated from geometry, so the geometry has to arrive with its provenance:
 * every feature names the STEP entity it came from, and the counts here are the measured
 * baseline for this source revision. A feature table that silently lost or double-counted a
 * surface would let the generator propose a move nothing in the CAD supports, and the review
 * would have nothing to trace back to.
 *
 * These are the real supplied numbers, read from the pinned snapshot (SHA-256
 * e15deb431d0ece9baf411cec7612f00d1a49e3e536ea183893b6792f6dfc7588): 31 leaf definitions,
 * 1295 cylindrical surfaces, 1034 planes, 69 toroids, 13 cones, 10 bounded and 30 B-spline
 * surfaces. They are asserted, not printed, so a source revision change fails here instead of
 * quietly shifting every generated move.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseStepEntities, entityOf, type StepIndex } from '../../tools/lib/step-file.js';
import { buildAssemblyTree, worldVertices, type AssemblyTree } from '../../tools/lib/step-tree.js';
import {
    extractFeatureTable,
    featureInWorld,
    type FeatureTable
} from '../../tools/lib/features.js';

const STEP_PATH = 'assets/lego-helicopter-30465-1.snapshot.9/STEP File Assembly - Lego Helicopter - 30465.STEP';
const STAGE1_AXLE = '30465/NAUO1/NAUO79';

const isUnit = (v: readonly number[]): boolean =>
    Math.abs(Math.hypot(v[0] as number, v[1] as number, v[2] as number) - 1) < 1e-9;

let index: StepIndex;
let tree: AssemblyTree;
let table: FeatureTable;

beforeAll(() => {
    index = parseStepEntities(readFileSync(STEP_PATH, 'utf8'));
    tree = buildAssemblyTree(index);
    table = extractFeatureTable(index, tree);
});

function stage1Features(): FeatureTable['definitions'][number] {
    const occurrence = tree.occurrences.find((entry) => entry.id === STAGE1_AXLE);
    if (occurrence === undefined) throw new Error(`${STAGE1_AXLE} missing`);
    const definition = table.definitions.find((entry) => entry.definitionId === occurrence.definitionId);
    if (definition === undefined) throw new Error('the Stage 1 axle definition has no features');
    return definition;
}

describe('the candidate feature table for the pinned snapshot', () => {
    it('covers every leaf definition and carries the source revision', () => {
        expect(table.definitions).toHaveLength(tree.leafDefinitionCount);
        expect(table.definitions).toHaveLength(31);
        expect(table.sourceRevision).toBe(tree.sourceRevision);
        expect(table.diagnostics).toEqual([]);
    });

    it('reaches every cylindrical surface in the file exactly once', () => {
        const ids = table.definitions.flatMap((entry) => entry.cylinders.map((c) => c.sourceEntityId));
        expect(ids).toHaveLength(1295);
        expect(new Set(ids).size, 'a surface belongs to one definition').toBe(1295);
        for (const id of ids) {
            expect(entityOf(index, Number(id.slice(1)))?.type).toBe('CYLINDRICAL_SURFACE');
        }
    });

    it('accounts for every surface of every definition, not only the cylinders', () => {
        const total = (kind: string): number =>
            table.definitions.reduce((sum, entry) => sum + (entry.surfaceCounts[kind as never] ?? 0), 0);
        expect(total('cylinder')).toBe(1295);
        expect(total('plane')).toBe(1034);
        expect(total('toroid')).toBe(69);
        expect(total('cone')).toBe(13);
        expect(total('bounded')).toBe(10);
        expect(total('bspline')).toBe(30);
        expect(table.definitions.reduce((sum, entry) => sum + entry.surfaceCount, 0)).toBe(2451);
    });

    it('measures every cylinder and never invents a direction', () => {
        for (const definition of table.definitions) {
            for (const cylinder of definition.cylinders) {
                expect(cylinder.radiusMm, `${definition.definitionId} ${cylinder.sourceEntityId}`).toBeGreaterThan(0);
                expect(Number.isFinite(cylinder.radiusMm)).toBe(true);
                expect(isUnit(cylinder.axis), cylinder.sourceEntityId).toBe(true);
            }
            expect(definition.travelAxes.length).toBeGreaterThan(0);
            for (const axis of definition.travelAxes) expect(isUnit(axis.axis)).toBe(true);
        }
    });

    it('proposes both travel directions for a candidate axis', () => {
        const axle = stage1Features();
        expect(axle).toBeDefined();
        // A cylinder axis has no inherent sense: a part can leave along either end, so the
        // table offers the pair rather than picking one silently.
        for (const axis of axle?.travelAxes ?? []) {
            expect(axis.opposite).toEqual([-axis.axis[0], -axis.axis[1], -axis.axis[2]]);
        }
    });

    it('is deterministic, so a batch run cannot depend on entity order', () => {
        const again = extractFeatureTable(index, tree);
        expect(again).toEqual(table);
    });
});

describe('features transform into assembly coordinates', () => {
    function stage1Axle() {
        const occurrence = tree.occurrences.find((entry) => entry.id === STAGE1_AXLE);
        if (occurrence === undefined) throw new Error(`${STAGE1_AXLE} missing`);
        const definition = table.definitions.find((entry) => entry.definitionId === occurrence.definitionId);
        if (definition === undefined) throw new Error('the Stage 1 axle definition has no features');
        return { occurrence, definition };
    }

    it('transforms a feature rigidly, preserving its distance to the part centre', () => {
        const { occurrence, definition } = stage1Axle();
        // A STEP surface is infinite and its faces are trimmed, so the axis point of a
        // cylinder may legitimately fall outside the material: "is it inside the bounds" is
        // not a property a correct transform has to satisfy. What a rigid transform must
        // preserve is the perpendicular distance from the axis line to the part's own centre.
        // A millimetre/metre swap, a missing rotation or the parent frame instead of the
        // world frame all break this, and none of them show up in a unit-length check.
        const distanceToLine = (point: readonly number[], origin: readonly number[], axis: readonly number[]): number => {
            const dx = point[0]! - origin[0]!;
            const dy = point[1]! - origin[1]!;
            const dz = point[2]! - origin[2]!;
            const cx = dy * axis[2]! - dz * axis[1]!;
            const cy = dz * axis[0]! - dx * axis[2]!;
            const cz = dx * axis[1]! - dy * axis[0]!;
            return Math.hypot(cx, cy, cz);
        };
        for (const cylinder of definition.cylinders) {
            const world = featureInWorld(cylinder, occurrence.worldPlacement);
            expect(isUnit(world.axis), cylinder.sourceEntityId).toBe(true);
            const local = distanceToLine(occurrence.localBounds.centre, cylinder.originMm, cylinder.axis);
            const inWorld = distanceToLine(occurrence.boundsCentre, world.origin, world.axis);
            expect(inWorld, cylinder.sourceEntityId).toBeCloseTo(local, 6);
        }
    });

    it('would notice a millimetre-to-metre placement, which is the bug this witness is for', () => {
        const { occurrence, definition } = stage1Axle();
        const cylinder = (definition.cylinders as readonly (typeof definition.cylinders)[number][])[0];
        if (cylinder === undefined) throw new Error('the axle has no cylindrical face');
        const scaled = {
            ...occurrence.worldPlacement,
            translation: occurrence.worldPlacement.translation.map((value) => value / 1000) as [
                number,
                number,
                number
            ]
        };
        const distanceToLine = (point: readonly number[], origin: readonly number[], axis: readonly number[]): number => {
            const dx = point[0]! - origin[0]!;
            const dy = point[1]! - origin[1]!;
            const dz = point[2]! - origin[2]!;
            return Math.hypot(
                dy * axis[2]! - dz * axis[1]!,
                dz * axis[0]! - dx * axis[2]!,
                dx * axis[1]! - dy * axis[0]!
            );
        };
        const wrong = featureInWorld(cylinder, scaled);
        const local = distanceToLine(occurrence.localBounds.centre, cylinder.originMm, cylinder.axis);
        expect(distanceToLine(occurrence.boundsCentre, wrong.origin, wrong.axis)).not.toBeCloseTo(local, 6);
    });

    it('keeps the radius a length, not a transformed quantity', () => {
        const { occurrence, definition } = stage1Axle();
        for (const cylinder of definition.cylinders) {
            expect(featureInWorld(cylinder, occurrence.worldPlacement).radiusMm).toBe(cylinder.radiusMm);
        }
    });

    it('names the definition behind the Stage 1 axle witness', () => {
        const { occurrence } = stage1Axle();
        expect(occurrence.name).toBe('Axle - 30465_3 - Long');
        expect(worldVertices(occurrence).length).toBeGreaterThan(0);
    });
});
