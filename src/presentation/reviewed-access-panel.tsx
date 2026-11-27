import type { DependencyPlanStep, RemovalReassemblyPlan } from '../domain/dependency-tree.js';

function actionLabel(step: DependencyPlanStep, restoring: boolean) {
    if (step.actionKind === 'slide') return 'Slide';
    if (!restoring) return 'Remove';
    return step.isTarget ? 'Fit replacement' : 'Refit';
}

export function ReviewedAccessPanel({ plan }: { plan: RemovalReassemblyPlan }) {
    return (
        <section aria-labelledby="reviewed-access-heading">
            <h3 id="reviewed-access-heading">Reviewed access plan</h3>
            <p>This proposed order has not been replayed or physically verified.</p>
            {(['Disassembly', 'Restoration'] as const).map(phase => {
                const restoring = phase === 'Restoration';
                const steps = restoring ? plan.reassemblyOrder : plan.removalOrder;
                return <div key={phase}>
                    <h4>{phase}</h4>
                    <ol aria-label={phase}>
                        {steps.map(step => <li key={step.pieceId}>
                            {actionLabel(step, restoring)} {step.commonName} (<code>{step.pieceId.split('/').at(-1)}</code>)
                            {step.directionLabel && ` · ${step.directionLabel}`}
                        </li>)}
                    </ol>
                </div>;
            })}
        </section>
    );
}
