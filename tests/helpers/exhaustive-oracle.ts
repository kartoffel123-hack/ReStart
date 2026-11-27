/**
 * Independent exhaustive oracle for the search gates (plan 03 §V03).
 *
 * The point of an oracle is that it can be wrong in a different way from the thing it checks.
 * This file therefore re-reads the hand-worked fixture's operation table and re-implements
 * legality, the disturbed-set cost, the complete-job goal and the search from scratch. It never
 * calls `relevantOperations` (the relevance expander), `routeDisturbance` (the cost function),
 * the incumbent seeding, the branch-and-bound cutoff or the frontier heap.
 *
 * The search strategy differs on purpose too. The solver deduplicates on a state key that
 * contains the disturbed set; this oracle deduplicates on the physical state and keeps the
 * Pareto frontier of disturbed sets, because a route that has disturbed a subset of the pieces
 * is always at least as good as one that has disturbed a superset. A solver that merged states
 * with different disturbed sets would agree with its own key and disagree here.
 *
 * One consequence of that strategy is worth knowing before trusting `routes`. Two histories
 * that converge on the same physical state with the same disturbed set — clearing one retainer
 * by swinging it aside or by lifting it off, then returning it — are the same state to this
 * oracle, so only the first-arrived completion is reported. `routes` therefore enumerates one
 * representative per final state, not every job that ties: the minimum it reports is sound,
 * but absence of a route from `routes` is not evidence that the route is not also optimal.
 * Tests that compare a chosen route against `routes` must use fixtures whose optimal jobs do
 * not converge, which is why `clearClipFixture` is checked on its count, not on its route.
 *
 * `faults` exists for the mutation checks in plan 03 §V03: each one is a plausible wrong
 * implementation, and a named fixture has to expose it.
 */
import type { AssemblyModel, Operation, Requirement } from '../../src/domain/schema.js';

type Engagement = 'engaged' | 'released';
type Fitted = 'original' | 'replacement';

export type OracleFaults = Readonly<{
    /** `moves` counts operations instead of distinct healthy pieces. */
    cost?: 'distinct-pieces' | 'moves';
    /** `target-only` stops checking that the rest of the assembly was restored. */
    goal?: 'complete-job' | 'target-only';
    /** `all-in-group` treats an alternative group as a checklist instead of a choice. */
    alternatives?: 'any' | 'all-in-group';
}>;

export type OracleResult = Readonly<{
    minimum: number | null;
    /** Complete jobs found at the minimum cost, in discovery order. */
    routes: readonly (readonly string[])[];
    statesExplored: number;
    /** Pose configurations reached under two or more different outstanding-return sets. */
    divergentObligations: number;
    capped: boolean;
}>;

type State = Readonly<{
    poses: Readonly<Record<string, string>>;
    engagement: Readonly<Record<string, Engagement>>;
    fitted: Readonly<Record<string, Fitted>>;
    owed: readonly string[];
    disturbed: readonly string[];
    history: readonly string[];
}>;

const MAX_STATES = 200_000;
const MAX_ROUTES = 20_000;

function sortedUnique(values: Iterable<string>): string[] {
    return [...new Set(values)].sort();
}

function isSubset(subset: readonly string[], superset: readonly string[]): boolean {
    const set = new Set(superset);
    return subset.every((value) => set.has(value));
}

function startState(model: AssemblyModel, targetIds: readonly string[]): State {
    const poses: Record<string, string> = {};
    for (const occurrence of model.occurrences) poses[occurrence.id] = occurrence.installedPoseId;
    const engagement: Record<string, Engagement> = {};
    for (const connection of model.connections) {
        engagement[connection.id] = connection.installedEngaged ? 'engaged' : 'released';
    }
    const fitted: Record<string, Fitted> = {};
    for (const targetId of targetIds) fitted[targetId] = 'original';
    return { poses, engagement, fitted, owed: [], disturbed: [], history: [] };
}

function poseKey(state: State): string {
    const poses = Object.keys(state.poses)
        .sort()
        .map((id) => `${id}=${state.poses[id]}`)
        .join('|');
    const engagement = Object.keys(state.engagement)
        .sort()
        .map((id) => `${id}:${state.engagement[id]}`)
        .join('|');
    const fitted = Object.keys(state.fitted)
        .sort()
        .map((id) => `${id}>${state.fitted[id]}`)
        .join('|');
    return `${poses}#${engagement}#${fitted}`;
}

function physicalKey(state: State): string {
    return `${poseKey(state)}@${state.owed.join(',')}`;
}

function holds(state: State, requirement: Requirement): boolean {
    const current =
        requirement.subject.kind === 'occurrence'
            ? state.poses[requirement.subject.id]
            : state.engagement[requirement.subject.id];
    return requirement.acceptable.includes(current ?? '<unset>');
}

/** Legality, re-derived: starting poses, every requirement, an unfilled slot, an owed return. */
function isLegal(state: State, operation: Operation): boolean {
    for (const assignment of operation.from) {
        if (state.poses[assignment.occurrenceId] !== assignment.poseId) return false;
    }
    for (const requirement of operation.requires) {
        if (!holds(state, requirement)) return false;
    }
    if (operation.fitsReplacementOf !== undefined) {
        if (state.fitted[operation.fitsReplacementOf] !== 'original') return false;
    }
    if (operation.isReturn && state.owed[0]!==operation.id) return false;
    return true;
}

function advance(state: State, operation: Operation, targets: ReadonlySet<string>): State {
    const poses = { ...state.poses };
    for (const assignment of operation.to) poses[assignment.occurrenceId] = assignment.poseId;

    const engagement = { ...state.engagement };
    for (const id of operation.releasesConnectionIds) engagement[id] = 'released';
    for (const id of operation.establishesConnectionIds) engagement[id] = 'engaged';

    const fitted = { ...state.fitted };
    if (operation.fitsReplacementOf !== undefined) fitted[operation.fitsReplacementOf] = 'replacement';

    let owed = state.owed;
    if (operation.isReturn) {
        owed = owed.filter((id) => id !== operation.id);
    } else if (operation.returnOperationId !== undefined && operation.phase === 'remove') {
        // Newest access move is restored first (plan 02 §4.5).
        if (!owed.includes(operation.returnOperationId)) owed = [operation.returnOperationId,...owed];
    }

    const disturbed = operation.wholeAssembly
        ? state.disturbed
        : sortedUnique([...state.disturbed, ...operation.members.filter((member) => !targets.has(member))]);

    return { poses, engagement, fitted, owed, disturbed, history: [...state.history, operation.id] };
}

function goalReached(
    model: AssemblyModel,
    state: State,
    targets: readonly string[],
    faults: OracleFaults
): boolean {
    if (faults.goal === 'target-only') {
        return targets.every((target) => state.fitted[target] === 'replacement');
    }
    for (const occurrence of model.occurrences) {
        if (occurrence.kind !== 'piece') continue;
        if (state.poses[occurrence.id] !== occurrence.installedPoseId) return false;
    }
    for (const connection of model.connections) {
        const want: Engagement = connection.installedEngaged ? 'engaged' : 'released';
        if (state.engagement[connection.id] !== want) return false;
    }
    if (!targets.every((target) => state.fitted[target] === 'replacement')) return false;
    if (state.owed.length !== 0) return false;
    if (faults.alternatives === 'all-in-group') {
        for (const group of model.alternativeGroups) {
            const used = group.operationIds.filter((id) => state.history.includes(id));
            if (used.length > 0 && used.length !== group.operationIds.length) return false;
        }
    }
    return true;
}

/** Exhaustive minimum-disturbance search over the fixture's own operation table. */
export function exhaustiveMinimum(
    model: AssemblyModel,
    targetIds: readonly string[],
    faults: OracleFaults = {}
): OracleResult {
    const targets = sortedUnique(targetIds);
    const targetSet = new Set(targets);
    const costOf = (state: State): number =>
        faults.cost === 'moves' ? state.history.length : state.disturbed.length;

    const start = startState(model, targets);
    const worklist: State[] = [start];
    const seen = new Map<string, string[][]>();
    seen.set(physicalKey(start), [[]]);
    const obligations = new Map<string, Set<string>>();

    let explored = 0;
    let capped = false;
    let minimum: number | null = null;
    const routes: string[][] = [];

    while (worklist.length > 0) {
        worklist.sort((a, b) => {
            if (costOf(a) !== costOf(b)) return costOf(a) - costOf(b);
            if (a.history.length !== b.history.length) return a.history.length - b.history.length;
            return a.history.join(',') < b.history.join(',') ? -1 : 1;
        });
        const state = worklist.shift() as State;
        explored += 1;
        if (explored > MAX_STATES) {
            capped = true;
            break;
        }

        const key = poseKey(state);
        const variants = obligations.get(key) ?? new Set<string>();
        variants.add(sortedUnique(state.owed).join(','));
        obligations.set(key, variants);

        if (goalReached(model, state, targets, faults)) {
            const cost = costOf(state);
            if (minimum === null || cost < minimum) {
                minimum = cost;
                routes.length = 0;
                routes.push([...state.history]);
            } else if (cost === minimum) {
                if (routes.length >= MAX_ROUTES) capped = true;
                else routes.push([...state.history]);
            }
            continue;
        }

        for (const operation of model.operations) {
            if (!isLegal(state, operation)) continue;
            const next = advance(state, operation, targetSet);
            const nextKey = physicalKey(next);
            const frontier = seen.get(nextKey) ?? [];
            const disturbed = next.disturbed;
            if (frontier.some((existing) => isSubset(existing, disturbed))) continue;
            seen.set(
                nextKey,
                [...frontier.filter((existing) => !isSubset(disturbed, existing)), [...disturbed]]
            );
            worklist.push(next);
        }
    }

    return {
        minimum,
        routes,
        statesExplored: explored,
        divergentObligations: [...obligations.values()].filter((set) => set.size > 1).length,
        capped
    };
}
