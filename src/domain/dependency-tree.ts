/**
 * Pure, deterministic transitive dependency-tree builder for a single target occurrence.
 *
 * Keeps `contains`, `connected-to`, `requires`, and generated `candidate-blocker`
 * relationships strictly separate so reviewers and mechanics can inspect how every
 * part's repair manual is backed by the assembly graph (AGENTS.md).
 *
 * `src/domain` is pure: no DOM, no fetch, no renderer, no clock, no storage.
 */
import type {
    AssemblyModel,
    ConnectionKind,
    EvidenceRef,
    Occurrence,
    Operation,
    Repair
} from './schema.js';
import {
    dofBlockingConnections,
    formatAxisLabel,
    type ConnectionDof,
    type ConnectionDofCatalog,
    type PieceDofSummary
} from './dof.js';

export type DependencyRelation =
    | 'requires'
    | 'connected-to'
    | 'contains'
    | 'candidate-blocker'
    | 'intact-unit';

export type DependencyNodeRole = 'target' | 'blocker' | 'free' | 'assembly' | 'intact-unit';

export type MotionCandidateContact = Readonly<{
    obstacle: string;
    witness: Readonly<{ fromMm: number; toMm: number }> | null;
}>;

export type MotionCandidateSummary = Readonly<{
    id: string;
    piece: string;
    axis: readonly number[];
    proposedStrokeMm: number;
    alignedJoints?: readonly string[] | undefined;
    transverseJoints: readonly string[];
    exitAssessment?: readonly string[] | null | undefined;
    contacts: readonly MotionCandidateContact[];
}>;

export type DependencyTreeNode = Readonly<{
    id: string;
    occurrenceId: string;
    label: string;
    commonName: string;
    locationLabel: string;
    kind: Occurrence['kind'];
    depth: number;
    role: DependencyNodeRole;
    isFree: boolean;
    hasModeledRemove: boolean;
    inManual: boolean;
    manualStepOrdinals: readonly number[];
    removalOrder: number | null;
    reassemblyOrder: number | null;
    dofStatus: PieceDofSummary['status'] | null;
    remainingTranslationalDof: number | null;
    connectionCount: number;
    candidateCount: number;
    evidenceTier: EvidenceRef['tier'] | 'unmodeled';
}>;

export type DependencyTreeEdge = Readonly<{
    id: string;
    source: string;
    target: string;
    relation: DependencyRelation;
    label: string;
    isCycle: boolean;
    evidenceTier: EvidenceRef['tier'];
    connectionKind?: ConnectionKind | undefined;
    connectionId?: string | undefined;
    operationId?: string | undefined;
    alternativeGroup?: string | undefined;
    requirementRole?: 'blocker' | 'tool-access' | 'support' | undefined;
}>;

export type DependencyTreeStats = Readonly<{
    nodeCount: number;
    pieceCount: number;
    assemblyCount: number;
    edgeCount: number;
    maxDepth: number;
    freeLeafCount: number;
    manualNodeCount: number;
    cycleEdgeCount: number;
    byRelation: Readonly<Record<DependencyRelation, number>>;
}>;

export type DependencyPlanStep = Readonly<{
    order: number;
    phase: 'remove' | 'restore';
    pieceId: string;
    commonName: string;
    depth: number;
    isTarget: boolean;
    isUnit?: boolean | undefined;
    memberCount?: number | undefined;
    evidenceTier: EvidenceRef['tier'] | 'unmodeled';
}>;

export type ReleasedConnectionItem = Readonly<{
    connectionId: string;
    kind: ConnectionKind;
    pieces: readonly [string, string];
    pieceNames: readonly [string, string];
    axisLabel: string;
    reason: 'target-interface' | 'blocker-release' | 'unit-interface';
}>;

export type IntactUnitItem = Readonly<{
    unitId: string;
    unitName: string;
    memberIds: readonly string[];
    interfaceConnectionIds: readonly string[];
}>;

export type RemovalReassemblyPlan = Readonly<{
    targetId: string;
    source: 'modeled-manual' | 'candidate-tree';
    additionalPartsCount: number;
    releasedPieceIds: readonly string[];
    releasedConnections: readonly ReleasedConnectionItem[];
    intactUnits: readonly IntactUnitItem[];
    removalOrder: readonly DependencyPlanStep[];
    reassemblyOrder: readonly DependencyPlanStep[];
}>;

export type DependencyTree = Readonly<{
    rootId: string;
    nodes: readonly DependencyTreeNode[];
    edges: readonly DependencyTreeEdge[];
    stats: DependencyTreeStats;
    plan: RemovalReassemblyPlan;
}>;

export type DependencyTreeOptions = Readonly<{
    includeRequires?: boolean | undefined;
    includeConnected?: boolean | undefined;
    includeContains?: boolean | undefined;
    includeCandidates?: boolean | undefined;
    preserveIntactUnits?: boolean | undefined;
    maxDepth?: number | undefined;
    repair?: Repair | undefined;
    candidates?: readonly MotionCandidateSummary[] | undefined;
    dofCatalog?: ConnectionDofCatalog | undefined;
}>;

const DEFAULT_MAX_DEPTH = 12;

function compareStrings(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}

type CandidateBlockerEntry = Readonly<{
    obstacleId: string;
    label: string;
    connectionKind?: ConnectionKind | undefined;
    connectionId?: string | undefined;
    sourceKey: string;
}>;

function extractCandidateBlockers(
    cand: MotionCandidateSummary,
    connectionById: ReadonlyMap<string, AssemblyModel['connections'][number]>,
    dofConnections?: readonly ConnectionDof[],
    pieceCommonName?: string
): readonly CandidateBlockerEntry[] {
    const alignedPeers = new Set<string>();
    for (const jointId of cand.alignedJoints ?? []) {
        const conn = connectionById.get(jointId);
        if (!conn) continue;
        alignedPeers.add(conn.a === cand.piece ? conn.b : conn.a);
    }

    // A double-sided pin with a central cross-bore sandwiched between two aligned beams
    // cannot slide its wider central block through either 4.8 mm beam bore. Keep the
    // beam on the exit side that shows a deep collar collision (>= 1.0 mm span) as a blocker.
    const isSandwichedBorePin =
        alignedPeers.size >= 2 && (pieceCommonName ?? '').toLowerCase().includes('with bore');

    const entries = new Map<string, CandidateBlockerEntry>();
    if (dofConnections) {
        const dofBlocked = dofBlockingConnections(cand.piece, cand.axis, dofConnections);
        for (const conn of dofBlocked) {
            const peerId = conn.pieces[0] === cand.piece ? conn.pieces[1] : conn.pieces[0];
            if (peerId === cand.piece || entries.has(peerId)) continue;
            entries.set(peerId, {
                obstacleId: peerId,
                label: `DOF gesperrt (${conn.kind} ${formatAxisLabel(conn.axis)})`,
                connectionKind: conn.kind,
                connectionId: conn.connectionId,
                sourceKey: `dof:${conn.connectionId}`
            });
        }
    }

    for (const jointId of [...cand.transverseJoints].sort(compareStrings)) {
        const conn = connectionById.get(jointId);
        if (!conn) continue;
        const peerId = conn.a === cand.piece ? conn.b : conn.a;
        if (peerId === cand.piece || entries.has(peerId)) continue;
        entries.set(peerId, {
            obstacleId: peerId,
            label: `transverse ${conn.kind}`,
            connectionKind: conn.kind,
            connectionId: conn.id,
            sourceKey: `transverse:${jointId}`
        });
    }

    if (Array.isArray(cand.exitAssessment)) {
        for (const obstacleId of [...cand.exitAssessment].sort(compareStrings)) {
            if (obstacleId === cand.piece || entries.has(obstacleId)) continue;
            entries.set(obstacleId, {
                obstacleId,
                label: 'unresolved exit obstacle',
                sourceKey: `assessment:${cand.id}`
            });
        }
    } else {
        const contactBlockers = cand.contacts
            .filter((c) => {
                if (c.witness === null || c.obstacle === cand.piece || entries.has(c.obstacle)) {
                    return false;
                }
                if (!alignedPeers.has(c.obstacle)) return true;
                if (isSandwichedBorePin) {
                    const span = c.witness.toMm - c.witness.fromMm;
                    return c.witness.fromMm <= 2.5 && span >= 1.0;
                }
                return false;
            })
            .sort((a, b) => compareStrings(a.obstacle, b.obstacle));
        for (const contact of contactBlockers) {
            const from = contact.witness!.fromMm.toFixed(1);
            const to = contact.witness!.toMm.toFixed(1);
            const label = alignedPeers.has(contact.obstacle)
                ? `Mittelblock blockiert (${from}–${to} mm)`
                : `contact ${from}–${to} mm`;
            entries.set(contact.obstacle, {
                obstacleId: contact.obstacle,
                label,
                sourceKey: `contact:${cand.id}`
            });
        }
    }

    return [...entries.values()].sort((a, b) => compareStrings(a.obstacleId, b.obstacleId));
}

function selectBestCandidate(
    candidates: readonly MotionCandidateSummary[],
    connectionById: ReadonlyMap<string, AssemblyModel['connections'][number]>,
    dofConnections?: readonly ConnectionDof[],
    pieceCommonName?: string
): { candidate: MotionCandidateSummary; blockers: readonly CandidateBlockerEntry[] } | undefined {
    if (candidates.length === 0) return undefined;
    return candidates
        .map((candidate) => ({
            candidate,
            blockers: extractCandidateBlockers(
                candidate,
                connectionById,
                dofConnections,
                pieceCommonName
            )
        }))
        .sort((a, b) => {
            if (a.blockers.length !== b.blockers.length) {
                return a.blockers.length - b.blockers.length;
            }
            if (a.candidate.transverseJoints.length !== b.candidate.transverseJoints.length) {
                return a.candidate.transverseJoints.length - b.candidate.transverseJoints.length;
            }
            if (a.candidate.proposedStrokeMm !== b.candidate.proposedStrokeMm) {
                return a.candidate.proposedStrokeMm - b.candidate.proposedStrokeMm;
            }
            return compareStrings(a.candidate.id, b.candidate.id);
        })[0];
}

function nonTrivialRequires(op: Operation): Operation['requires'] {
    return op.requires.filter(
        (req) => req.role !== 'support' || !req.id.startsWith('installed:')
    );
}

/**
 * Build the complete transitive dependency tree rooted at `rootId`.
 *
 * Traversal order is deterministic: BFS by depth, with neighbours sorted by
 * relation priority (`requires`, `candidate-blocker`, `connected-to`) and ID.
 */
export function buildDependencyTree(
    model: AssemblyModel,
    rootId: string,
    options: DependencyTreeOptions = {}
): DependencyTree {
    const includeRequires = options.includeRequires ?? true;
    const includeConnected = options.includeConnected ?? true;
    const includeContains = options.includeContains ?? false;
    const includeCandidates = options.includeCandidates ?? true;
    const preserveIntactUnits = options.preserveIntactUnits ?? true;
    const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;

    const occurrenceById = new Map<string, Occurrence>();
    for (const occ of model.occurrences) {
        occurrenceById.set(occ.id, occ);
    }
    const rootAssemblyId =
        model.occurrences.find((o) => o.kind === 'assembly' && o.parent === null)?.id ?? '30465';

    const rootOcc = occurrenceById.get(rootId);
    if (!rootOcc) {
        return {
            rootId,
            nodes: [],
            edges: [],
            stats: {
                nodeCount: 0,
                pieceCount: 0,
                assemblyCount: 0,
                edgeCount: 0,
                maxDepth: 0,
                freeLeafCount: 0,
                manualNodeCount: 0,
                cycleEdgeCount: 0,
                byRelation: {
                    requires: 0,
                    'connected-to': 0,
                    contains: 0,
                    'candidate-blocker': 0,
                    'intact-unit': 0
                }
            },
            plan: {
                targetId: rootId,
                source: 'candidate-tree',
                additionalPartsCount: 0,
                releasedPieceIds: [],
                releasedConnections: [],
                intactUnits: [],
                removalOrder: [],
                reassemblyOrder: []
            }
        };
    }

    const connectionById = new Map(model.connections.map((c) => [c.id, c]));
    const connectionsByPiece = new Map<string, typeof model.connections>();
    for (const conn of model.connections) {
        const listA = connectionsByPiece.get(conn.a) ?? [];
        listA.push(conn);
        connectionsByPiece.set(conn.a, listA);

        const listB = connectionsByPiece.get(conn.b) ?? [];
        listB.push(conn);
        connectionsByPiece.set(conn.b, listB);
    }
    for (const list of connectionsByPiece.values()) {
        list.sort((a, b) => compareStrings(a.id, b.id));
    }

    const removeOpsByPiece = new Map<string, Operation[]>();
    for (const op of model.operations) {
        if (op.phase !== 'remove') continue;
        for (const memberId of op.members) {
            const list = removeOpsByPiece.get(memberId) ?? [];
            list.push(op);
            removeOpsByPiece.set(memberId, list);
        }
    }
    for (const list of removeOpsByPiece.values()) {
        list.sort((a, b) => compareStrings(a.id, b.id));
    }

    const candidatesByPiece = new Map<string, MotionCandidateSummary[]>();
    for (const cand of options.candidates ?? []) {
        const list = candidatesByPiece.get(cand.piece) ?? [];
        list.push(cand);
        candidatesByPiece.set(cand.piece, list);
    }

    const operationById = new Map(model.operations.map((op) => [op.id, op]));
    const manualStepsByPiece = new Map<string, number[]>();
    if (options.repair) {
        for (const step of options.repair.steps) {
            const members = operationById.get(step.operationId)?.members ?? [];
            const pieceIds =
                members.length > 0
                    ? members
                    : step.phase === 'check'
                      ? options.repair.targetIds
                      : [];
            for (const pieceId of pieceIds) {
                const list = manualStepsByPiece.get(pieceId) ?? [];
                if (!list.includes(step.ordinal)) {
                    list.push(step.ordinal);
                }
                manualStepsByPiece.set(pieceId, list);
            }
        }
    }

    const dofConnections = options.dofCatalog?.connections;
    const dofPieceById = new Map<string, PieceDofSummary>();
    for (const p of options.dofCatalog?.pieces ?? []) {
        dofPieceById.set(p.pieceId, p);
    }

    const depthById = new Map<string, number>([[rootId, 0]]);
    const edgeById = new Map<string, DependencyTreeEdge>();
    const hasOutgoingBlocker = new Set<string>();
    const evidenceByNode = new Map<string, EvidenceRef['tier']>();
    const intactUnitById = new Map<
        string,
        { unitId: string; unitName: string; interfaceConnectionIds: Set<string> }
    >();
    const releasedConnMap = new Map<string, ReleasedConnectionItem>();

    const recordReleasedConnection = (
        connectionId: string,
        reason: ReleasedConnectionItem['reason']
    ): void => {
        if (releasedConnMap.has(connectionId)) return;
        const conn = connectionById.get(connectionId);
        if (!conn) return;
        const nameA = occurrenceById.get(conn.a)?.commonName ?? conn.a;
        const nameB = occurrenceById.get(conn.b)?.commonName ?? conn.b;
        releasedConnMap.set(connectionId, {
            connectionId: conn.id,
            kind: conn.kind,
            pieces: [conn.a, conn.b],
            pieceNames: [nameA, nameB],
            axisLabel: formatAxisLabel(conn.axis),
            reason
        });
    };

    // Every connection directly holding the target piece must be released to remove the target.
    for (const conn of connectionsByPiece.get(rootId) ?? []) {
        recordReleasedConnection(conn.id, 'target-interface');
    }

    const recordConnectionsBetween = (
        a: string,
        b: string,
        reason: ReleasedConnectionItem['reason']
    ): readonly string[] => {
        const matched: string[] = [];
        for (const conn of connectionsByPiece.get(a) ?? []) {
            if ((conn.a === a && conn.b === b) || (conn.a === b && conn.b === a)) {
                recordReleasedConnection(conn.id, reason);
                matched.push(conn.id);
            }
        }
        return matched;
    };

    const queue: string[] = [rootId];
    let queueIndex = 0;

    const addEdge = (edge: Omit<DependencyTreeEdge, 'isCycle'>, expandTarget: boolean): void => {
        if (edge.source === edge.target) return;
        if (!occurrenceById.has(edge.target)) return;

        const sourceDepth = depthById.get(edge.source) ?? 0;
        const existingTargetDepth = depthById.get(edge.target);
        const isCycle = existingTargetDepth !== undefined && existingTargetDepth <= sourceDepth;

        if (!edgeById.has(edge.id)) {
            edgeById.set(edge.id, { ...edge, isCycle });
        }

        if (edge.relation === 'requires' || edge.relation === 'candidate-blocker') {
            hasOutgoingBlocker.add(edge.source);
        }

        if (expandTarget && existingTargetDepth === undefined && sourceDepth < maxDepth) {
            depthById.set(edge.target, sourceDepth + 1);
            queue.push(edge.target);
        }
    };

    while (queueIndex < queue.length) {
        const currentId = queue[queueIndex++]!;
        const currentDepth = depthById.get(currentId) ?? 0;
        if (currentDepth >= maxDepth) continue;

        const removeOps = removeOpsByPiece.get(currentId) ?? [];
        if (removeOps.length > 0 && !evidenceByNode.has(currentId)) {
            evidenceByNode.set(currentId, removeOps[0]!.evidence.tier);
        }

        if (includeRequires) {
            for (const op of removeOps) {
                const reqs = nonTrivialRequires(op);
                for (const req of reqs) {
                    const targets: string[] = [];
                    if (req.subject.kind === 'occurrence') {
                        targets.push(req.subject.id);
                    } else {
                        const conn = connectionById.get(req.subject.id);
                        if (conn) {
                            if (conn.a === currentId) targets.push(conn.b);
                            else if (conn.b === currentId) targets.push(conn.a);
                            else targets.push(conn.a, conn.b);
                        }
                    }
                    targets.sort(compareStrings);
                    for (const depId of targets) {
                        if (req.subject.kind === 'connection') {
                            recordReleasedConnection(req.subject.id, 'blocker-release');
                        } else {
                            recordConnectionsBetween(currentId, depId, 'blocker-release');
                        }
                        const choicePrefix = op.alternativeGroup
                            ? `[${op.alternativeGroup}] `
                            : '';
                        addEdge(
                            {
                                id: `requires:${currentId}->${depId}:${op.id}:${req.id}`,
                                source: currentId,
                                target: depId,
                                relation: 'requires',
                                label: `${choicePrefix}${req.reason || req.acceptable.join(' or ')}`,
                                evidenceTier: req.evidence.tier,
                                operationId: op.id,
                                alternativeGroup: op.alternativeGroup,
                                requirementRole: req.role
                            },
                            true
                        );
                    }
                }
            }
        }

        if (includeCandidates && removeOps.length === 0) {
            const pieceCandidates = candidatesByPiece.get(currentId) ?? [];
            const currentName = occurrenceById.get(currentId)?.commonName;
            const best = selectBestCandidate(
                pieceCandidates,
                connectionById,
                dofConnections,
                currentName
            );
            if (best) {
                if (!evidenceByNode.has(currentId)) {
                    evidenceByNode.set(currentId, 'generated');
                }
                for (const blocker of best.blockers) {
                    const blockerOcc = occurrenceById.get(blocker.obstacleId);
                    const isExternalSubassembly =
                        preserveIntactUnits &&
                        blockerOcc !== undefined &&
                        blockerOcc.kind === 'piece' &&
                        blockerOcc.parent !== null &&
                        blockerOcc.parent !== rootAssemblyId &&
                        blockerOcc.parent !== rootOcc.parent;

                    if (isExternalSubassembly && blockerOcc.parent) {
                        const unitId = blockerOcc.parent;
                        const unitOcc = occurrenceById.get(unitId);
                        const unitName = unitOcc?.commonName ?? unitId;
                        let unitEntry = intactUnitById.get(unitId);
                        if (!unitEntry) {
                            unitEntry = {
                                unitId,
                                unitName,
                                interfaceConnectionIds: new Set<string>()
                            };
                            intactUnitById.set(unitId, unitEntry);
                        }
                        if (blocker.connectionId) {
                            recordReleasedConnection(blocker.connectionId, 'unit-interface');
                            unitEntry.interfaceConnectionIds.add(blocker.connectionId);
                        }
                        for (const cid of recordConnectionsBetween(
                            currentId,
                            blocker.obstacleId,
                            'unit-interface'
                        )) {
                            unitEntry.interfaceConnectionIds.add(cid);
                        }
                        addEdge(
                            {
                                id: `intact:${currentId}->${unitId}:${blocker.sourceKey}`,
                                source: currentId,
                                target: unitId,
                                relation: 'intact-unit',
                                label: `Baugruppe im Ganzen (${blocker.label})`,
                                evidenceTier: 'generated',
                                connectionKind: blocker.connectionKind,
                                connectionId: blocker.connectionId
                            },
                            false
                        );
                        if (!depthById.has(unitId)) {
                            depthById.set(unitId, currentDepth + 1);
                        }
                        continue;
                    }

                    if (blocker.connectionId) {
                        recordReleasedConnection(blocker.connectionId, 'blocker-release');
                    }
                    recordConnectionsBetween(currentId, blocker.obstacleId, 'blocker-release');

                    const blockerDof = dofPieceById.get(blocker.obstacleId);
                    const blockerHasModeledOps = (removeOpsByPiece.get(blocker.obstacleId) ?? []).length > 0;
                    // Only keep expanding a candidate blocker if it is kinematically locked (DOF 0)
                    // or has modeled requirements; axially slidable fasteners (DOF 1) can be pulled directly.
                    const shouldExpand =
                        !preserveIntactUnits ||
                        blockerHasModeledOps ||
                        blockerDof === undefined ||
                        blockerDof.remainingTranslationalDof === 0;

                    addEdge(
                        {
                            id: `candidate:${currentId}->${blocker.obstacleId}:${blocker.sourceKey}`,
                            source: currentId,
                            target: blocker.obstacleId,
                            relation: 'candidate-blocker',
                            label: blocker.label,
                            evidenceTier: 'generated',
                            connectionKind: blocker.connectionKind,
                            connectionId: blocker.connectionId
                        },
                        shouldExpand
                    );
                    if (!shouldExpand && !depthById.has(blocker.obstacleId)) {
                        depthById.set(blocker.obstacleId, currentDepth + 1);
                    }
                }
            }
        }

        if (includeConnected) {
            const conns = connectionsByPiece.get(currentId) ?? [];
            for (const conn of conns) {
                const peerId = conn.a === currentId ? conn.b : conn.a;
                addEdge(
                    {
                        id: `connected:${currentId}->${peerId}:${conn.id}`,
                        source: currentId,
                        target: peerId,
                        relation: 'connected-to',
                        label: conn.kind,
                        evidenceTier: conn.evidence.tier,
                        connectionKind: conn.kind,
                        connectionId: conn.id
                    },
                    true
                );
            }
        }
    }

    // Add containment ancestry (contains) without collapsing into blocker depths.
    if (includeContains) {
        const pieceIds = [...depthById.keys()].sort(compareStrings);
        for (const pieceId of pieceIds) {
            let cursor = occurrenceById.get(pieceId);
            let ancestorStep = -1;
            while (cursor?.parent) {
                const parentOcc = occurrenceById.get(cursor.parent);
                if (!parentOcc) break;
                if (!depthById.has(parentOcc.id)) {
                    depthById.set(parentOcc.id, ancestorStep);
                }
                const edgeId = `contains:${parentOcc.id}->${cursor.id}`;
                if (!edgeById.has(edgeId)) {
                    edgeById.set(edgeId, {
                        id: edgeId,
                        source: parentOcc.id,
                        target: cursor.id,
                        relation: 'contains',
                        label: 'contains',
                        isCycle: false,
                        evidenceTier: 'generated'
                    });
                }
                cursor = parentOcc;
                ancestorStep -= 1;
            }
        }
    }

    const edges = [...edgeById.values()].sort((a, b) => compareStrings(a.id, b.id));

    // Determine which pieces and intact subassemblies are required to be removed for this target
    // (reachable via `requires`, `candidate-blocker`, or `intact-unit` edges from rootId).
    const requiredDepthById = new Map<string, number>([[rootId, 0]]);
    const reqQueue: string[] = [rootId];
    let reqIdx = 0;
    while (reqIdx < reqQueue.length) {
        const cur = reqQueue[reqIdx++]!;
        const curD = requiredDepthById.get(cur) ?? 0;
        for (const edge of edges) {
            if (edge.source !== cur) continue;
            if (
                edge.relation !== 'requires' &&
                edge.relation !== 'candidate-blocker' &&
                edge.relation !== 'intact-unit'
            ) {
                continue;
            }
            if (!requiredDepthById.has(edge.target)) {
                requiredDepthById.set(edge.target, curD + 1);
                reqQueue.push(edge.target);
            }
        }
    }

    const intactUnits: IntactUnitItem[] = [...intactUnitById.values()]
        .sort((a, b) => compareStrings(a.unitId, b.unitId))
        .map((u) => {
            const memberIds = model.occurrences
                .filter((o) => o.kind === 'piece' && o.parent === u.unitId)
                .map((o) => o.id)
                .sort(compareStrings);
            const memberSet = new Set(memberIds);
            // Every connection crossing the boundary of an intact subassembly must be
            // released to move that subassembly away as a whole unit; internal connections stay intact.
            for (const conn of model.connections) {
                const aIn = memberSet.has(conn.a);
                const bIn = memberSet.has(conn.b);
                if (aIn !== bIn) {
                    recordReleasedConnection(conn.id, 'unit-interface');
                    u.interfaceConnectionIds.add(conn.id);
                }
            }
            return {
                unitId: u.unitId,
                unitName: u.unitName,
                memberIds,
                interfaceConnectionIds: [...u.interfaceConnectionIds].sort(compareStrings)
            };
        });
    const intactUnitLookup = new Map(intactUnits.map((u) => [u.unitId, u]));

    // Build removal order (deepest leaves / intact units first -> target last) and exact reverse reassembly order.
    const orderedRequiredIds = [...requiredDepthById.entries()]
        .filter(([id]) => {
            const occ = occurrenceById.get(id);
            return occ?.kind === 'piece' || intactUnitLookup.has(id);
        })
        .sort(([idA, dA], [idB, dB]) => {
            if (dA !== dB) return dB - dA;
            return compareStrings(idA, idB);
        })
        .map(([id]) => id);

    const removalIndexById = new Map<string, number>();
    const reassemblyIndexById = new Map<string, number>();
    const removalOrder: DependencyPlanStep[] = orderedRequiredIds.map((id, idx) => {
        const order = idx + 1;
        removalIndexById.set(id, order);
        const occ = occurrenceById.get(id)!;
        const unit = intactUnitLookup.get(id);
        return {
            order,
            phase: 'remove',
            pieceId: id,
            commonName: occ.commonName,
            depth: requiredDepthById.get(id) ?? 0,
            isTarget: id === rootId,
            ...(unit ? { isUnit: true, memberCount: unit.memberIds.length } : {}),
            evidenceTier: evidenceByNode.get(id) ?? 'generated'
        };
    });

    const reassemblyOrder: DependencyPlanStep[] = [...orderedRequiredIds]
        .reverse()
        .map((id, idx) => {
            const order = idx + 1;
            reassemblyIndexById.set(id, order);
            const occ = occurrenceById.get(id)!;
            const unit = intactUnitLookup.get(id);
            return {
                order,
                phase: 'restore',
                pieceId: id,
                commonName: occ.commonName,
                depth: requiredDepthById.get(id) ?? 0,
                isTarget: id === rootId,
                ...(unit ? { isUnit: true, memberCount: unit.memberIds.length } : {}),
                evidenceTier: evidenceByNode.get(id) ?? 'generated'
            };
        });

    // If a modeled repair is active, also include any connections explicitly released by its operations.
    if (options.repair) {
        for (const opId of options.repair.operationIds) {
            const op = operationById.get(opId);
            if (!op) continue;
            for (const cid of op.releasesConnectionIds) {
                recordReleasedConnection(cid, 'blocker-release');
            }
        }
    }

    const releasedConnections = [...releasedConnMap.values()].sort((a, b) =>
        compareStrings(a.connectionId, b.connectionId)
    );

    // Highlight in yellow: individually released blocker pieces + the direct interface
    // pieces sitting on released connections of intact units (never internal non-released pieces).
    const releasedPieceSet = new Set<string>(
        orderedRequiredIds.filter((id) => id !== rootId && occurrenceById.get(id)?.kind === 'piece')
    );
    for (const unit of intactUnits) {
        const memberSet = new Set(unit.memberIds);
        for (const cid of unit.interfaceConnectionIds) {
            const conn = connectionById.get(cid);
            if (!conn) continue;
            if (memberSet.has(conn.a) && conn.a !== rootId) releasedPieceSet.add(conn.a);
            if (memberSet.has(conn.b) && conn.b !== rootId) releasedPieceSet.add(conn.b);
        }
    }
    const releasedPieceIds = [...releasedPieceSet].sort(compareStrings);

    const nodes: DependencyTreeNode[] = [...depthById.entries()]
        .sort(([idA, depthA], [idB, depthB]) => {
            if (depthA !== depthB) return depthA - depthB;
            return compareStrings(idA, idB);
        })
        .map(([id, depth]) => {
            const occ = occurrenceById.get(id)!;
            const removeOps = removeOpsByPiece.get(id) ?? [];
            const hasModeledRemove = removeOps.length > 0;
            const pieceCandidates = candidatesByPiece.get(id) ?? [];
            const bestCandidate = selectBestCandidate(
                pieceCandidates,
                connectionById,
                dofConnections,
                occ.commonName
            );
            const dofSummary = dofPieceById.get(id);

            const isModeledFree =
                hasModeledRemove && removeOps.some((op) => nonTrivialRequires(op).length === 0);
            const isCandidateFree =
                !hasModeledRemove &&
                bestCandidate !== undefined &&
                bestCandidate.blockers.length === 0;
            const isFree =
                occ.kind === 'piece' &&
                (isModeledFree || isCandidateFree || (!hasOutgoingBlocker.has(id) && depth > 0));

            const role: DependencyNodeRole = intactUnitById.has(id)
                ? 'intact-unit'
                : occ.kind === 'assembly'
                  ? 'assembly'
                  : id === rootId
                    ? 'target'
                    : isFree
                      ? 'free'
                      : 'blocker';

            const stepOrdinals = manualStepsByPiece.get(id) ?? [];
            const shortId = id.split('/').at(-1) ?? id;

            return {
                id,
                occurrenceId: id,
                label: `${occ.commonName} (${shortId})`,
                commonName: occ.commonName,
                locationLabel: occ.locationLabel,
                kind: occ.kind,
                depth,
                role,
                isFree,
                hasModeledRemove,
                inManual: stepOrdinals.length > 0,
                manualStepOrdinals: stepOrdinals,
                removalOrder: removalIndexById.get(id) ?? null,
                reassemblyOrder: reassemblyIndexById.get(id) ?? null,
                dofStatus: dofSummary?.status ?? null,
                remainingTranslationalDof: dofSummary?.remainingTranslationalDof ?? null,
                connectionCount: (connectionsByPiece.get(id) ?? []).length,
                candidateCount: pieceCandidates.length,
                evidenceTier: evidenceByNode.get(id) ?? (occ.kind === 'assembly' ? 'generated' : 'unmodeled')
            };
        });

    const byRelation: Record<DependencyRelation, number> = {
        requires: 0,
        'connected-to': 0,
        contains: 0,
        'candidate-blocker': 0,
        'intact-unit': 0
    };
    let cycleEdgeCount = 0;
    for (const edge of edges) {
        byRelation[edge.relation] += 1;
        if (edge.isCycle) cycleEdgeCount += 1;
    }

    const pieceNodes = nodes.filter((n) => n.kind === 'piece');
    const maxPieceDepth = pieceNodes.reduce((max, n) => Math.max(max, n.depth), 0);

    return {
        rootId,
        nodes,
        edges,
        stats: {
            nodeCount: nodes.length,
            pieceCount: pieceNodes.length,
            assemblyCount: nodes.length - pieceNodes.length,
            edgeCount: edges.length,
            maxDepth: maxPieceDepth,
            freeLeafCount: pieceNodes.filter((n) => n.role === 'free').length,
            manualNodeCount: pieceNodes.filter((n) => n.inManual).length,
            cycleEdgeCount,
            byRelation
        },
        plan: {
            targetId: rootId,
            source: options.repair ? 'modeled-manual' : 'candidate-tree',
            additionalPartsCount: releasedPieceIds.length,
            releasedPieceIds,
            releasedConnections,
            intactUnits,
            removalOrder,
            reassemblyOrder
        }
    };
}
