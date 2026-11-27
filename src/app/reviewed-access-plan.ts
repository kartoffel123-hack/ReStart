import { z } from 'zod';
import rawPlan from '../../data/review/nauo9-access-plan.json';
import rawNauo80Plan from '../../data/review/nauo80-access-plan.json';
import type { ReviewedDependencyPlan } from '../domain/dependency-tree.js';

const reviewedDependencyPlanSchema = z.object({
    targetId: z.string(),
    actions: z.array(z.object({
        pieceId: z.string(),
        actionKind: z.enum(['remove', 'slide']),
        directionLabel: z.string().optional(),
        restoreDirectionLabel: z.string().optional(),
        blockerPieceId: z.string().optional()
    })),
    disconnectPieceIds: z.array(z.string())
});

export const nauo9AccessPlan = reviewedDependencyPlanSchema.parse(rawPlan) as ReviewedDependencyPlan;
export const nauo80AccessPlan = reviewedDependencyPlanSchema.parse(rawNauo80Plan) as ReviewedDependencyPlan;

const reviewedPlans = new Map([
    [nauo9AccessPlan.targetId, nauo9AccessPlan],
    [nauo80AccessPlan.targetId, nauo80AccessPlan]
]);

export function reviewedAccessPlanFor(targetId: string): ReviewedDependencyPlan | undefined {
    return reviewedPlans.get(targetId);
}
