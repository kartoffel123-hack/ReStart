import { reviewPatchSchema, type AssemblyModel } from './schema.js';
import { sha256Hex } from './hash.js';

export type ReviewResult = { model?: AssemblyModel; issues: string[] };
export function applyReview(base: AssemblyModel, input: unknown): ReviewResult {
    const parsed = reviewPatchSchema.safeParse(input);
    if (!parsed.success) return { issues: parsed.error.issues.map(e => `${e.path.join('.')}: ${e.message}`) };
    const patch = parsed.data;
    if (patch.schemaVersion !== 1 || patch.baseDatasetRevision !== base.source.datasetRevision || patch.baseGraphRevision !== base.graphRevision) {
        return { issues: ['Patch version or base revision does not match this assembly'] };
    }
    const model = structuredClone(base);
    const seen = new Map<string,string>();
    const decisions = new Set<string>();
    for (const edit of patch.edits) {
        const signature = JSON.stringify(edit);
        if (seen.get(edit.id) === signature) continue;
        const invalid = (why: string) => ({ issues: [`${edit.id}: ${why}`] });
        if (seen.has(edit.id) || !edit.id.trim() || !edit.reason.trim()) return invalid('conflicting ID or missing reason');
        seen.set(edit.id, signature);
        const op = model.operations.find(o => o.id === edit.targetOperationId);
        if (!op || edit.operation || edit.motion || edit.alternativeGroup) return invalid('unknown option or unsupported edit');
        const req = edit.requirement;
        if (edit.decision === 'add') {
            if (!req || edit.removesRequirementId || op.requires.some(r => r.id === req.id)) return invalid('missing or conflicting requirement');
            const id = req.subject.id;
            if (req.subject.kind === 'occurrence') {
                const piece = model.occurrences.find(p => p.id === id);
                if (!piece || req.acceptable.some(p => !model.poses.some(s => s.id === p && s.occurrenceId === id))) return invalid('unknown piece or pose on wrong piece');
                if (req.role === 'blocker' && req.acceptable.includes(piece.installedPoseId)) return invalid('clear state must differ from installed');
            } else if (!model.connections.some(c => c.id === id) || req.acceptable.some(p => !['engaged','released'].includes(p))) return invalid('invalid connection state');
            op.requires.push({ ...req, evidence: { tier: 'generated', source: `local-draft:${edit.id}` } });
        } else {
            const key = JSON.stringify([op.id,edit.removesRequirementId]);
            if (req || decisions.has(key) || !op.requires.some(r => r.id === edit.removesRequirementId)) return invalid('unknown or conflicting relation');
            decisions.add(key);
            if (edit.decision === 'reject') op.requires = op.requires.filter(r => r.id !== edit.removesRequirementId);
        }
    }
    if (seen.size) model.graphRevision = sha256Hex(JSON.stringify([base.graphRevision,...seen.values()]));
    return { model, issues: [] };
}
