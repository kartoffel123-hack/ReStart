/**
 * Assembly-wide availability layers.
 *
 * Modeled moves are checked and applied through the domain state machine.
 * Geometry-only exits are a separate heuristic lane: they can expose later
 * candidates, but never satisfy a modeled pose requirement or become a
 * validated removal instruction.
 */
import type { AssemblyModel, Operation, Requirement } from './schema.js';
import type { ConnectionDofCatalog } from './dof.js';
import {
    extractCandidateBlockers,
    type CandidateBlockerEntry,
    type MotionCandidateSummary
} from './dependency-tree.js';
import {
    applyOperation,
    enablement,
    initialState,
    type AssemblyState
} from './state.js';

export type DisassemblyOptionStatus = 'available' | 'blocked' | 'deferred' | 'unassessed';

export type DisassemblyBlocker = Readonly<{
    id: string;
    reason: string;
    role?: Requirement['role'];
}>;

export type DisassemblyOption = Readonly<{
    id: string;
    source: 'modeled-operation' | 'geometry-candidate';
    memberIds: readonly string[];
    label: string;
    direction: readonly number[] | null;
    strokeMm: number | null;
    evidenceTier: 'generated' | 'reviewed' | 'replayed' | 'proved' | 'physical';
    status: DisassemblyOptionStatus;
    blockers: readonly DisassemblyBlocker[];
    clearedBlockers: readonly DisassemblyBlocker[];
    provisional: boolean;
    applied: boolean;
}>;

export type DisassemblyLayer = Readonly<{
    index: number;
    /** Components provisionally peeled in this illustrative pass. */
    pieceIds: readonly string[];
    /** All alternatives assessed from the same pre-layer snapshot. */
    options: readonly DisassemblyOption[];
    /** Options that were individually available but held in place as supports. */
    deferredPieceIds: readonly string[];
}>;

export type DisassemblyLayers = Readonly<{
    layers: readonly DisassemblyLayer[];
    /** Components with at least one modeled full-removal operation or candidate exit. */
    assessedPieceIds: readonly string[];
    /** Remaining pieces with options, but no option currently clears its blockers. */
    stalled: readonly DisassemblyOption[];
    /** Pieces with no usable full-removal operation or geometric candidate. */
    unassessedPieceIds: readonly string[];
    remainingPieceIds: readonly string[];
}>;

type CandidateAssessment = Readonly<{
    candidate: MotionCandidateSummary;
    blockers: readonly CandidateBlockerEntry[];
    unknownBlockerIds: readonly string[];
}>;

function compareIds(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}

function isDetachedOperation(model: AssemblyModel, operation: Operation): boolean {
    if (operation.phase !== 'remove' || operation.isReturn) return false;
    return operation.members.every((memberId) => {
        const assignment = operation.to.find((item) => item.occurrenceId === memberId);
        const pose = assignment && model.poses.find((item) => item.id === assignment.poseId);
        return pose?.kind === 'detached' || pose?.kind === 'bench';
    });
}

function requirementBlockers(
    model: AssemblyModel,
    requirement: Requirement
): DisassemblyBlocker[] {
    if (requirement.subject.kind === 'occurrence') {
        return [{
            id: requirement.subject.id,
            reason: requirement.reason,
            role: requirement.role
        }];
    }
    const connection = model.connections.find((item) => item.id === requirement.subject.id);
    return connection
        ? [connection.a, connection.b].map((id) => ({
              id,
              reason: requirement.reason,
              role: requirement.role
          }))
        : [{
              id: requirement.subject.id,
              reason: requirement.reason,
              role: requirement.role
          }];
}

function protectorsOfEnabledOperations(
    model: AssemblyModel,
    state: AssemblyState,
    remaining: ReadonlySet<string>,
    operations: readonly Operation[]
): Set<string> {
    const protectedIds = new Set<string>();
    for (const operation of operations) {
        if (!enablement(model, state, operation).enabled) continue;
        for (const requirement of operation.requires) {
            if (
                requirement.role !== 'support' ||
                requirement.subject.kind !== 'occurrence' ||
                requirement.id.startsWith('installed:')
            ) continue;
            const currentPose = state.poses[requirement.subject.id];
            if (
                currentPose !== undefined &&
                requirement.acceptable.includes(currentPose) &&
                remaining.has(requirement.subject.id)
            ) {
                protectedIds.add(requirement.subject.id);
            }
        }
    }
    return protectedIds;
}

function applyCandidateRemoval(
    model: AssemblyModel,
    state: AssemblyState,
    memberIds: readonly string[]
): AssemblyState {
    const poses = { ...state.poses };
    const engagement = { ...state.engagement };
    const bench = { ...state.bench };
    for (const memberId of memberIds) {
        // This sentinel is deliberately not a model pose ID. It can satisfy a
        // connection-release requirement, but cannot satisfy an operation that
        // requires a particular reviewed detached pose.
        poses[memberId] = `heuristic-detached:${memberId}`;
        bench[memberId] = 'detached';
        for (const connection of model.connections) {
            if (connection.a === memberId || connection.b === memberId) {
                engagement[connection.id] = 'released';
            }
        }
    }
    return { ...state, poses, engagement, bench };
}

function candidateOption(
    assessment: CandidateAssessment,
    remaining: ReadonlySet<string>,
    protectedIds: ReadonlySet<string>,
    knownPieceIds: ReadonlySet<string>
): DisassemblyOption {
    const allBlockers = assessment.blockers
        .filter((blocker) => blocker.obstacleId !== assessment.candidate.piece)
        .map((blocker) => ({
            id: blocker.obstacleId,
            reason: blocker.label
        }));
    const blockers = allBlockers.filter((blocker) => remaining.has(blocker.id));
    const clearedBlockers = allBlockers.filter((blocker) => !remaining.has(blocker.id));
    const unknownBlockerIds = assessment.unknownBlockerIds.filter(
        (id) => !knownPieceIds.has(id)
    );
    const activeBlockers = [
        ...blockers,
        ...unknownBlockerIds.map((id) => ({
            id,
            reason: 'Candidate references an occurrence not present in the assembly model.'
        }))
    ];
    const held = protectedIds.has(assessment.candidate.piece);
    const status: DisassemblyOptionStatus =
        activeBlockers.length > 0 ? 'blocked' : held ? 'deferred' : 'available';
    return {
        id: assessment.candidate.id,
        source: 'geometry-candidate',
        memberIds: [assessment.candidate.piece],
        label: 'Provisional geometric exit',
        direction: assessment.candidate.axis,
        strokeMm: assessment.candidate.proposedStrokeMm,
        evidenceTier: 'generated',
        status,
        blockers: activeBlockers,
        clearedBlockers,
        provisional: true,
        applied: false
    };
}

function modeledOption(
    model: AssemblyModel,
    state: AssemblyState,
    operation: Operation,
    protectedIds: ReadonlySet<string>
): DisassemblyOption {
    const check = enablement(model, state, operation);
    const blockers = check.unmet.flatMap((requirement) => requirementBlockers(model, requirement));
    const held = operation.members.some((memberId) => protectedIds.has(memberId));
    const status: DisassemblyOptionStatus =
        blockers.length > 0 ? 'blocked' : held ? 'deferred' : 'available';
    return {
        id: operation.id,
        source: 'modeled-operation',
        memberIds: operation.members,
        label: operation.label,
        direction: operation.direction,
        strokeMm: operation.strokeMm,
        evidenceTier: operation.evidence.tier,
        status,
        blockers,
        clearedBlockers: [],
        provisional: operation.evidence.tier === 'generated',
        applied: false
    };
}

/**
 * Computes assembly-wide removal availability by repeatedly peeling the current
 * frontier. Every modeled alternative is retained; the stable first enabled
 * operation is used only to advance the illustrative peel. Generated geometric
 * candidates are explicitly provisional and do not satisfy reviewed pose needs.
 */
export function buildDisassemblyLayers(
    model: AssemblyModel,
    candidates: readonly MotionCandidateSummary[],
    dofCatalog?: ConnectionDofCatalog
): DisassemblyLayers {
    const pieceIds = model.occurrences
        .filter((occurrence) => occurrence.kind === 'piece')
        .map((occurrence) => occurrence.id)
        .sort(compareIds);
    const knownPieceIds = new Set(pieceIds);
    const operationById = new Map(model.operations.map((operation) => [operation.id, operation]));
    const connectionById = new Map(model.connections.map((connection) => [connection.id, connection]));
    const occurrenceById = new Map(model.occurrences.map((occurrence) => [occurrence.id, occurrence]));
    const operations = model.operations
        .filter((operation) => isDetachedOperation(model, operation))
        .sort((a, b) => compareIds(a.id, b.id));
    const candidateAssessments: CandidateAssessment[] = candidates
        .filter((candidate) => knownPieceIds.has(candidate.piece))
        .map((candidate) => {
            const commonName = occurrenceById.get(candidate.piece)?.commonName;
            const blockers = extractCandidateBlockers(
                candidate,
                connectionById,
                dofCatalog?.connections,
                commonName
            );
            const knownIds = new Set(blockers.map((blocker) => blocker.obstacleId));
            return {
                candidate,
                blockers,
                unknownBlockerIds: [...knownIds].filter((id) => !knownPieceIds.has(id))
            };
        })
        .sort((a, b) => compareIds(a.candidate.id, b.candidate.id));
    const candidateByPiece = new Map<string, CandidateAssessment[]>();
    for (const assessment of candidateAssessments) {
        const entries = candidateByPiece.get(assessment.candidate.piece) ?? [];
        entries.push(assessment);
        candidateByPiece.set(assessment.candidate.piece, entries);
    }
    const assessedPieceIds = [...new Set([
        ...operations.flatMap((operation) => operation.members),
        ...candidateAssessments.map((assessment) => assessment.candidate.piece)
    ])].sort(compareIds);

    let state = initialState(model, []);
    const remaining = new Set(pieceIds);
    const layers: DisassemblyLayer[] = [];
    const maxLayers = pieceIds.length + 1;

    for (let index = 0; index < maxLayers && remaining.size > 0; index += 1) {
        const remainingOperations = operations.filter((operation) =>
            operation.members.some((memberId) => remaining.has(memberId))
        );
        const protectedIds = protectorsOfEnabledOperations(model, state, remaining, remainingOperations);
        const options: DisassemblyOption[] = [];

        for (const operation of remainingOperations) {
            options.push(modeledOption(model, state, operation, protectedIds));
        }
        for (const pieceId of [...remaining].sort(compareIds)) {
            for (const assessment of candidateByPiece.get(pieceId) ?? []) {
                options.push(candidateOption(assessment, remaining, protectedIds, knownPieceIds));
            }
        }
        options.sort((a, b) => compareIds(a.id, b.id));

        const available = options.filter((option) => option.status === 'available');
        if (available.length === 0) {
            const stalled = options.filter(
                (option) => option.status === 'blocked' || option.status === 'deferred'
            );
            const unassessedPieceIds = [...remaining]
                .filter((pieceId) => !options.some((option) => option.memberIds.includes(pieceId)))
                .sort(compareIds);
            return {
                layers,
                assessedPieceIds,
                stalled,
                unassessedPieceIds,
                remainingPieceIds: [...remaining].sort(compareIds)
            };
        }

        const appliedOperationIds = new Set<string>();
        const appliedCandidateIds = new Set<string>();
        const clearedPieceIds = new Set<string>();
        // A frontier is an availability snapshot, not a batch promise. Recheck
        // each operation against the evolving state before applying it.
        for (const option of available.filter((entry) => entry.source === 'modeled-operation')) {
            const operation = operationById.get(option.id);
            if (!operation || !enablement(model, state, operation).enabled) continue;
            const applied = applyOperation(model, state, operation, []);
            if (applied.issues.length > 0) continue;
            state = applied.state;
            appliedOperationIds.add(operation.id);
            for (const assignment of operation.to) {
                const pose = model.poses.find((item) => item.id === assignment.poseId);
                if ((pose?.kind === 'detached' || pose?.kind === 'bench') && remaining.has(assignment.occurrenceId)) {
                    clearedPieceIds.add(assignment.occurrenceId);
                }
            }
        }

        for (const option of available.filter((entry) => entry.source === 'geometry-candidate')) {
            if (option.memberIds.some((memberId) => clearedPieceIds.has(memberId))) continue;
            if (option.memberIds.some((memberId) => protectedIds.has(memberId))) continue;
            const members = option.memberIds.filter((memberId) => remaining.has(memberId));
            if (members.length === 0) continue;
            state = applyCandidateRemoval(model, state, members);
            appliedCandidateIds.add(option.id);
            for (const memberId of members) clearedPieceIds.add(memberId);
        }

        // Keep only pieces actually cleared in this pass. Multiple alternatives
        // for one piece remain in `options`; one deterministic choice advances.
        for (const pieceId of clearedPieceIds) remaining.delete(pieceId);
        const deferredPieceIds = [...new Set(
            options
                .filter((option) => option.status === 'deferred')
                .flatMap((option) => option.memberIds)
        )].filter((pieceId) => remaining.has(pieceId)).sort(compareIds);
        const layerMembers = new Set([...clearedPieceIds, ...deferredPieceIds]);
        layers.push({
            index: index + 1,
            pieceIds: [...clearedPieceIds].sort(compareIds),
            options: options
                .filter((option) => option.memberIds.some((memberId) => layerMembers.has(memberId)))
                .map((option) => ({
                    ...option,
                    applied:
                        (option.source === 'modeled-operation' && appliedOperationIds.has(option.id)) ||
                        (option.source === 'geometry-candidate' && appliedCandidateIds.has(option.id))
                })),
            deferredPieceIds
        });

        if (clearedPieceIds.size === 0) {
            return {
                layers,
                assessedPieceIds,
                stalled: options.filter((option) => option.status !== 'unassessed'),
                unassessedPieceIds: [...remaining]
                    .filter((pieceId) => !options.some((option) => option.memberIds.includes(pieceId)))
                    .sort(compareIds),
                remainingPieceIds: [...remaining].sort(compareIds)
            };
        }
    }

    return {
        layers,
        assessedPieceIds,
        stalled: [],
        unassessedPieceIds: [],
        remainingPieceIds: [...remaining].sort(compareIds)
    };
}
