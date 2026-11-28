import type { AssemblyModel, RepairStep, Vec3 } from '../domain/schema.js';

export function confirmedOffsets(model:AssemblyModel,steps:readonly RepairStep[],count:number,paths:Readonly<Record<string,Vec3[]>>) {
    const offsets:Record<string,Vec3>={};
    for (const step of steps.slice(0,count)) {
        const end=paths[step.operationId]?.at(-1);
        if(!end) continue;
        const op=model.operations.find(o=>o.id===step.operationId);
        for(const member of op?.members ?? []) offsets[member]=end;
    }
    return offsets;
}

/**
 * Occurrences absent from the assembly after the confirmed steps. Browsing step
 * history does not change this physical state.
 */
export function removedInstances(
    steps: readonly RepairStep[],
    confirmedCount: number,
    movers: Readonly<Record<string, string | undefined>>
): ReadonlySet<string> {
    const removed = new Set<string>();
    for (const step of steps.slice(0, confirmedCount)) {
        const instanceId = movers[step.operationId];
        if (!instanceId) continue;
        if (step.phase === 'remove') removed.add(instanceId);
        else if (step.phase === 'restore') removed.delete(instanceId);
    }
    return removed;
}
