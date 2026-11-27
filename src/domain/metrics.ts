/**
 * Mechanic-facing results (plan 02 §4 and §6): the disturbance count, the
 * preserved-unit history, timing with its coverage, and the product-loop
 * recommendation. Derived from the operation trace, never cached in the plan.
 */
import type {
    AssemblyModel,
    Operation,
    Repair,
    TimingSummary,
    UnitOutcome
} from './schema.js';

function operations(model: AssemblyModel, repair: Repair): Operation[] {
    return repair.operationIds
        .map((id) => model.operations.find((candidate) => candidate.id === id))
        .filter((operation): operation is Operation => operation !== undefined);
}

/** Distinct healthy pieces displaced, excluding targets and whole-assembly turns. */
export function disturbedFromTrace(
    model: AssemblyModel,
    repair: Repair
): string[] {
    const targets = new Set(repair.targetIds);
    const disturbed = new Set<string>();
    for (const operation of operations(model, repair)) {
        if (operation.wholeAssembly) continue;
        for (const member of operation.members) {
            if (!targets.has(member)) disturbed.add(member);
        }
    }
    return [...disturbed].sort();
}

/**
 * Unit history decides the wording. A unit lifted rigidly with every internal
 * interface intact and reinstalled is preserved intact; one taken apart and
 * rebuilt has a different history even when its final pose matches.
 */
export function unitOutcomes(model: AssemblyModel, repair: Repair): UnitOutcome[] {
    const applied = operations(model, repair);
    return model.units.map((unit) => {
        const members = new Set(unit.memberIds);
        const touching = applied.filter((operation) =>
            operation.members.some((member) => members.has(member))
        );
        if (touching.length === 0) {
            return {
                unitId: unit.id,
                name: unit.name,
                outcome: 'left-in-place' as const,
                memberIds: [...unit.memberIds].sort(),
                reason: 'no operation displaced any member'
            };
        }
        const releasedInternally = touching.some((operation) =>
            operation.releasesConnectionIds.some((id) => unit.internalConnectionIds.includes(id))
        );
        if (releasedInternally) {
            return {
                unitId: unit.id,
                name: unit.name,
                outcome: 'taken-apart' as const,
                memberIds: [...unit.memberIds].sort(),
                reason: 'an internal interface was released during the job'
            };
        }
        const rigid = touching.every(
            (operation) =>
                operation.wholeAssembly ||
                unit.memberIds.every((member) => operation.members.includes(member))
        );
        if (rigid) {
            return {
                unitId: unit.id,
                name: unit.name,
                outcome: 'preserved-intact' as const,
                memberIds: [...unit.memberIds].sort(),
                reason: 'every member travelled together and kept its internal connections'
            };
        }
        return {
            unitId: unit.id,
            name: unit.name,
            outcome: 'taken-apart' as const,
            memberIds: [...unit.memberIds].sort(),
            reason: 'members were displaced separately'
        };
    });
}

/**
 * Timing sums outward disassembly effort through target removal. A route with
 * any unmapped action reports partial coverage and never a silent zero.
 */
export function timingFromTrace(model: AssemblyModel, repair: Repair): TimingSummary {
    const applied = operations(model, repair);
    const outward = applied.filter((operation) => operation.phase === 'remove');
    let total = 0;
    let seconds = 0;
    const rowIds: string[] = [];
    let basis = 'none';
    for (const operation of outward) {
        total += 1;
        const estimate = operation.estimatedSeconds;
        if (estimate === undefined || estimate.coverage === 'unknown') continue;
        seconds += estimate.seconds;
        rowIds.push(estimate.rowId);
        basis = estimate.basis;
    }
    if (total === 0) {
        return { estimatedSeconds: null, timedActions: 0, totalActions: 0, basis: 'none', coverage: 'none', rowIds: [] };
    }
    const coverage = rowIds.length === 0 ? 'none' : rowIds.length === total ? 'complete' : 'partial';
    return {
        estimatedSeconds: coverage === 'none' ? null : seconds,
        timedActions: rowIds.length,
        totalActions: total,
        basis,
        coverage,
        rowIds: [...new Set(rowIds)].sort()
    };
}

export type Summary = Readonly<{
    targetLabel: string;
    disturbedIds: readonly string[];
    disturbedCount: number;
    preservedUnits: readonly UnitOutcome[];
    timing: TimingSummary;
    recommendation: string;
}>;

export function summarize(repair: Repair, model: AssemblyModel): Summary {
    const disturbedIds = disturbedFromTrace(model, repair);
    const preservedUnits = unitOutcomes(model, repair);
    const timing = timingFromTrace(model, repair);
    const target = model.occurrences.find((occurrence) => occurrence.id === repair.targetIds[0]);
    const intact = preservedUnits.filter((unit) => unit.outcome === 'preserved-intact');
    const targetLabel = target === undefined ? (repair.targetIds[0] ?? 'target') : `${target.commonName} (${target.locationLabel})`;
    const preservedClause =
        intact.length === 0
            ? ''
            : ` Retain ${intact.map((unit) => unit.name).join(', ')} intact.`;
    return {
        targetLabel,
        disturbedIds,
        disturbedCount: disturbedIds.length,
        preservedUnits,
        timing,
        recommendation: `Replace ${targetLabel}.${preservedClause} ${disturbedIds.length} healthy piece(s) disturbed.`
    };
}
