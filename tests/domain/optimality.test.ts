/**
 * Ticket 6 · V03/V04 · search, swap and restore (plan 02 §4, plan 03 §V03).
 *
 * "Minimum disturbance" is the claim the whole pitch rests on, so it is checked against an
 * exhaustive oracle that re-derives legality, cost, the complete-job goal and the search from
 * the fixture's own operation table (plan 03 §V03: the oracle must not call the production rule
 * expander, cost function or candidate pruner — see tests/helpers/exhaustive-oracle.ts).
 *
 * The last block is the part that keeps the rest honest: three plausible wrong implementations,
 * each of which has to be exposed by a named fixture. An oracle that no fault can fool is not
 * testing anything.
 */
import { describe, expect, it } from 'vitest';
import {
    alternativeEndsFixture,
    clearClipFixture,
    chainFixture,
    exposedTargetFixture,
    partialAxleFixture,
    rigidModuleFixture,
    sealedTargetFixture,
    tiedExitsFixture
} from '../fixtures/repairs.js';
import { BUDGET } from '../fixtures/kit.js';
import { planRepair } from '../../src/domain/planner.js';
import { replay } from '../../src/domain/replay.js';
import { exhaustiveMinimum } from '../helpers/exhaustive-oracle.js';
import type { AssemblyModel, Repair } from '../../src/domain/schema.js';

type Case = Readonly<{ name: string; model: AssemblyModel; target: string }>;

const CASES: readonly Case[] = [
    { name: 'exposed target', model: exposedTargetFixture(), target: 'T' },
    { name: 'chain', model: chainFixture(), target: 'T' },
    { name: 'alternative ends', model: alternativeEndsFixture(), target: 'T' },
    {
        name: 'alternative ends, pusher blocked',
        model: alternativeEndsFixture({ pusherBlocked: true }),
        target: 'T'
    },
    { name: 'partial withdrawal', model: partialAxleFixture(), target: 'gear' },
    { name: 'rigid module', model: rigidModuleFixture(), target: 'T' },
    // Tied exits belongs here as well: two complete jobs disturb the same number of pieces,
    // so the count the solver proves has to match the exhaustive minimum either way.
    { name: 'tied exits', model: tiedExitsFixture(), target: 'T' }
];

function planned(model: AssemblyModel, target: string): Repair {
    const outcome = planRepair(model, [target], BUDGET);
    if (outcome.repair === undefined) {
        throw new Error(`no repair planned: ${outcome.search.status}`);
    }
    return outcome.repair;
}

/** A deterministic reordering: reversed operations, rotated occurrences. */
function reordered(model: AssemblyModel): AssemblyModel {
    const occurrences = [...model.occurrences];
    const head = occurrences.splice(0, 2);
    return {
        ...model,
        occurrences: [...occurrences, ...head],
        operations: [...model.operations].reverse(),
        poses: [...model.poses].reverse()
    };
}

describe('the solver matches the exhaustive oracle', () => {
    for (const testCase of CASES) {
        it(`${testCase.name}: the chosen job is an exhaustive minimum, and the minimum is proved`, () => {
            const oracle = exhaustiveMinimum(testCase.model, [testCase.target]);
            const repair = planned(testCase.model, testCase.target);

            expect(oracle.capped, testCase.name).toBe(false);
            expect(oracle.minimum, testCase.name).not.toBeNull();
            expect(repair.disturbedCount, testCase.name).toBe(oracle.minimum);
            expect(repair.search.status, testCase.name).toBe('proved-minimum');
            // A lower bound that exceeds a route the search returned is not a bound on
            // anything; a proved minimum leaves nothing below it, so the two coincide.
            if (repair.search.lowerBound !== null) {
                expect(repair.search.lowerBound, testCase.name).toBeLessThanOrEqual(oracle.minimum as number);
            }
            expect(repair.search.lowerBound, testCase.name).toBe(oracle.minimum);

            const route = repair.operationIds.join(',');
            const minimumRoutes = oracle.routes.map((entry) => entry.join(','));
            expect(minimumRoutes, testCase.name).toContain(route);
            expect(replay(testCase.model, repair).issues, testCase.name).toEqual([]);
        });

        it(`${testCase.name}: every disturbed piece is reported, including ones touched only on the way back`, () => {
            const repair = planned(testCase.model, testCase.target);
            const moved = new Set<string>();
            for (const step of repair.steps) {
                const operation = testCase.model.operations.find((entry) => entry.id === step.operationId);
                for (const member of operation?.members ?? []) moved.add(member);
            }
            const expected = [...moved]
                .filter((id) => !repair.targetIds.includes(id))
                .sort();
            expect(repair.disturbedIds).toEqual(expected);

            const restoredOnly = repair.steps
                .filter((step) => step.phase === 'restore' || step.phase === 'replace')
                .flatMap((step) => {
                    const operation = testCase.model.operations.find((entry) => entry.id === step.operationId);
                    return operation?.members ?? [];
                })
                .filter((id) => !repair.targetIds.includes(id));
            for (const id of restoredOnly) expect(repair.disturbedIds).toContain(id);
        });

        it(`${testCase.name}: node and candidate order cannot change the route or the proof`, () => {
            const shuffled = reordered(testCase.model);
            const original = planned(testCase.model, testCase.target);
            const against = planned(shuffled, testCase.target);
            expect(against.operationIds).toEqual(original.operationIds);
            expect(against.search.status).toBe(original.search.status);
            expect(against.procedureFingerprint).toBe(original.procedureFingerprint);
        });
    }
});

describe('the proof is qualified honestly', () => {
    it('reports an incomplete search when the budget runs out with no incumbent', () => {
        const outcome = planRepair(chainFixture(), ['T'], { maxExpandedStates: 1, allowIncumbent: true });
        expect(outcome.search.status).toBe('search-incomplete');
        expect(outcome.repair).toBeUndefined();
    });

    it('reports "best route found" for a replayed incumbent it could not improve', () => {
        const model = chainFixture();
        const reference = planned(model, 'T').operationIds;
        const optimum = exhaustiveMinimum(model, ['T']);
        const outcome = planRepair(model, ['T'], { maxExpandedStates: 1, allowIncumbent: true }, {
            incumbentRoute: reference
        });
        expect(outcome.search.status).toBe('best-route-found');
        expect(outcome.search.incumbentSource).toBe('reference-route');
        expect(outcome.repair?.disturbedCount).toBe(optimum.minimum);
        // The bound has to stay a bound while the search is capped: the pending frontier was
        // cheaper than the incumbent, so certifying either the incumbent or a higher count
        // here would be a false proof.
        expect(outcome.search.lowerBound).not.toBeNull();
        expect(outcome.search.lowerBound as number).toBeLessThanOrEqual(optimum.minimum as number);
        expect(outcome.search.tieFrontierComplete).toBe(false);
    });

    it('says no feasible route and names the first unsatisfied alternative when nothing works', () => {
        const model = sealedTargetFixture();
        const outcome = planRepair(model, ['T'], BUDGET);
        const oracle = exhaustiveMinimum(model, ['T']);
        expect(oracle.minimum).toBeNull();
        expect(outcome.search.status).toBe('no-feasible-route');
        expect(outcome.repair).toBeUndefined();
        expect(outcome.search.firstUnsatisfied.map((entry) => entry.requirementId)).toContain('T-needs-panel-off');
        expect(outcome.search.firstUnsatisfied[0]?.subjectId).toBe('panel');
    });

    it('keeps equal-cost alternatives distinct and picks a stable one', () => {
        const model = tiedExitsFixture();
        const oracle = exhaustiveMinimum(model, ['T']);
        expect(oracle.routes.length).toBeGreaterThan(1);
        const route = planned(model, 'T').operationIds.join(',');
        const chosen = oracle.routes.find((entry) => entry.join(',') === route);
        expect(chosen).toBeDefined();
        expect(new Set(oracle.routes.map((entry) => entry.join(','))).size).toBe(oracle.routes.length);
        // Both jobs disturb two pieces, so the tie cannot be broken by cost: a reordered
        // catalog has to select the very same job.
        expect(planned(reordered(model), 'T').operationIds.join(',')).toBe(route);
        expect(planRepair(model, ['T'], BUDGET).search.tieFrontierComplete).toBe(true);
    });

    it('distinguishes access histories that share a pose but owe different returns', () => {
        const model = clearClipFixture();
        const oracle = exhaustiveMinimum(model, ['T']);
        // Two histories reach the same poses and engagement while owing different returns; if
        // the search merged them it could return a job that never puts a piece back.
        expect(oracle.divergentObligations).toBeGreaterThan(0);
        const repair = planned(model, 'T');
        expect(repair.search.status).toBe('proved-minimum');
        expect(repair.disturbedCount).toBe(oracle.minimum);
        expect(replay(model, repair).issues).toEqual([]);
        // The returned job discharges exactly the obligations it took on: no return is owed
        // twice, none is skipped, and no return is performed for a piece the job never moved.
        const owed: string[] = [];
        const returned: string[] = [];
        for (const step of repair.steps) {
            const operation = model.operations.find((entry) => entry.id === step.operationId);
            if (step.phase === 'restore') {
                expect(operation?.isReturn, step.operationId).toBe(true);
                returned.push(step.operationId);
            } else if (operation?.returnOperationId !== undefined) {
                owed.push(operation.returnOperationId);
            }
        }
        expect(returned.slice().sort(), 'every obligation is discharged once').toEqual(
            [...new Set(owed)].sort()
        );
        expect(owed.length, 'no obligation is owed twice').toBe(new Set(owed).size);
        // The clip was cleared by exactly one of the two admissible motions, so the job cannot
        // mix them: it either swings the retainer back or presses a new clip on.
        expect(returned).toHaveLength(1);
    });
});

describe('the oracle is strong enough to fail a wrong implementation', () => {
    const model = chainFixture();
    const repair = planned(model, 'T');

    it('counting moves instead of distinct pieces disagrees on the chain', () => {
        const byMoves = exhaustiveMinimum(model, ['T'], { cost: 'moves' });
        expect(byMoves.minimum).not.toBe(repair.disturbedCount);
    });

    it('checking only the target pose ships a job that never reassembles the chain', () => {
        const terminalOnly = exhaustiveMinimum(model, ['T'], { goal: 'target-only' });
        expect(terminalOnly.minimum).not.toBeNull();
        // The disturbance count is identical: A and B still have to leave to reach T, so a
        // cheaper count is not how this fault shows up. What an implementation that stops at
        // the target pose drops is the job itself — it reports success with A and B still off.
        expect(terminalOnly.minimum).toBe(repair.disturbedCount);
        const abandoned = terminalOnly.routes.find(
            (route) => !route.includes('seat-A') && !route.includes('seat-B')
        );
        expect(abandoned, 'a route that leaves A and B off').toBeDefined();
        expect((abandoned as readonly string[]).length).toBeLessThan(repair.operationIds.length);
        // The complete-job goal is therefore not redundant with the cost: the minimum count is
        // the same, and only the outstanding obligations tell the two jobs apart.
        expect(repair.operationIds).toContain('seat-A');
        expect(repair.operationIds).toContain('seat-B');
    });

    it('treating an alternative group as mandatory loses the route on alternative ends', () => {
        const alternative = alternativeEndsFixture();
        const correct = exhaustiveMinimum(alternative, ['T']);
        const asChecklist = exhaustiveMinimum(alternative, ['T'], { alternatives: 'all-in-group' });
        expect(correct.minimum).not.toBeNull();
        expect(asChecklist.routes).toEqual([]);
    });
});
