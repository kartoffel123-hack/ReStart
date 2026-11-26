/**
 * Assembly state and legality (plan 02 §4.1–§4.2).
 *
 * State carries the current named poses, connection engagement, bench
 * membership, the pieces disturbed so far, the fitted item in each target slot,
 * and the outstanding return obligations. Keys are interned ID strings — never
 * one JS 32-bit integer for a 70-piece assembly.
 */
import type {
    AssemblyModel,
    Operation,
    Pose,
    Requirement,
    RigidFrame
} from './schema.js';

export type EngagementState = 'engaged' | 'released';

export type AssemblyState = Readonly<{
    /** occurrence id -> pose id */
    poses: Readonly<Record<string, string>>;
    /** connection id -> engagement */
    engagement: Readonly<Record<string, EngagementState>>;
    /** occurrence id -> bench frame id when the piece is off the assembly */
    bench: Readonly<Record<string, string>>;
    /** healthy pieces physically displaced at any point in the job */
    disturbedIds: readonly string[];
    /** target slot id -> what is fitted there now */
    fitted: Readonly<Record<string, 'original' | 'replacement'>>;
    /** outward operations whose paired return has not run yet */
    outstandingReturns: readonly string[];
    /** operations applied in order, for replay and hashing */
    history: readonly string[];
}>;

export type Issue = Readonly<{
    code: string;
    message: string;
    operationId?: string;
    requirementId?: string;
    subjectId?: string;
}>;

export type Enablement = Readonly<{
    enabled: boolean;
    /** Requirements that do not hold in this state, in stable order. */
    unmet: readonly Requirement[];
}>;

/** Deterministic ordering everywhere: sorted string IDs. */
export function sortedIds(ids: Iterable<string>): string[] {
    return [...new Set(ids)].sort();
}

function indexBy<T>(items: readonly T[], key: (item: T) => string): Map<string, T> {
    return new Map(items.map((item) => [key(item), item]));
}

export type ModelIndex = Readonly<{
    occurrences: Map<string, AssemblyModel['occurrences'][number]>;
    poses: Map<string, Pose>;
    operations: Map<string, Operation>;
    installedPoseOf: Map<string, string>;
    pieceIds: readonly string[];
    targetCapableIds: readonly string[];
}>;

export function indexModel(model: AssemblyModel): ModelIndex {
    const occurrences = indexBy(model.occurrences, (o) => o.id);
    const poses = indexBy(model.poses, (p) => p.id);
    const operations = indexBy(model.operations, (o) => o.id);
    const installedPoseOf = new Map<string, string>();
    const pieceIds: string[] = [];
    for (const occurrence of model.occurrences) {
        if (occurrence.kind === 'piece') {
            pieceIds.push(occurrence.id);
            installedPoseOf.set(occurrence.id, occurrence.installedPoseId);
        }
    }
    return {
        occurrences,
        poses,
        operations,
        installedPoseOf,
        pieceIds: pieceIds.slice().sort(),
        targetCapableIds: pieceIds.slice().sort()
    };
}

/** The installed assembly with an original part in every target slot. */
export function initialState(model: AssemblyModel, targetIds: readonly string[]): AssemblyState {
    const index = indexModel(model);
    const poses: Record<string, string> = {};
    for (const occurrence of model.occurrences) {
        poses[occurrence.id] = occurrence.installedPoseId;
    }
    const engagement: Record<string, EngagementState> = {};
    for (const connection of model.connections) {
        engagement[connection.id] = connection.installedEngaged ? 'engaged' : 'released';
    }
    const fitted: Record<string, 'original' | 'replacement'> = {};
    for (const targetId of sortedIds(targetIds)) {
        fitted[targetId] = 'original';
    }
    void index;
    return { poses, engagement, bench: {}, disturbedIds: [], fitted, outstandingReturns: [], history: [] };
}

/** A requirement holds when its subject is in one of the accepted states. */
export function requirementHolds(
    state: AssemblyState,
    requirement: Requirement
): boolean {
    if (requirement.subject.kind === 'occurrence') {
        const poseId = state.poses[requirement.subject.id];
        return poseId !== undefined && requirement.acceptable.includes(poseId);
    }
    const engagement = state.engagement[requirement.subject.id];
    if (engagement === undefined) return false;
    return requirement.acceptable.includes(engagement);
}

/**
 * A move is enabled when its starting poses hold, every prerequisite holds, its
 * tool is reachable, and its paired return is still available. Tool access and
 * sweep clearance are compiled into requirements by the generator (plan 02
 * §3C), so enabling a move here stays a discrete check.
 */
export function enablement(
    model: AssemblyModel,
    state: AssemblyState,
    operation: Operation
): Enablement {
    const unmet: Requirement[] = [];

    for (const assignment of operation.from) {
        const poseId = state.poses[assignment.occurrenceId];
        if (poseId !== assignment.poseId) {
            unmet.push({
                id: `at:${operation.id}:${assignment.occurrenceId}`,
                subject: { kind: 'occurrence', id: assignment.occurrenceId },
                acceptable: [assignment.poseId],
                role: 'blocker',
                reason: `${assignment.occurrenceId} must be in pose ${assignment.poseId} before ${operation.id}`,
                evidence: { tier: 'generated', source: 'operation.from' }
            });
        }
    }

    for (const requirement of operation.requires) {
        if (!requirementHolds(state, requirement)) unmet.push(requirement);
    }

    if (operation.fitsReplacementOf !== undefined) {
        // The damaged piece has to be individually out of the slot first.
        const fittedNow = state.fitted[operation.fitsReplacementOf];
        if (fittedNow === undefined || fittedNow !== 'original') {
            unmet.push({
                id: `slot:${operation.id}:${operation.fitsReplacementOf}`,
                subject: { kind: 'occurrence', id: operation.fitsReplacementOf },
                acceptable: ['released'],
                role: 'support',
                reason: `${operation.fitsReplacementOf} must be individually released before the spare fits`,
                evidence: { tier: 'generated', source: 'operation.fitsReplacementOf' }
            });
        }
    }

    if (operation.isReturn && !state.outstandingReturns.includes(operation.id)) {
        // Returns are only offered against an obligation that is actually owed.
        const owed = state.outstandingReturns.some((outwardId) => {
            const outward = model.operations.find((candidate) => candidate.id === outwardId);
            return outward?.returnOperationId === operation.id;
        });
        if (!owed) {
            unmet.push({
                id: `return:${operation.id}`,
                subject: { kind: 'occurrence', id: operation.members[0] ?? operation.id },
                acceptable: ['owed'],
                role: 'support',
                reason: `${operation.id} has no outstanding return obligation`,
                evidence: { tier: 'generated', source: 'operation.isReturn' }
            });
        }
    }

    return { enabled: unmet.length === 0, unmet: unmet.slice() };
}

/** Disturbed pieces exclude targets and exclude whole-assembly rotation. */
export function disturbedAfter(
    state: AssemblyState,
    operation: Operation,
    targetIds: ReadonlySet<string>
): readonly string[] {
    if (operation.wholeAssembly) return state.disturbedIds;
    const next = new Set(state.disturbedIds);
    for (const member of operation.members) {
        if (!targetIds.has(member)) next.add(member);
    }
    return sortedIds(next);
}

/** Apply an enabled operation. Returns issues instead of throwing on a bad move. */
export function applyOperation(
    model: AssemblyModel,
    state: AssemblyState,
    operation: Operation,
    targetIds: readonly string[]
): Readonly<{ state: AssemblyState; issues: readonly Issue[] }> {
    const check = enablement(model, state, operation);
    if (!check.enabled) {
        return {
            state,
            issues: check.unmet.map((requirement) => ({
                code: 'operation-not-enabled',
                message: `${operation.id} is not enabled: ${requirement.reason}`,
                operationId: operation.id,
                requirementId: requirement.id,
                subjectId: requirement.subject.id
            }))
        };
    }

    const targetSet = new Set(targetIds);
    const poses = { ...state.poses };
    for (const assignment of operation.to) poses[assignment.occurrenceId] = assignment.poseId;

    const engagement = { ...state.engagement };
    for (const id of operation.releasesConnectionIds) engagement[id] = 'released';
    for (const id of operation.establishesConnectionIds) engagement[id] = 'engaged';

    const bench = { ...state.bench };
    for (const member of operation.members) {
        const poseId = poses[member];
        const pose = poseId === undefined ? undefined : model.poses.find((p) => p.id === poseId);
        if (pose !== undefined && (pose.kind === 'bench' || pose.kind === 'detached')) {
            bench[member] = pose.kind;
        } else {
            delete bench[member];
        }
    }

    const fitted = { ...state.fitted };
    if (operation.fitsReplacementOf !== undefined) {
        fitted[operation.fitsReplacementOf] = 'replacement';
    }

    let outstandingReturns = state.outstandingReturns;
    if (operation.isReturn) {
        outstandingReturns = outstandingReturns.filter(
            (outwardId) =>
                model.operations.find((candidate) => candidate.id === outwardId)?.returnOperationId !==
                operation.id
        );
    } else if (operation.returnOperationId !== undefined && operation.phase === 'remove') {
        if (!outstandingReturns.includes(operation.returnOperationId)) {
            outstandingReturns = sortedIds([...outstandingReturns, operation.returnOperationId]);
        }
    }

    return {
        state: {
            poses,
            engagement,
            bench,
            disturbedIds: disturbedAfter(state, operation, targetSet),
            fitted,
            outstandingReturns,
            history: [...state.history, operation.id]
        },
        issues: []
    };
}

/** Every piece back in its installed pose, spare fitted, nothing owed. */
export function isGoal(
    model: AssemblyModel,
    state: AssemblyState,
    targetIds: readonly string[]
): boolean {
    const index = indexModel(model);
    for (const pieceId of index.pieceIds) {
        if (state.poses[pieceId] !== index.installedPoseOf.get(pieceId)) return false;
    }
    for (const connection of model.connections) {
        const want: EngagementState = connection.installedEngaged ? 'engaged' : 'released';
        if (state.engagement[connection.id] !== want) return false;
    }
    for (const targetId of targetIds) {
        if (state.fitted[targetId] !== 'replacement') return false;
    }
    return state.outstandingReturns.length === 0;
}

/** Whether the target can be exchanged as an individual right now. */
export function targetIsIndividuallyReleased(
    model: AssemblyModel,
    state: AssemblyModel extends never ? never : AssemblyState,
    targetId: string
): boolean {
    const poseId = state.poses[targetId];
    if (poseId === undefined) return false;
    const pose = model.poses.find((candidate) => candidate.id === poseId);
    return pose !== undefined && (pose.kind === 'detached' || pose.kind === 'bench');
}

/** Canonical, order-independent key for state merging (plan 02 §4.4). */
export function stateKey(state: AssemblyState): string {
    const poses: string[] = [];
    for (const id of Object.keys(state.poses).sort()) {
        const value = state.poses[id] as string;
        poses.push(`${id}=${value}`);
    }
    const engagement: string[] = [];
    for (const id of Object.keys(state.engagement).sort()) {
        const value = state.engagement[id] as EngagementState;
        engagement.push(`${id}:${value}`);
    }
    return [
        poses.join('|'),
        engagement.join('|'),
        sortedIds(Object.keys(state.bench)).join(','),
        state.disturbedIds.join(','),
        Object.keys(state.fitted)
            .sort()
            .map((id) => `${id}->${state.fitted[id]}`)
            .join(','),
        state.outstandingReturns.join(',')
    ].join('#');
}

/** Rigid pose of one occurrence now, for the scene and for replay checks. */
export function frameOf(model: AssemblyModel, state: AssemblyState, occurrenceId: string): RigidFrame | undefined {
    const poseId = state.poses[occurrenceId];
    if (poseId === undefined) return undefined;
    return model.poses.find((pose) => pose.id === poseId)?.frame;
}
