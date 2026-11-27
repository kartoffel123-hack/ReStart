import { useEffect, useMemo, useState } from 'react';
import type { AssemblyModel } from '../domain/schema.js';
import { confirmScavangerTurn, decideScavangerPiece, scavangerChoices, scavangerDependencyGraph, startScavanger, type ScavangerRun } from '../domain/scavanger.js';
import { loadPackage } from './package-loader.js';
import { pilotBase } from './pilot-data.js';
import { exportJson } from './export-json.js';
import { StudScene } from '../scene/stud-scene.js';
import type { Vec3 } from '../domain/schema.js';
import '../presentation/scavanger.css';

const ZERO: Vec3 = [0, 0, 0];

export function ScavangerScreen() {
    const [model, setModel] = useState<AssemblyModel>();
    const [geometryUrl, setGeometryUrl] = useState('');
    const [run, setRun] = useState<ScavangerRun>();
    const [hoveredPiece, setHoveredPiece] = useState<string | null>(null);
    const [error, setError] = useState('');
    useEffect(() => {
        const abort = new AbortController();
        let geometryUrl: string | undefined;
        loadPackage(pilotBase, abort.signal).then((bundle) => {
            geometryUrl = URL.createObjectURL(bundle.geometry);
            setGeometryUrl(geometryUrl);
            setModel(bundle.model);
            setRun(startScavanger(bundle.model));
        }).catch((err: unknown) => {
            if (!abort.signal.aborted) setError(String(err));
        });
        return () => { abort.abort(); if (geometryUrl) URL.revokeObjectURL(geometryUrl); };
    }, []);
    useEffect(() => {
        if (!model || !run || run.finished) return;
        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.altKey || event.ctrlKey || event.metaKey) return;
            const key = event.key.toLowerCase();
            const target = event.target;
            if (target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;
            if (run.awaitingTurnConfirmation && (key === ' ' || key === 'spacebar')) {
                event.preventDefault();
                setRun((current) => current ? confirmScavangerTurn(model, current) : current);
                return;
            }
            if (!run.currentPieceId || (key !== 'a' && key !== 'f')) return;
            event.preventDefault();
            setRun((current) => current?.currentPieceId
                ? decideScavangerPiece(model, current, current.currentPieceId, key === 'a' ? 'remove' : 'keep')
                : current);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [model, run?.currentPieceId, run?.awaitingTurnConfirmation, run?.finished]);

    const choices = useMemo(() => model && run ? scavangerChoices(model, run) : [], [model, run]);
    const names = useMemo(() => new Map(model?.occurrences.map((piece) => [piece.id, piece.commonName]) ?? []), [model]);
    if (!model || !run) return <main className="scavanger"><header><a href="#/">Mechanic manual</a><h1>Scavanger</h1></header><p role="status">{error || 'Loading assembly…'}</p></main>;

    const removed = new Set(run.removedIds);
    const finished = run.finished;
    const availableIds = new Set(choices.map((piece) => piece.id));
    const currentPiece = run.currentPieceId ? model.occurrences.find((piece) => piece.id === run.currentPieceId) : undefined;
    const pendingRemoved = new Set(run.pendingRemovedIds);
    const connectedHighlights = new Set<string>();
    if (hoveredPiece && availableIds.has(hoveredPiece)) {
        connectedHighlights.add(hoveredPiece);
        for (const connection of model.connections) {
            if (connection.a === hoveredPiece && availableIds.has(connection.b)) connectedHighlights.add(connection.b);
            if (connection.b === hoveredPiece && availableIds.has(connection.a)) connectedHighlights.add(connection.a);
        }
    }
    const sceneColors = new Map<string, string>();
    for (const piece of model.occurrences) {
        if (piece.kind !== 'piece') continue;
        if (pendingRemoved.has(piece.id) || piece.id === run.currentPieceId) sceneColors.set(piece.id, '#c81e1e');
        else if (availableIds.has(piece.id)) sceneColors.set(piece.id, '#f5c518');
        else if (removed.has(piece.id)) sceneColors.set(piece.id, '#a5aaab');
    }
    const sceneTarget = run.currentPieceId
        ?? model.occurrences.find((piece) => piece.kind === 'piece' && availableIds.has(piece.id))?.id
        ?? model.occurrences.find((piece) => piece.kind === 'piece')?.id ?? '';
    const selectPiece = (pieceId: string): void => {
        if (availableIds.has(pieceId)) setHoveredPiece(pieceId);
    };
    return <main className="scavanger" data-route="scavanger">
        <header className="scavanger__header">
            <div><a href="#/">Mechanic manual</a><h1>Scavanger</h1><p>Build a dependency picture, turn by turn.</p></div>
            <nav><a href="#/review">Repair reviewer</a><a href="#/graph">Dependency graph</a></nav>
        </header>
        <section className="scavanger__layout">
            <div className="scavanger__left">
                <div className="scavanger__play">
                    <div className="scavanger__turn"><span>Turn {Math.min(run.turns.length + 1, model.occurrences.filter((piece) => piece.kind === 'piece').length)}</span><strong>{removed.size} removed · {choices.length} remain</strong></div>
                    <h2>{finished ? (run.retainedIds.length ? 'No more pieces to remove' : 'All pieces cleared') : run.awaitingTurnConfirmation ? 'Review this turn' : 'Can this piece be removed now?'}</h2>
                    {!finished && currentPiece && <>
                        <p className="scavanger__progress">Component {run.decidedIds.length + 1} of {run.cyclePieceIds.length} in this turn</p>
                        <div className="scavanger__candidate" onMouseEnter={() => setHoveredPiece(currentPiece.id)} onMouseLeave={() => setHoveredPiece(null)}>
                            <strong>{currentPiece.commonName}</strong>
                            <span>{currentPiece.locationLabel}</span>
                            <code>{currentPiece.id}</code>
                        </div>
                        <p>Use the buttons or keyboard: <kbd>A</kbd> remove · <kbd>F</kbd> keep for now.</p>
                        <div className="scavanger__decision">
                            <button type="button" className="scavanger__remove" onClick={() => setRun((current) => current
                                ? decideScavangerPiece(model, current, currentPiece.id, 'remove') : current)}>
                                Remove <kbd>A</kbd>
                            </button>
                            <button type="button" className="scavanger__keep" onClick={() => setRun((current) => current
                                ? decideScavangerPiece(model, current, currentPiece.id, 'keep') : current)}>
                                Keep for now <kbd>F</kbd>
                            </button>
                        </div>
                    </>}
                    {run.awaitingTurnConfirmation && <>
                        <p className="scavanger__progress">{run.pendingRemovedIds.length} marked for removal · {run.cyclePieceIds.length - run.pendingRemovedIds.length} kept this turn</p>
                        <p>Confirm the turn to remove the marked components from the viewport and continue.</p>
                        <button type="button" className="scavanger__confirm" onClick={() =>
                            setRun((current) => current ? confirmScavangerTurn(model, current) : current)
                        }>Confirm turn <kbd>Space</kbd></button>
                    </>}
                    <button className="scavanger__reset" onClick={() => setRun(startScavanger(model))}>Start over</button>
                    <p role="status">{run.error ?? (finished ? `Run complete. ${run.removedIds.length} removed; ${run.retainedIds.length} retained.` : '')}</p>
                </div>
                <aside className="scavanger__evidence">
                    <h2>Turn history</h2>
                    <ol>{run.turns.map((turn, index) => <li key={index}>Turn {index + 1}: {turn.map((id) => names.get(id) ?? id).join(', ')}</li>)}</ol>
                    <h2>Dependency graph</h2>
                    <p>Turn-order candidates from your decisions. They are not verified blockers.</p>
                    <p>{run.edges.length} candidate links · {run.turns.length} removal turns</p>
                    {finished && <>
                        <p className="scavanger__done">{run.removedIds.length} pieces removed; {run.retainedIds.length} remain in the assembly.</p>
                        <button className="scavanger__confirm" type="button" onClick={() =>
                            exportJson('scavanger-dependency-graph.json', scavangerDependencyGraph(model, run))
                        }>Save dependency graph</button>
                    </>}
                </aside>
            </div>
            <section className="scavanger__model" aria-label="Assembly model">
                <h2>Helicopter · 3D view</h2>
                <p>{currentPiece ? `Current component: ${currentPiece.commonName}. Use A to remove or F to keep.` : run.awaitingTurnConfirmation ? 'Turn is ready for confirmation.' : 'Turn decisions complete.'}</p>
                <div className="scavanger__scene" aria-label="Interactive 3D assembly. All pieces still assembled are selectable.">
                    {geometryUrl && <StudScene url={geometryUrl} target={sceneTarget} start={ZERO} end={ZERO} focus={false}
                        replay={0} reset={0} colors={sceneColors} hiddenIds={removed} highlight={hoveredPiece ?? run.currentPieceId ?? ''}
                        highlightIds={connectedHighlights} onHover={setHoveredPiece} idleAutoRotate={false}
                        onPick={selectPiece} />}
                </div>
                <p className="scavanger__legend"><span className="scavanger__swatch scavanger__swatch--available" />Still assembled
                    <span className="scavanger__swatch scavanger__swatch--selected" />Selected
                    <span className="scavanger__swatch scavanger__swatch--removed" />Moved</p>
            </section>
        </section>
    </main>;
}
