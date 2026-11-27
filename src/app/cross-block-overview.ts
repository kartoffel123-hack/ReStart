import type { AssemblyModel, Repair } from '../domain/schema.js';

const target = '30465/NAUO17/NAUO56';
const stages = [
    { title: 'Rotorwelle freilegen', pieces: ['NAUO36', 'NAUO37', 'NAUO19/NAUO53', 'NAUO19/NAUO54', 'NAUO19/NAUO55', 'NAUO19/NAUO52'] },
    { title: 'Mittleren Pin freilegen', pieces: ['NAUO27', 'NAUO18', 'NAUO17/NAUO62', 'NAUO17/NAUO61', 'NAUO17/NAUO59', 'NAUO17/NAUO58'] },
    { title: 'Kurze Achse freilegen', pieces: ['NAUO26', 'NAUO17/NAUO63'] }
];

/** Group only the replayed removal sequence. If a revised route no longer
 * matches these sections, keep the ordinary graph rather than mislabel it. */
export function crossBlockOverview(model?: AssemblyModel, repair?: Repair) {
    if (!model || !repair?.replay.ok || repair.targetIds.length !== 1 || repair.targetIds[0] !== target) return;
    const operations = new Map(model.operations.map(op => [op.id, op]));
    const removals = repair.steps.filter(step => step.phase === 'remove').map(step => {
        const op = operations.get(step.operationId);
        return { piece: op?.members.length === 1 ? op.members[0] : undefined, step, stroke: op?.strokeMm };
    });
    const exchange = removals.pop();
    if (exchange?.piece !== target || repair.disturbedIds.includes('30465/NAUO17/NAUO57')) return;
    const groups = stages.map(stage => ({ ...stage, moves: removals.splice(0, stage.pieces.length) }));
    if (removals.length || groups.some(g => g.pieces.some((id,i) => g.moves[i]?.piece !== `30465/${id}`))) return;
    return {groups, exchange};
}
