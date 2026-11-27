/**
 * Ticket 3 (plan 02 §2) · V02/V04. Which move is possible, in what order, and
 * what the assembly looks like afterwards. Expected traces beside each fixture
 * are hand-authored test truth.
 */
import { describe, expect, it } from 'vitest';
import {
    alternativeEndsFixture,
    chainFixture,
    exposedTargetFixture,
    partialAxleFixture,
    rigidModuleFixture
} from '../fixtures/repairs.js';
import { BUDGET } from '../fixtures/kit.js';
import { planRepair } from '../../src/domain/planner.js';
import { replay } from '../../src/domain/replay.js';
import { summarize } from '../../src/domain/metrics.js';
import type { AssemblyModel, Repair } from '../../src/domain/schema.js';

/** Independent reconstruction of the trace: it walks the operation list itself
 *  instead of trusting the planner's own state. */
function traceOf(model: AssemblyModel, repair: Repair) {
    const poses = new Map<string, string>();
    for (const occurrence of model.occurrences) poses.set(occurrence.id, occurrence.installedPoseId);
    const engaged = new Map<string, boolean>();
    for (const connection of model.connections) engaged.set(connection.id, connection.installedEngaged);
    const fitted = new Map<string, 'original' | 'replacement'>();
    for (const targetId of repair.targetIds) fitted.set(targetId, 'original');

    const frames: { label: string; poses: ReadonlyMap<string, string> }[] = [];
    for (const operationId of repair.operationIds) {
        const operation = model.operations.find((candidate) => candidate.id === operationId);
        if (operation === undefined) throw new Error(`route names unknown operation ${operationId}`);
        for (const assignment of operation.to) poses.set(assignment.occurrenceId, assignment.poseId);
        for (const id of operation.releasesConnectionIds) engaged.set(id, false);
        for (const id of operation.establishesConnectionIds) engaged.set(id, true);
        if (operation.fitsReplacementOf !== undefined) fitted.set(operation.fitsReplacementOf, 'replacement');
        frames.push({ label: operationId, poses: new Map(poses) });
    }

    return {
        frames,
        poseOf(occurrenceId: string): string | undefined {
            return poses.get(occurrenceId);
        },
        itemAt(occurrenceId: string): string | undefined {
            return fitted.get(occurrenceId);
        },
        engagedConnectionIds(): string[] {
            return [...engaged.entries()].filter(([, value]) => value).map(([id]) => id).sort();
        },
        /** Snapshot at the moment the spare goes in. */
        atExchange(): { poseOf(id: string): string | undefined } {
            const index = repair.operationIds.findIndex((id) =>
                (model.operations.find((o) => o.id === id)?.fitsReplacementOf ?? '') !== ''
            );
            const frame = frames[index] as (typeof frames)[number];
            return { poseOf: (id: string) => frame.poses.get(id) };
        },
        final(): { poseOf(id: string): string | undefined; engagedConnectionIds: string[] } {
            return {
                poseOf: (id: string) => poses.get(id),
                engagedConnectionIds: [...engaged.entries()]
                    .filter(([, value]) => value)
                    .map(([id]) => id)
                    .sort()
            };
        }
    };
}

function feasible(model: AssemblyModel, targetId: string): Repair {
    const result = planRepair(model, [targetId], BUDGET);
    if (result.repair === undefined) {
        throw new Error(`expected a feasible repair: ${JSON.stringify(result.search.status)}`);
    }
    return result.repair;
}

describe('exposed target', () => {
    it('releases, exchanges and reinstalls the piece while disturbing nothing', () => {
        const model = exposedTargetFixture();
        const repair = feasible(model, 'T');

        expect(repair.disturbedIds).toEqual([]);
        expect(repair.disturbedCount).toBe(0);
        expect(repair.steps.map((step) => step.phase)).toEqual(['remove', 'replace', 'check']);

        const trace = traceOf(model, repair);
        expect(trace.itemAt('T')).toBe('replacement');
        expect(trace.poseOf('T')).toBe('T/installed');
        expect(trace.engagedConnectionIds()).toEqual(['c-T']);
    });

    it('never lets the damaged piece count as the restored item', () => {
        const model = exposedTargetFixture();
        const repair = feasible(model, 'T');
        const fittingStep = repair.steps.find((step) => step.phase === 'replace');
        expect(fittingStep).toBeDefined();
        expect(repair.operationIds.filter((id) => id === 'pull-T')).toHaveLength(1);
    });
});

describe('chain', () => {
    it('takes A off before B and B before T, then seats T, B and A', () => {
        const model = chainFixture();
        const repair = feasible(model, 'T');

        expect(repair.disturbedIds).toEqual(['A', 'B']);
        expect(repair.operationIds).toEqual([
            'pull-A',
            'pull-B',
            'pull-T',
            'fit-spare-T',
            'seat-B',
            'seat-A'
        ]);

        const trace = traceOf(model, repair);
        expect(trace.final().poseOf('A')).toBe('A/installed');
        expect(trace.final().engagedConnectionIds).toEqual(['c-A', 'c-B', 'c-T']);
    });

    it('keeps the original target out of its slot after the exchange', () => {
        const model = chainFixture();
        const repair = feasible(model, 'T');
        const installIndex = repair.operationIds.indexOf('fit-spare-T');
        const reRelease = repair.operationIds
            .slice(installIndex + 1)
            .filter((id) => id === 'pull-T');
        expect(reRelease).toEqual([]);
        expect(traceOf(model, repair).itemAt('T')).toBe('replacement');
    });
});

describe('alternative ends', () => {
    it('pushes right and disturbs only C when the pusher has room', () => {
        const model = alternativeEndsFixture();
        const repair = feasible(model, 'T');

        expect(repair.disturbedIds).toEqual(['C']);
        expect(repair.operationIds).toContain('pull-T-right');
        expect(repair.operationIds).not.toContain('pull-T-left');
    });

    it('falls back to the left exit when the pusher corridor is blocked', () => {
        const model = alternativeEndsFixture({ pusherBlocked: true });
        const repair = feasible(model, 'T');

        expect(repair.disturbedIds).toEqual(['A', 'B']);
        expect(repair.operationIds).toContain('pull-T-left');
    });

    it('keeps the left prerequisites off the right option', () => {
        const model = alternativeEndsFixture();
        const right = model.operations.find((candidate) => candidate.id === 'pull-T-right');
        const left = model.operations.find((candidate) => candidate.id === 'pull-T-left');
        expect(right?.requires.map((requirement) => requirement.subject.id)).toEqual(['C']);
        expect(left?.requires.map((requirement) => requirement.subject.id)).toEqual(['A', 'B']);
    });
});

describe('partial withdrawal', () => {
    it('leaves the axle supported until the replacement gear is seated', () => {
        const fixture = partialAxleFixture();
        const repair = feasible(fixture, 'gear');
        const trace = traceOf(fixture, repair);

        expect(repair.disturbedIds).toEqual(['axle']);
        expect(trace.atExchange().poseOf('axle')).toBe('axle/retracted-4mm');
        expect(trace.itemAt('gear')).toBe('replacement');
        expect(trace.final().poseOf('axle')).toBe('axle/installed');
        expect(trace.final().engagedConnectionIds).toEqual(['c-axle-beam', 'c-gear-axle']);
    });

    it('does not extract the axle when a 4 mm stroke clears the gear', () => {
        const fixture = partialAxleFixture();
        const repair = feasible(fixture, 'gear');
        expect(repair.operationIds).not.toContain('extract-axle');
        expect(repair.operationIds).not.toContain('pull-beam');
    });
});

describe('rigid module', () => {
    it('prefers two disturbed pins over one faster module move', () => {
        const model = rigidModuleFixture();
        const repair = feasible(model, 'T');

        expect(repair.disturbedIds).toEqual(['P1', 'P2']);
        expect(repair.operationIds).not.toContain('park-module');
    });

    it('counts every module member and reports the unit preserved intact', () => {
        const model = rigidModuleFixture({ disablePins: true });
        const repair = feasible(model, 'T');

        expect(repair.disturbedIds).toEqual(['m1', 'm2', 'm3']);
        const clamp = summarize(repair, model).preservedUnits.find((unit) => unit.unitId === 'unit-clamp');
        expect(clamp?.outcome).toBe('preserved-intact');
    });

    it('charges nothing for turning the whole assembly in your hands', () => {
        const model = rigidModuleFixture({ disablePins: true });
        const repair = feasible(model, 'T');
        expect(repair.operationIds.filter((id) => id === 'turn-assembly')).toHaveLength(0);
        expect(repair.disturbedCount).toBe(3);
    });
});

describe('independent replay', () => {
    it('accepts each route above and reports no issues', () => {
        for (const [model, target] of [
            [exposedTargetFixture(), 'T'],
            [chainFixture(), 'T'],
            [partialAxleFixture(), 'gear']
        ] as const) {
            const repair = feasible(model, target);
            const report = replay(model, repair);
            expect(report.ok, target).toBe(true);
            expect(report.issues, target).toEqual([]);
        }
    });
});
