/**
 * Canonical procedure fingerprint (plan 02 §6.5). It covers the geometry
 * identity, the target and member IDs, the ordered physical actions,
 * directions, stroke, tool, physical support requirements, return motion, stop
 * landmark and function check.
 *
 * It deliberately excludes the graph revision, display labels and timing text,
 * so a timing-label edit leaves a bench record valid while any physical change
 * invalidates it.
 */
import { sha256Hex } from './hash.js';
import type { AssemblyModel, Operation } from './schema.js';

function physicalAction(model: AssemblyModel, operationId: string): string {
    const operation = model.operations.find((candidate) => candidate.id === operationId);
    if (operation === undefined) return `missing:${operationId}`;
    const returnMotion =
        operation.returnOperationId === undefined
            ? '-'
            : (model.operations.find((candidate) => candidate.id === operation.returnOperationId)?.id ??
              'dangling');
    const supports = operation.requires
        .filter((requirement) => requirement.role === 'support')
        .map((requirement) => `${requirement.subject.kind}:${requirement.subject.id}=${[...requirement.acceptable].sort().join('+')}`)
        .sort();
    return [
        operation.members.slice().sort().join('+'),
        operation.phase,
        operation.wholeAssembly ? 'whole-assembly' : 'relative',
        operation.unitId ?? '-',
        operation.from.map((a) => `${a.occurrenceId}@${a.poseId}`).sort().join(','),
        operation.to.map((a) => `${a.occurrenceId}@${a.poseId}`).sort().join(','),
        operation.direction.map((value) => value.toFixed(4)).join('/'),
        operation.directionLabel,
        operation.strokeMm.toFixed(3),
        operation.toolId,
        operation.stopLandmark,
        operation.releasesConnectionIds.slice().sort().join(','),
        operation.establishesConnectionIds.slice().sort().join(','),
        supports.join('|') || '-',
        returnMotion
    ].join('~');
}

export function procedureFingerprint(
    model: AssemblyModel,
    targetIds: readonly string[],
    operationIds: readonly string[],
    functionCheckId: string | null
): string {
    const parts = [
        'restart-procedure-v1',
        model.source.datasetRevision,
        `tri=${model.source.triangleCount}`,
        `target=${[...new Set(targetIds)].sort().join(',')}`,
        `actions=${operationIds.map((id) => physicalAction(model, id)).join(';')}`,
        `check=${functionCheckId ?? 'none'}`
    ];
    return sha256Hex(parts.join('#'));
}

/** The physical fields a bench record is bound to, for invalidation diffs. */
export function physicalSignature(model: AssemblyModel, operationIds: readonly string[]): string[] {
    return operationIds.map((operationId) => physicalAction(model, operationId));
}

/**
 * Which physical fields differ between the procedure a bench record witnessed
 * and the procedure the model produces now. An empty list means the physical
 * record survives a graph edit.
 */
export function invalidatingChanges(
    model: AssemblyModel,
    witnessed: readonly string[],
    current: readonly string[]
): string[] {
    const differences: string[] = [];
    const longest = Math.max(witnessed.length, current.length);
    for (let index = 0; index < longest; index += 1) {
        const before = witnessed[index];
        const after = current[index];
        if (before === after) continue;
        differences.push(`step ${index + 1}: ${before ?? '(absent)'} -> ${after ?? '(absent)'}`);
    }
    return differences;
}

export function operationsOf(model: AssemblyModel, operationIds: readonly string[]): Operation[] {
    return operationIds
        .map((id) => model.operations.find((candidate) => candidate.id === id))
        .filter((operation): operation is Operation => operation !== undefined);
}
