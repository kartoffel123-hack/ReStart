/**
 * The development-only concept gallery (plan 02 §5.4 · ticket 4).
 *
 * It renders the *production* screen with the *production* props against named fixture states, so
 * what a designer revises here is what the mechanic gets. A gallery that re-implemented the layout
 * would drift from the app and the review would be worth nothing.
 */
import { useState, type ReactNode } from 'react';
import { ManualScreen } from '../presentation/manual-screen.js';
import { toStepViewModel } from '../presentation/manual-contract.js';
import { CONCEPT_SCENARIOS } from './scenarios.js';
import { SchematicScene } from './schematic-scene.js';
import { PartInset } from './part-inset.js';
import './gallery.css';

const noop = (): void => undefined;

export function ConceptGallery(): ReactNode {
    const [scenarioId, setScenarioId] = useState<string>(CONCEPT_SCENARIOS[0]?.id ?? '');
    const scenario = CONCEPT_SCENARIOS.find((entry) => entry.id === scenarioId) ?? CONCEPT_SCENARIOS[0];
    if (scenario === undefined) return null;

    return (
        <div className="rs-gallery" data-screen="concept">
            <header className="rs-gallery__header">
                <h1 className="rs-gallery__title">Concept gallery</h1>
                <p className="rs-gallery__subtitle">
                    Development only. Every card below renders the production <code>ManualScreen</code>{' '}
                    with its real props, so a change here is a change the mechanic sees.
                </p>
            </header>

            <nav className="rs-gallery__scenarios" aria-label="Example states">
                {CONCEPT_SCENARIOS.map((entry) => (
                    <button
                        key={entry.id}
                        type="button"
                        className="rs-gallery__scenario"
                        aria-current={entry.id === scenario.id ? 'true' : undefined}
                        onClick={() => setScenarioId(entry.id)}
                    >
                        <span className="rs-gallery__scenario-label">{entry.label}</span>
                        <span className="rs-gallery__scenario-why">{entry.why}</span>
                    </button>
                ))}
            </nav>

            <div className="rs-gallery__stage">
                <ManualScreen
                    step={toStepViewModel(scenario.step, scenario.total, {
                        canConfirm: scenario.canConfirm,
                        ...(scenario.blockedReason === null ? {} : { blockedReason: scenario.blockedReason })
                    })}
                    actions={{
                        confirmStep: noop,
                        replayMotion: noop,
                        resetCamera: noop,
                        returnToCurrentStep: noop
                    }}
                    scene={
                        <SchematicScene
                            partLabel={scenario.step.partLabel}
                            directionLabel={scenario.step.directionLabel}
                            heading="right"
                            {...(scenario.obstruction === null ? {} : { obstruction: scenario.obstruction })}
                        />
                    }
                    partInset={<PartInset label={scenario.step.partLabel} />}
                />
            </div>
        </div>
    );
}
