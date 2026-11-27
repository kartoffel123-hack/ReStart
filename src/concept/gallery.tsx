/**
 * The development-only concept gallery (plan 02 §5.4 · ticket 4).
 *
 * It renders the *production* screen with the *production* props against named fixture states, so
 * what a designer revises here is what the mechanic gets. A gallery that re-implemented the layout
 * would drift from the app and the review would be worth nothing.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { ManualScreen } from '../presentation/manual-screen.js';
import { toStepViewModel } from '../presentation/manual-contract.js';
import { CONCEPT_SCENARIOS } from './scenarios.js';
import { resolveScenarioId, writeStateParam } from './gallery-state.js';
import { SchematicScene } from './schematic-scene.js';
import { PartInset } from './part-inset.js';
import './gallery.css';

const noop = (): void => undefined;

export function ConceptGallery(): ReactNode {
    // The state comes from the address, so a capture or a review link can name the one it wants
    // instead of always getting the first card (plan §8.6).
    const [scenarioId, setScenarioId] = useState<string>(() =>
        resolveScenarioId(window.location.hash, CONCEPT_SCENARIOS)
    );
    const scenario = CONCEPT_SCENARIOS.find((entry) => entry.id === scenarioId) ?? CONCEPT_SCENARIOS[0];
    useEffect(()=>{
        const follow=()=>setScenarioId(resolveScenarioId(window.location.hash,CONCEPT_SCENARIOS));
        window.addEventListener('hashchange',follow);
        return ()=>window.removeEventListener('hashchange',follow);
    },[]);
    if (scenario === undefined) return null;

    const choose = (id: string): void => {
        setScenarioId(id);
        // replaceState rather than assigning location.hash: writing the hash fires `hashchange`,
        // which would send the host through routing again for a choice that stays inside the
        // gallery. The address still records what is on screen, which is what a link needs.
        window.history.replaceState(null, '', writeStateParam(window.location.hash, id));
    };

    return (
        <div className="rs-gallery" data-screen="concept" data-scenario={scenario.id}>
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
                        onClick={() => choose(entry.id)}
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
