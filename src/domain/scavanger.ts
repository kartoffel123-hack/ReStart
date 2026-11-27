import type { AssemblyModel, Occurrence } from './schema.js';

export type ScavangerRun = Readonly<{
    removedIds: readonly string[];
    retainedIds: readonly string[];
    turns: readonly (readonly string[])[];
    edges: readonly Readonly<{ from: string; to: string; turn: number }>[];
    cyclePieceIds: readonly string[];
    decidedIds: readonly string[];
    pendingRemovedIds: readonly string[];
    currentPieceId: string | null;
    awaitingTurnConfirmation: boolean;
    finished: boolean;
    error?: string;
}>;

export function scavangerDependencyGraph(model: AssemblyModel, run: ScavangerRun) {
    const turnByPiece = new Map(run.turns.flatMap((turn, index) => turn.map((id) => [id, index + 1] as const)));
    const terminalTurn = run.turns.length + 1;
    for (const id of run.retainedIds) turnByPiece.set(id, terminalTurn);
    const nodes = model.occurrences
        .filter((occurrence) => occurrence.kind === 'piece')
        .map((occurrence) => ({
            id: occurrence.id,
            label: occurrence.commonName,
            location: occurrence.locationLabel,
            turn: turnByPiece.get(occurrence.id) ?? terminalTurn,
            outcome: run.retainedIds.includes(occurrence.id) ? 'retained' as const : 'removed' as const
        }));
    const edges = [...turnByPiece].flatMap(([from, fromTurn]) =>
        [...turnByPiece]
            .filter(([, toTurn]) => fromTurn < toTurn)
            .map(([to, toTurn]) => ({
                from,
                to,
                fromTurn,
                toTurn,
                relation: 'removed-before' as const,
                evidence: 'player-classified-turn-order-candidate' as const
            }))
    );
    return {
        schema: 'restart.scavanger-dependency-graph/1' as const,
        graphRevision: model.graphRevision,
        datasetRevision: model.source.datasetRevision,
        semantics: 'Turn-order candidates from player decisions; not verified blockers.',
        nodes,
        edges
    };
}

export function startScavanger(model: AssemblyModel): ScavangerRun {
    const pieceIds = model.occurrences.filter((occurrence) => occurrence.kind === 'piece').map(({ id }) => id).sort();
    return {
        removedIds: [],
        retainedIds: [],
        turns: [],
        edges: [],
        cyclePieceIds: pieceIds,
        decidedIds: [],
        pendingRemovedIds: [],
        currentPieceId: pieceIds[0] ?? null,
        awaitingTurnConfirmation: false,
        finished: pieceIds.length === 0
    };
}

export function scavangerChoices(model: AssemblyModel, run: ScavangerRun): readonly Occurrence[] {
    const removed = new Set(run.removedIds);
    return model.occurrences
        .filter((occurrence) => occurrence.kind === 'piece' && !removed.has(occurrence.id))
        .sort((a, b) => a.id.localeCompare(b.id));
}

export function decideScavangerPiece(
    model: AssemblyModel,
    run: ScavangerRun,
    pieceId: string,
    decision: 'remove' | 'keep'
): ScavangerRun {
    if (run.finished || run.awaitingTurnConfirmation || pieceId !== run.currentPieceId) {
        return { ...run, error: 'This is not the current component.' };
    }
    const occurrence = model.occurrences.find((candidate) => candidate.id === pieceId && candidate.kind === 'piece');
    if (!occurrence) return { ...run, error: 'The selected component is not in this assembly.' };

    const decidedIds = [...run.decidedIds, pieceId];
    const pendingRemovedIds = decision === 'remove'
        ? [...run.pendingRemovedIds, pieceId]
        : run.pendingRemovedIds;
    const nextPiece = run.cyclePieceIds.find((id) => !decidedIds.includes(id));
    if (nextPiece) {
        const { error: _error, ...cleanRun } = run;
        return { ...cleanRun, decidedIds, pendingRemovedIds, currentPieceId: nextPiece };
    }

    const { error: _error, ...cleanRun } = run;
    return {
        ...cleanRun,
        decidedIds,
        pendingRemovedIds,
        currentPieceId: null,
        awaitingTurnConfirmation: true
    };
}

export function confirmScavangerTurn(model: AssemblyModel, run: ScavangerRun): ScavangerRun {
    if (!run.awaitingTurnConfirmation || run.finished) return { ...run, error: 'There is no turn waiting for confirmation.' };
    const removedThisTurn = run.pendingRemovedIds;
    const removedIds = [...run.removedIds, ...removedThisTurn];
    const remaining = model.occurrences
        .filter((candidate) => candidate.kind === 'piece' && !removedIds.includes(candidate.id))
        .map(({ id }) => id)
        .sort();
    const turn = run.turns.length + 1;
    const edges = removedThisTurn.flatMap((from) =>
        remaining.map((to) => ({ from, to, turn }))
    );
    const finished = removedThisTurn.length === 0 || remaining.length === 0;
    const { error: _error, ...cleanRun } = run;
    return {
        ...cleanRun,
        removedIds,
        retainedIds: removedThisTurn.length === 0 ? remaining : [],
        turns: removedThisTurn.length > 0 ? [...run.turns, removedThisTurn] : run.turns,
        edges: [...run.edges, ...edges],
        cyclePieceIds: finished ? [] : remaining,
        decidedIds: [],
        pendingRemovedIds: [],
        currentPieceId: finished ? null : remaining[0] ?? null,
        awaitingTurnConfirmation: false,
        finished
    };
}
