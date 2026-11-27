import type { RepairStep } from '../domain/schema.js';

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
