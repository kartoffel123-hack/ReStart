/**
 * The mechanic's manual screen (plan 02 §5.1–3 · ticket 4 · V05).
 *
 * One step on screen at a time, laid out the way an instruction sheet reads: a wide grey drawing
 * field that fills most of the height, one large step numeral, the piece called out on its own in
 * a pale inset, and one confirmation control that is the obvious thing to press. The mechanic has
 * to be able to say which piece, which way, and when to stop without asking anyone (plan §5.4),
 * so those three facts are never buried in a tooltip.
 *
 * It renders view models and calls actions. No planner, no graph, no renderer, no fetch.
 */
import type { ReactNode } from 'react';
import type { ManualScreenProps } from './manual-contract.js';
import './manual-screen.css';

export function ManualScreen({ step, actions, scene, partInset }: ManualScreenProps): ReactNode {
    return (
        <main className="rs-manual" data-screen="manual" data-phase={step.phase}>
            <section className="rs-manual__field" aria-label="Assembly view">
                {scene}
                {partInset === undefined || partInset === null ? null : (
                    <aside
                        className="rs-manual__inset"
                        aria-label={`${step.partLabel} on its own`}
                    >
                        <h2 className="rs-manual__inset-title">
                            {step.partLabel} <span className="rs-manual__quantity">{step.quantityLabel}</span>
                        </h2>
                        {partInset}
                    </aside>
                )}
            </section>

            <section className="rs-manual__strip" aria-label="This step">
                <p className="rs-manual__phase">{step.phaseLabel}</p>

                <p className="rs-manual__count">
                    <span className="rs-manual__numeral">{step.ordinal}</span>
                    <span className="rs-manual__total">of {step.total}</span>
                </p>

                <div className="rs-manual__words">
                    <h1 className="rs-manual__heading">{step.heading}</h1>
                    <p className="rs-manual__part">
                        <span className="rs-manual__part-name">{step.partLabel}</span>{' '}
                        <span className="rs-manual__quantity">{step.quantityLabel}</span>
                        <span className="rs-manual__location">{step.locationLabel}</span>
                    </p>
                    <details className="rs-manual__description">
                        <summary>Details</summary>
                        <p className="rs-manual__instruction">{step.instruction}</p>
                        <dl className="rs-manual__facts">
                            <div className="rs-manual__fact">
                                <dt>Which way</dt>
                                <dd>{step.directionLabel}</dd>
                            </div>
                            <div className="rs-manual__fact">
                                <dt>Tool</dt>
                                <dd>{step.toolLabel}</dd>
                            </div>
                            <div className="rs-manual__fact rs-manual__fact--stop">
                                <dt>Stop when</dt>
                                <dd>{step.stopLandmark}</dd>
                            </div>
                        </dl>
                    </details>
                </div>

                {step.blockedReason === null ? null : (
                    <p className="rs-manual__blocked">{step.blockedReason}</p>
                )}

                <div className="rs-manual__controls">
                    <div className="rs-manual__motion-controls">
                        <button
                            type="button"
                            className="rs-manual__replay"
                            aria-label="Replay the motion"
                            title="Replay"
                            onClick={() => actions.replayMotion()}
                        >
                            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                <path d="M3 2v6h6" />
                                <path d="M3.05 8A9 9 0 1 1 5.7 17.8" />
                            </svg>
                        </button>
                        <button
                            type="button"
                            className="rs-manual__replay"
                            aria-label="Previous step"
                            title="Previous step"
                            disabled={!step.canGoBack}
                            onClick={() => actions.goBackOneStep()}
                        >
                            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                <path d="M9 14 4 9l5-5" />
                                <path d="M4 9h9a7 7 0 0 1 7 7v1" />
                            </svg>
                        </button>
                    </div>
                    <button
                        type="button"
                        className="rs-manual__confirm"
                        disabled={!step.canConfirm}
                        onClick={() => actions.confirmStep(step.stepId)}
                    >
                        {step.confirmationLabel}
                    </button>
                    <div className="rs-manual__secondary">
                        {step.isHistorical && (
                            <button type="button" onClick={() => actions.returnToCurrentStep()}>
                                Back to this step
                            </button>
                        )}
                    </div>
                </div>
            </section>
        </main>
    );
}
