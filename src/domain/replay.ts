/**
 * Independent replay (plan 02 §3B, verification V04). Re-derives the assembly
 * state from the installed baseline by walking the operation list, then checks
 * the terminal pose and connection diff. A cached planner "clear" flag is a
 * subject of this test, never an input to it.
 */
import {
    applyOperation,
    indexModel,
    initialState,
    isGoal,
    stateKey,
    type AssemblyState
} from './state.js';
import type { AssemblyModel, PoseAssignment, ReplayReport, Repair } from './schema.js';

export type StepTrace = Readonly<{
    state: AssemblyState;
    poseDiff: readonly PoseAssignment[];
    engagedConnectionIds: readonly string[];
}>;

export type WalkResult = Readonly<{
    state: AssemblyState;
    traces: readonly StepTrace[];
    issues: readonly string[];
}>;

/** Walk an operation list from the installed state without consulting a plan. */
export function walk(model: AssemblyModel, operationIds: readonly string[], targetIds: readonly string[]): WalkResult {
    const index = indexModel(model);
    let state = initialState(model, targetIds);
    const traces: StepTrace[] = [];
    const issues: string[] = [];

    for (const [position, operationId] of operationIds.entries()) {
        const operation = index.operations.get(operationId);
        if (operation === undefined) {
            issues.push(`step ${position + 1}: unknown operation ${operationId}`);
            continue;
        }
        const before = state;
        const applied = applyOperation(model, before, operation, targetIds);
        if (applied.issues.length > 0) {
            for (const issue of applied.issues) issues.push(`step ${position + 1}: ${issue.message}`);
            continue;
        }
        state = applied.state;
        const poseDiff = operation.to.filter(
            (assignment) => before.poses[assignment.occurrenceId] !== assignment.poseId
        );
        traces.push({
            state,
            poseDiff,
            engagedConnectionIds: Object.keys(state.engagement)
                .filter((id) => state.engagement[id] === 'engaged')
                .sort()
        });
    }

    return { state, traces, issues };
}

/** The exact terminal diff a released repair has to account for. */
export function terminalDiff(model: AssemblyModel, state: AssemblyState, targetIds: readonly string[]): string[] {
    const index = indexModel(model);
    const differences: string[] = [];
    for (const pieceId of index.pieceIds) {
        const installed = index.installedPoseOf.get(pieceId);
        if (state.poses[pieceId] !== installed) {
            differences.push(`${pieceId} ends in ${state.poses[pieceId] ?? '(absent)'} not ${installed}`);
        }
    }
    for (const connection of model.connections) {
        const want = connection.installedEngaged ? 'engaged' : 'released';
        if (state.engagement[connection.id] !== want) {
            differences.push(`connection ${connection.id} ends ${state.engagement[connection.id]} not ${want}`);
        }
    }
    for (const targetId of targetIds) {
        if (state.fitted[targetId] !== 'replacement') {
            differences.push(`target ${targetId} still holds ${state.fitted[targetId] ?? 'nothing'}`);
        }
    }
    if (state.outstandingReturns.length > 0) {
        differences.push(`unrestored returns: ${state.outstandingReturns.join(', ')}`);
    }
    return differences;
}

export function replay(model: AssemblyModel, repair: Repair): ReplayReport {
    const walkResult = walk(model, repair.operationIds, repair.targetIds);
    const issues = [...walkResult.issues];
    const differences = terminalDiff(model, walkResult.state, repair.targetIds);
    for (const difference of differences) issues.push(`terminal: ${difference}`);

    const disturbed = disturbedFromWalk(model, repair);
    if(repair.disturbedCount!==disturbed.length) issues.push(`disturbance count ${repair.disturbedCount} does not match trace ${disturbed.length}`);
    const check=repair.functionCheckId===null ? undefined : model.functionChecks.find(c=>c.id===repair.functionCheckId);
    if(repair.functionCheckId!==null && !check) issues.push('Unknown function check');
    const expectedSteps=[...repair.operationIds,...(check?[`check:${check.id}`]:[])];
    if(repair.steps.length!==expectedSteps.length || repair.steps.some((s,i)=>s.ordinal!==i+1 || s.operationId!==expectedSteps[i]) || new Set(repair.steps.map(s=>s.stepId)).size!==repair.steps.length) issues.push('Displayed step sequence disagrees with operation trace');
    if(check && (repair.steps.at(-1)?.phase!=='check' || repair.steps.at(-1)?.instruction!==`${check.instruction} Expect ${check.expectedBehaviour}.`)) issues.push('Displayed function check disagrees with bound check');
    for(const [i,id] of repair.operationIds.entries()) {
        const op=model.operations.find(o=>o.id===id),step=repair.steps[i];
        if(!op || !step) continue;
        if(step.phase!==op.phase || step.stopLandmark!==op.stopLandmark || step.directionLabel!==op.directionLabel ||
            step.instruction!==`${op.directionLabel} until ${op.stopLandmark}.` || step.toolLabel!==(model.tools.find(t=>t.id===op.toolId)?.name ?? op.toolId)) issues.push(`step ${i+1}: operator instruction differs from the modeled action`);
    }
    for (const id of disturbed) {
        if (!repair.disturbedIds.includes(id)) issues.push(`disturbed set omits ${id}`);
    }
    for (const id of repair.disturbedIds) {
        if (!disturbed.includes(id)) issues.push(`disturbed set claims ${id}, the trace does not move it`);
    }

    const seen = new Set<string>();
    const duplicateKeys: string[] = [];
    for (const trace of walkResult.traces) {
        const key = stateKey(trace.state);
        if (seen.has(key)) duplicateKeys.push(key.slice(0, 48));
        seen.add(key);
    }
    if (duplicateKeys.length > 0 && !isGoal(model, walkResult.state, repair.targetIds)) {
        issues.push(`trace revisits ${duplicateKeys.length} state(s) without finishing`);
    }

    return {
        ok: issues.length === 0,
        steps: walkResult.traces.map((trace, position) => ({
            stepId: repair.steps[position]?.stepId ?? `step-${position + 1}`,
            operationId: repair.operationIds[position] ?? 'unknown',
            poseDiff: [...trace.poseDiff],
            engagedConnectionIds: [...trace.engagedConnectionIds],
            issues: []
        })),
        issues
    };
}

function disturbedFromWalk(model: AssemblyModel, repair: Repair): string[] {
    const targets = new Set(repair.targetIds);
    const disturbed = new Set<string>();
    for (const operationId of repair.operationIds) {
        const operation = model.operations.find((candidate) => candidate.id === operationId);
        if (operation === undefined || operation.wholeAssembly) continue;
        for (const member of operation.members) if (!targets.has(member)) disturbed.add(member);
    }
    return [...disturbed].sort();
}
