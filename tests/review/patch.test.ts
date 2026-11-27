import { expect, it } from 'vitest';
import { chainFixture } from '../fixtures/repairs.js';
import { applyReview } from '../../src/domain/review.js';
import type { ReviewPatch } from '../../src/domain/schema.js';

it('applies a blocker only to its named option and refuses a pose on the wrong piece', () => {
    const base = chainFixture();
    const patch: ReviewPatch = {
        schemaVersion: 1, baseDatasetRevision: base.source.datasetRevision, baseGraphRevision: base.graphRevision,
        edits: [{ id: 'draft-1', decision: 'add', targetOperationId: 'pull-A', author: 'local', reason: 'B covers A',
            evidence: { tier: 'generated', source: 'local draft' },
            requirement: { id: 'draft-1', subject: {kind: 'occurrence', id: 'B'}, acceptable: ['B/detached'],
                reason: 'B covers A', role: 'blocker', evidence: { tier: 'generated', source: 'local draft' } } }]
    };
    const result = applyReview(base,patch);
    expect(result.model?.operations.find(o => o.id === 'pull-A')?.requires).toHaveLength(1);
    expect(base.operations.find(o => o.id === 'pull-A')?.requires).toHaveLength(0);
    patch.edits[0]!.requirement!.acceptable = ['A/detached'];
    expect(applyReview(base,patch).model).toBeUndefined();
});
