/**
 * Search and restoration (plan 02 §4).
 *
 * Branch and bound over assembly states with **distinct non-target pieces
 * disturbed** as the primary cost. The frontier is ordered by disturbed count,
 * then path length, then a stable operation ID, so neither node order nor
 * candidate order can change the chosen route or the proof.
 */
import { procedureFingerprint } from './fingerprint.js';
import { disturbedFromTrace, timingFromTrace, unitOutcomes } from './metrics.js';
import { replay, walk } from './replay.js';
import {
    applyOperation,
    enablement,
    initialState,
    isGoal,
    sortedIds,
    stateKey,
    type AssemblyState
} from './state.js';
import type {
    AssemblyModel,
    Operation,
    Repair,
    RepairStep,
    SearchBudget,
    SearchReport
} from './schema.js';

export type PlanOutcome = Readonly<{
    repair?: Repair;
    search: SearchReport;
}>;

export type PlanOptions = Readonly<{
    /** A replayed reference route seeds the incumbent as an upper bound. */
    incumbentRoute?: readonly string[];
    functionCheckId?: string | null;
}>;

const PHASE_HEADING: Record<Operation['phase'], string> = {
    remove: 'Remove blockers',
    replace: 'Replace the part',
    restore: 'Restore the assembly',
    check: 'Function check'
};

/**
 * Operations that can matter for this target: everything that moves a target,
 * everything able to produce a pose one of those requires, transitively, plus
 * every paired return. Anything outside this set can only add disturbance, so
 * pruning it cannot lose the optimum — this is the closure the proof rests on.
 */
export function relevantOperations(
    model: AssemblyModel,
    targetIds: readonly string[]
): Operation[] {
    const movers = new Map<string, Operation[]>();
    for (const operation of model.operations) {
        for (const member of operation.members) {
            const list = movers.get(member);
            if (list === undefined) movers.set(member, [operation]);
            else list.push(operation);
        }
    }
    const byId = new Map(model.operations.map((operation) => [operation.id, operation]));

    const queue: Operation[] = [];
    for (const targetId of targetIds) queue.push(...(movers.get(targetId) ?? []));

    const seen = new Set<string>();
    while (queue.length > 0) {
        const operation = queue.pop() as Operation;
        if (seen.has(operation.id)) continue;
        seen.add(operation.id);
        const subjects = new Set<string>();
        for (const requirement of operation.requires) {
            if (requirement.subject.kind === 'occurrence') subjects.add(requirement.subject.id);
        }
        for (const assignment of operation.from) subjects.add(assignment.occurrenceId);
        for (const subject of subjects) queue.push(...(movers.get(subject) ?? []));
        if (operation.returnOperationId !== undefined) {
            const paired = byId.get(operation.returnOperationId);
            if (paired !== undefined) queue.push(paired);
        }
    }

    return model.operations.filter((operation) => seen.has(operation.id));
}

/** Distinct healthy pieces a route displaces — the objective being minimised. */
export function routeDisturbance(
    model: AssemblyModel,
    route: readonly string[],
    targetIds: readonly string[]
): number {
    const targets = new Set(targetIds);
    const disturbed = new Set<string>();
    for (const operationId of route) {
        const operation = model.operations.find((candidate) => candidate.id === operationId);
        if (operation === undefined || operation.wholeAssembly) continue;
        for (const member of operation.members) if (!targets.has(member)) disturbed.add(member);
    }
    return disturbed.size;
}

/** Seconds rank candidates only when both routes are fully timed. */
function routeSeconds(model: AssemblyModel, route: readonly string[]): number | null {
    let total = 0;
    for (const operationId of route) {
        const operation = model.operations.find((candidate) => candidate.id === operationId);
        if (operation === undefined || operation.phase !== 'remove') continue;
        const estimate = operation.estimatedSeconds;
        if (estimate === undefined || estimate.coverage === 'unknown') return null;
        total += estimate.seconds;
    }
    return total;
}

/** Secondary ranking among equal-count routes: time, then fewer steps, then IDs. */
function betterRoute(
    model: AssemblyModel,
    candidate: readonly string[],
    incumbent: readonly string[]
): boolean {
    const candidateSeconds = routeSeconds(model, candidate);
    const incumbentSeconds = routeSeconds(model, incumbent);
    if (candidateSeconds !== null && incumbentSeconds !== null && candidateSeconds !== incumbentSeconds) {
        return candidateSeconds < incumbentSeconds;
    }
    if (candidate.length !== incumbent.length) return candidate.length < incumbent.length;
    const longest = Math.min(candidate.length, incumbent.length);
    for (let index = 0; index < longest; index += 1) {
        const left = candidate[index] as string;
        const right = incumbent[index] as string;
        if (left !== right) return left < right;
    }
    return false;
}

type Node = Readonly<{ state: AssemblyState; cost: number; lastOperationId: string }>;

function precedes(a: Node, b: Node): boolean {
    if (a.cost !== b.cost) return a.cost < b.cost;
    const leftLength = a.state.history.length;
    const rightLength = b.state.history.length;
    if (leftLength !== rightLength) return leftLength < rightLength;
    return a.lastOperationId < b.lastOperationId;
}

/**
 * Binary heap so frontier order never depends on insertion order. The
 * branch-and-bound proof reads the minimum off the root, so sift-down has to
 * swap with the *smaller* child; swapping with either one silently pops a node
 * out of order and can end the search before the optimum is seen.
 */
class Frontier {
    private readonly items: Node[] = [];

    get size(): number {
        return this.items.length;
    }

    get minimumCost(): number | null {
        return this.items.length === 0 ? null : ((this.items[0] as Node).cost ?? null);
    }

    push(node: Node): void {
        this.items.push(node);
        let index = this.items.length - 1;
        while (index > 0) {
            const parent = (index - 1) >> 1;
            const parentNode = this.items[parent] as Node;
            if (!precedes(node, parentNode)) break;
            this.items[index] = parentNode;
            this.items[parent] = node;
            index = parent;
        }
    }

    pop(): Node {
        const top = this.items[0] as Node;
        const last = this.items.pop() as Node;
        if (this.items.length > 0) {
            this.items[0] = last;
            let index = 0;
            for (;;) {
                const left = index * 2 + 1;
                const right = left + 1;
                const leftNode = this.items[left];
                if (leftNode === undefined) break;
                const rightNode = this.items[right];
                const smaller =
                    rightNode !== undefined && precedes(rightNode, leftNode) ? right : left;
                const smallerNode = this.items[smaller] as Node;
                if (!precedes(smallerNode, last)) break;
                this.items[index] = smallerNode;
                index = smaller;
            }
            this.items[index] = last;
        }
        return top;
    }
}

function stepsFor(model: AssemblyModel, route: readonly string[]): RepairStep[] {
    const steps: RepairStep[] = route.map((operationId, position) => {
        const operation = model.operations.find((candidate) => candidate.id === operationId) as Operation;
        const firstMember = model.occurrences.find((occurrence) => occurrence.id === operation.members[0]);
        const tool = model.tools.find((candidate) => candidate.id === operation.toolId);
        return {
            stepId: `step-${position + 1}`,
            ordinal: position + 1,
            phase: operation.phase,
            operationId,
            heading: PHASE_HEADING[operation.phase],
            instruction: `${operation.directionLabel} until ${operation.stopLandmark}.`,
            toolLabel: tool?.name ?? operation.toolId,
            stopLandmark: operation.stopLandmark,
            directionLabel: operation.directionLabel,
            partLabel: firstMember?.commonName ?? (operation.members[0] ?? operation.label),
            locationLabel: firstMember?.locationLabel ?? '',
            ...(operation.cameraNote === undefined ? {} : { cameraNote: operation.cameraNote })
        };
    });

    const check = model.functionChecks[0];
    if (check !== undefined) {
        steps.push({
            stepId: `step-${steps.length + 1}`,
            ordinal: steps.length + 1,
            phase: 'check',
            operationId: `check:${check.id}`,
            heading: PHASE_HEADING.check,
            instruction: `${check.instruction} Expect ${check.expectedBehaviour}.`,
            toolLabel: 'None',
            stopLandmark: check.expectedBehaviour,
            directionLabel: 'no motion',
            partLabel: check.subjectUnitIds.join(', ') || 'the repaired mechanism',
            locationLabel: 'assembled kit'
        });
    }
    return steps;
}

function unsatisfiedAlternatives(
    model: AssemblyModel,
    state: AssemblyState,
    operations: readonly Operation[]
): SearchReport['firstUnsatisfied'] {
    const found: SearchReport['firstUnsatisfied'] = [];
    for (const operation of operations) {
        const first = enablement(model, state, operation).unmet[0];
        if (first !== undefined) {
            found.push({
                operationId: operation.id,
                requirementId: first.id,
                subjectId: first.subject.id,
                reason: first.reason
            });
        }
    }
    return found;
}

function emptyTiming(): Repair['timing'] {
    return {
        estimatedSeconds: null,
        timedActions: 0,
        totalActions: 0,
        basis: 'none',
        coverage: 'none',
        rowIds: []
    };
}

export function planRepair(
    model: AssemblyModel,
    targetIds: readonly string[],
    budget: SearchBudget,
    options: PlanOptions = {}
): PlanOutcome {
    const targets = sortedIds(targetIds);
    const targetSet = new Set(targets);
    const catalog = relevantOperations(model, targets);
    const releaseOperations = catalog.filter(
        (operation) => operation.phase === 'remove' && operation.members.some((member) => targetSet.has(member))
    );

    let incumbent: readonly string[] | undefined;
    let incumbentSource: SearchReport['incumbentSource'] = 'none';
    if (options.incumbentRoute !== undefined) {
        const seeded = walk(model, options.incumbentRoute, targets);
        if (seeded.issues.length === 0 && isGoal(model, seeded.state, targets)) {
            incumbent = [...options.incumbentRoute];
            incumbentSource = 'reference-route';
        }
    }
    let incumbentCost = incumbent === undefined ? null : routeDisturbance(model, incumbent, targets);

    const start = initialState(model, targets);
    const frontier = new Frontier();
    frontier.push({ state: start, cost: 0, lastOperationId: '' });
    const bestCostForKey = new Map<string, number>([[stateKey(start), 0]]);

    let expanded = 0;
    let capped = false;
    let frontierEmpty = false;

    for (;;) {
        if (frontier.size === 0) {
            frontierEmpty = true;
            break;
        }
        const lowerBound = frontier.minimumCost as number;
        // Nothing on the frontier can beat or tie the incumbent any more.
        if (incumbentCost !== null && lowerBound > incumbentCost) break;

        const node = frontier.pop();
        if (incumbentCost !== null && node.cost > incumbentCost) continue;

        expanded += 1;
        if (expanded > budget.maxExpandedStates) {
            capped = true;
            break;
        }

        if (isGoal(model, node.state, targets)) {
            const route = node.state.history;
            const cost = node.state.disturbedIds.length;
            if (incumbentCost === null || cost < incumbentCost || betterRoute(model, route, incumbent as readonly string[])) {
                incumbent = route;
                incumbentCost = cost;
                incumbentSource = 'search';
            }
            continue;
        }

        for (const operation of catalog) {
            const applied = applyOperation(model, node.state, operation, targets);
            if (applied.issues.length > 0) continue;
            const key = stateKey(applied.state);
            const cost = applied.state.disturbedIds.length;
            if (incumbentCost !== null && cost > incumbentCost) continue;
            const seenCost = bestCostForKey.get(key);
            if (seenCost !== undefined && seenCost <= cost) continue;
            bestCostForKey.set(key, cost);
            frontier.push({ state: applied.state, cost, lastOperationId: operation.id });
        }
    }

    const frontierMinimum = frontierEmpty ? null : frontier.minimumCost;
    const tieFrontierComplete =
        incumbentCost !== null && (frontierMinimum === null || frontierMinimum > incumbentCost);
    const noLowerBoundRemains =
        incumbentCost !== null && (frontierMinimum === null || frontierMinimum >= incumbentCost);

    let status: SearchReport['status'];
    if (incumbent === undefined) status = frontierEmpty ? 'no-feasible-route' : 'search-incomplete';
    else if (noLowerBoundRemains && tieFrontierComplete) status = 'proved-minimum';
    else status = 'best-route-found';

    const search: SearchReport = {
        status,
        expandedStates: expanded,
        budget: budget.maxExpandedStates,
        tieFrontierComplete,
        bestDisturbedCount: incumbentCost,
        lowerBound: frontierMinimum,
        firstUnsatisfied: incumbent === undefined ? unsatisfiedAlternatives(model, start, releaseOperations) : [],
        incumbentSource
    };

    if (incumbent === undefined) return { search };

    const functionCheckId =
        options.functionCheckId !== undefined ? options.functionCheckId : (model.functionChecks[0]?.id ?? null);
    const route = [...incumbent];

    const draft: Repair = {
        targetIds: targets,
        graphRevision: model.graphRevision,
        datasetRevision: model.source.datasetRevision,
        procedureFingerprint: procedureFingerprint(model, targets, route, functionCheckId),
        steps: stepsFor(model, route),
        operationIds: route,
        disturbedIds: [],
        disturbedCount: 0,
        preservedUnits: [],
        timing: emptyTiming(),
        search,
        replay: { ok: false, steps: [], issues: [] },
        functionCheckId,
        alternatives: []
    };

    // Replay the finished record: an independent replay has to see the
    // disturbed set the route claims, otherwise it cannot cross-check it.
    const disturbed = disturbedFromTrace(model, draft);
    const completed: Repair = {
        ...draft,
        disturbedIds: disturbed,
        disturbedCount: disturbed.length,
        preservedUnits: unitOutcomes(model, draft),
        timing: timingFromTrace(model, draft)
    };
    completed.replay = replay(model, completed);

    return { repair: completed, search };
}
