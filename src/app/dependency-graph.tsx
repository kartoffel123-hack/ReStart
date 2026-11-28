import { useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import {
    buildDependencyTree,
    type MotionCandidateSummary,
    type ReviewedDependencyPlan
} from '../domain/dependency-tree.js';
import {
    connectionDofCatalogSchema,
    formatAxisLabel,
    type ConnectionDofCatalog
} from '../domain/dof.js';
import type { AssemblyModel, Repair, Vec3 } from '../domain/schema.js';
import nauo9AccessPlanRaw from '../../data/review/nauo9-access-plan.json';
import {
    DependencyTreeDiagram,
    type TreeDirection
} from '../graph-view/dependency-tree-diagram.js';
import { StudScene } from '../scene/stud-scene.js';
import { exportJson } from './export-json.js';
import { crossBlockOverview } from './cross-block-overview.js';
import { loadPackage } from './package-loader.js';
import type { PilotData } from './pilot-data.js';
import { useDataset } from './dataset.js';
import '../presentation/dependency-graph.css';

const ZERO: Vec3 = [0, 0, 0];

const reviewedDependencyPlanSchema = z.object({
    targetId: z.string(),
    actions: z.array(
        z.object({
            pieceId: z.string(),
            actionKind: z.enum(['remove', 'slide']),
            directionLabel: z.string().optional(),
            restoreDirectionLabel: z.string().optional(),
            blockerPieceId: z.string().optional()
        })
    ),
    disconnectPieceIds: z.array(z.string())
});
const nauo9AccessPlan = reviewedDependencyPlanSchema.parse(nauo9AccessPlanRaw) as ReviewedDependencyPlan;

const candidateSchema = z.array(
    z.object({
        id: z.string(),
        piece: z.string(),
        axis: z.array(z.number()),
        proposedStrokeMm: z.number(),
        alignedJoints: z.array(z.string()).optional(),
        transverseJoints: z.array(z.string()),
        exitAssessment: z.array(z.string()).nullable().optional(),
        contacts: z.array(
            z.object({
                obstacle: z.string(),
                witness: z.object({ fromMm: z.number(), toMm: z.number() }).nullable()
            })
        )
    })
);

function readRequestedPiece(): string | null {
    const query = window.location.hash.split('?')[1];
    if (!query) return null;
    return new URLSearchParams(query).get('piece');
}

export function DependencyGraphScreen() {
    const dataset = useDataset();
    const [model, setModel] = useState<AssemblyModel>();
    const [pilot, setPilot] = useState<PilotData>();
    const [geometryUrl, setGeometryUrl] = useState('');
    const [candidates, setCandidates] = useState<MotionCandidateSummary[]>([]);
    const [dofCatalog, setDofCatalog] = useState<ConnectionDofCatalog>();
    const [error, setError] = useState('');

    const [rootId, setRootId] = useState('');
    const [inspectedId, setInspectedId] = useState('');
    const [query, setQuery] = useState('');
    const [onlyModeled, setOnlyModeled] = useState(false);
    const [panel, setPanel] = useState<'parts' | 'overview' | 'details'>('overview');
    const overviewButton = useRef<HTMLButtonElement>(null);
    const [explode, setExplode] = useState(0);

    const [includeRequires, setIncludeRequires] = useState(true);
    const [includeCandidates, setIncludeCandidates] = useState(true);
    const [preserveIntactUnits, setPreserveIntactUnits] = useState(true);
    const [includeConnected, setIncludeConnected] = useState(false);
    const [includeContains, setIncludeContains] = useState(false);
    const [direction, setDirection] = useState<TreeDirection>('TB');
    const [maxDepth, setMaxDepth] = useState(8);
    const [exploreAll, setExploreAll] = useState(false);

    useEffect(() => {
        const abort = new AbortController();
        let url: string | undefined;
        loadPackage(dataset.base, abort.signal)
            .then(bundle => {
                const rawDof = bundle.dof;
                if (abort.signal.aborted) return;
                const parsedCandidates = candidateSchema.parse(bundle.candidates);
                const parsedDof = rawDof ? connectionDofCatalogSchema.parse(rawDof) : undefined;
                const requested = readRequestedPiece();
                const initialId =
                    requested && bundle.model.occurrences.some((o) => o.id === requested)
                        ? requested
                        : bundle.pilot.target;

                url = URL.createObjectURL(bundle.geometry);
                setGeometryUrl(url);
                setModel(bundle.model);
                setPilot(bundle.pilot);
                setCandidates(parsedCandidates);
                setDofCatalog(parsedDof);
                setRootId(initialId);
                setInspectedId(initialId);
            })
            .catch((err) => {
                if (!abort.signal.aborted) setError(String(err));
            });

        return () => {
            abort.abort();
            if (url) URL.revokeObjectURL(url);
        };
    }, [dataset.base]);

    const repairsByTarget = useMemo(() => {
        const map = new Map<string, Repair>();
        if (!pilot) return map;
        for (const repair of [pilot.repair, ...pilot.alternatives]) {
            const targetId = repair.targetIds[0];
            if (targetId) map.set(targetId, repair);
        }
        return map;
    }, [pilot]);

    const pieces = useMemo(() => {
        if (!model) return [];
        const inventoryById = new Map(pilot?.inventory.map((item) => [item.id, item]) ?? []);
        const needle = query.trim().toLowerCase();

        return model.occurrences
            .filter((occ) => occ.kind === 'piece')
            .filter((occ) => !onlyModeled || repairsByTarget.has(occ.id))
            .filter((occ) => {
                if (!needle) return true;
                const inv = inventoryById.get(occ.id);
                return [occ.commonName, occ.id, occ.definitionName, inv?.elementId ?? '', inv?.color ?? '']
                    .join(' ')
                    .toLowerCase()
                    .includes(needle);
            });
    }, [model, pilot, query, onlyModeled, repairsByTarget]);

    const activeRepair = repairsByTarget.get(rootId);
    const overview = useMemo(() => crossBlockOverview(model, activeRepair), [model, activeRepair]);
    const compact = !!overview && !exploreAll;

    const tree = useMemo(() => {
        if (!model || !rootId) return undefined;
        return buildDependencyTree(model, rootId, {
            includeRequires,
            includeCandidates,
            preserveIntactUnits,
            includeConnected,
            includeContains,
            maxDepth,
            repair: activeRepair,
            candidates,
            dofCatalog,
            reviewedPlan: dataset.id === '30465' ? nauo9AccessPlan : undefined
        });
    }, [
        model,
        rootId,
        includeRequires,
        includeCandidates,
        preserveIntactUnits,
        includeConnected,
        includeContains,
        maxDepth,
        activeRepair,
        candidates,
        dofCatalog
    ]);

    const sceneColors = useMemo(() => {
        const map = new Map<string, string>();
        if (!model || !tree) return map;
        const releasedSet = new Set(compact ? activeRepair?.disturbedIds : tree.plan.releasedPieceIds);
        const indirectRemovalSet = new Set(
            tree.nodes.filter((node) => node.isIndirectRemoval).map((node) => node.id)
        );
        for (const occ of model.occurrences) {
            if (occ.kind !== 'piece') continue;
            if (occ.id === tree.rootId) {
                map.set(occ.id, '#c81e1e'); // Rot: gesuchtes Bauteil
            } else if (releasedSet.has(occ.id)) {
                map.set(
                    occ.id,
                    !compact && indirectRemovalSet.has(occ.id) ? '#fff0ae' : '#f5c518'
                ); // Helles Gelb: indirekt nötiges Zusatzteil; Gelb: direkt bewegt
            } else {
                map.set(occ.id, '#1f9d55'); // Grün: nicht einzeln gelöst (bleibt zusammen)
            }
        }
        return map;
    }, [model, tree, compact, activeRepair]);

    if (!model || !pilot || !tree) {
        return (
            <main className="rs-graph-page" data-route="graph">
                <header className="rs-graph-header">
                    <div className="rs-graph-header__title">
                        <h1>Dependency Graph</h1>
                    </div>
                    <nav className="rs-graph-header__nav">
                        <a href="#/">Mechanic manual</a>
                        <a href="#/review">Repair reviewer</a>
                    </nav>
                </header>
                <p style={{ padding: 20 }}>{error || 'Loading assembly graph…'}</p>
            </main>
        );
    }

    const inspectedOcc =
        model.occurrences.find((o) => o.id === inspectedId) ??
        model.occurrences.find((o) => o.id === rootId)!;
    const inspectedNode = tree.nodes.find((n) => n.id === inspectedOcc.id);
    const inspectedConnections = model.connections.filter(
        (c) => c.a === inspectedOcc.id || c.b === inspectedOcc.id
    );
    const inspectedDofPiece = dofCatalog?.pieces.find((p) => p.pieceId === inspectedOcc.id);
    const inspectedDofConnections =
        dofCatalog?.connections.filter(
            (c) => c.pieces[0] === inspectedOcc.id || c.pieces[1] === inspectedOcc.id
        ) ?? [];
    const inspectedCandidates = candidates.filter((c) => c.piece === inspectedOcc.id);

    const selectRoot = (pieceId: string): void => {
        setExploreAll(false);
        setRootId(pieceId);
        setInspectedId(pieceId);
        if (panel !== 'overview') overviewButton.current?.focus();
        setPanel('overview');
    };
    const indirectRemovalCount = tree.nodes.filter((node) => node.isIndirectRemoval).length;
    const directRemovalCount = Math.max(0, tree.plan.releasedPieceIds.length - indirectRemovalCount);

    return (
        <main className="rs-graph-page" data-route="graph">
            <header className="rs-graph-header">
                <div className="rs-graph-header__title">
                    <h1>Dependency Graph · {dataset.id}</h1>
                    <span className="rs-graph-header__sub">
                        Zielteil: {tree.nodes.find((node) => node.id === rootId)?.commonName}{' '}
                        <code>{rootId.split('/').at(-1)}</code>
                    </span>
                </div>
                <details className="rs-graph-menu">
                    <summary>Menü</summary>
                    <nav className="rs-graph-header__nav">
                        <a href="#/">Mechanic manual</a>
                        <a href="#/dof">DOF &amp; Zeiten (Tabelle)</a>
                        <a href={`#/review?piece=${encodeURIComponent(rootId)}`}>Repair reviewer</a>
                        <button
                            type="button"
                            onClick={() =>
                                exportJson(`dependency-tree-${rootId.split('/').at(-1)}.json`, {
                                    rootId,
                                    graphRevision: model.graphRevision,
                                    datasetRevision: model.source.datasetRevision,
                                    tree,
                                    manual: activeRepair ?? null
                                })
                            }
                        >
                            Export tree + plan JSON
                        </button>
                        {dofCatalog && (
                            <button type="button" onClick={() => exportJson('connection-dof.json', dofCatalog)}>
                                Export DOF JSON
                            </button>
                        )}
                    </nav>
                </details>
            </header>

            <nav className="rs-graph-panels" aria-label="Arbeitsbereich">
                <button type="button" aria-pressed={panel === 'parts'} onClick={() => setPanel('parts')}>Teile</button>
                <button type="button" ref={overviewButton} aria-pressed={panel === 'overview'} onClick={() => setPanel('overview')}>Graph &amp; 3D</button>
                <button type="button" aria-pressed={panel === 'details'} onClick={() => setPanel('details')}>Details</button>
            </nav>
            <div className="rs-graph-workspace" data-panel={panel}>
                <aside className="rs-graph-sidebar">
                    <h2>Teile ({pieces.length} / 70)</h2>
                    <input
                        className="rs-graph-search"
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Teil, Element-ID oder Usage-ID suchen…"
                        aria-label="Teile durchsuchen"
                    />

                    <details className="rs-graph-options rs-graph-filters">
                        <summary>Filter &amp; Baumoptionen</summary>
                        <label>
                            <input
                                type="checkbox"
                                checked={onlyModeled}
                                onChange={(e) => setOnlyModeled(e.target.checked)}
                            />
                            Nur Teile mit Reparatur-Anleitung ({repairsByTarget.size})
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                checked={preserveIntactUnits}
                                onChange={(e) => setPreserveIntactUnits(e.target.checked)}
                            />
                            Intakte Baugruppen zusammenlassen (nur Verbindungen lösen)
                        </label>
                        <hr style={{ width: '100%', border: 0, borderTop: '1px solid #d5dade', margin: '4px 0' }} />
                        <label>
                            <input
                                type="checkbox"
                                checked={includeRequires}
                                onChange={(e) => setIncludeRequires(e.target.checked)}
                            />
                            requires (Demontage-Abhängigkeiten)
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                checked={includeCandidates}
                                onChange={(e) => setIncludeCandidates(e.target.checked)}
                            />
                            candidate-blocker (Geometrie-Kandidaten)
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                checked={includeConnected}
                                onChange={(e) => setIncludeConnected(e.target.checked)}
                            />
                            connected-to (Steck-/Achs-Verbindungen)
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                checked={includeContains}
                                onChange={(e) => setIncludeContains(e.target.checked)}
                            />
                            contains (Baugruppen-Hierarchie)
                        </label>
                        <div className="rs-graph-filter-row">
                            <span>Ausrichtung</span>
                            <select
                                value={direction}
                                onChange={(e) => setDirection(e.target.value as TreeDirection)}
                                aria-label="Baum-Ausrichtung"
                            >
                                <option value="TB">Baum (Oben → Unten)</option>
                                <option value="LR">Baum (Links → Rechts)</option>
                            </select>
                        </div>
                        <div className="rs-graph-filter-row">
                            <span>Max. Tiefe: {maxDepth}</span>
                            <input
                                type="range"
                                min={1}
                                max={12}
                                value={maxDepth}
                                onChange={(e) => setMaxDepth(Number(e.target.value))}
                                aria-label="Maximale Baumtiefe"
                            />
                        </div>
                    </details>

                    <ul className="rs-graph-piece-list" aria-label="Liste aller Teile">
                        {pieces.map((piece) => {
                            const hasManual = repairsByTarget.has(piece.id);
                            const shortId = piece.id.split('/').at(-1) ?? piece.id;
                            return (
                                <li key={piece.id}>
                                    <button
                                        type="button"
                                        aria-pressed={piece.id === rootId}
                                        className={`rs-graph-piece-btn ${
                                            piece.id === rootId ? 'rs-graph-piece-btn--selected' : ''
                                        }`}
                                        onClick={() => selectRoot(piece.id)}
                                    >
                                        <span>{piece.commonName}</span>
                                        <span className="rs-graph-piece-btn__sub">
                                            <code>{shortId}</code>
                                            <span
                                                className={`rs-graph-badge ${
                                                    hasManual
                                                        ? 'rs-graph-badge--modeled'
                                                        : 'rs-graph-badge--candidate'
                                                }`}
                                            >
                                                {hasManual ? 'Anleitung' : 'Kandidat'}
                                            </span>
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                    {pieces.length === 0 && <p role="status">Keine passenden Teile. Suche oder Filter ändern.</p>}
                </aside>

                <section className="rs-graph-center">
                    <div className="rs-graph-statsbar">
                        {overview && <div className="rs-graph-modes" role="group" aria-label="Graphansicht">
                            <button type="button" aria-pressed={compact} onClick={() => setExploreAll(false)}>Diese Reparatur</button>
                            <button type="button" aria-pressed={!compact} onClick={() => setExploreAll(true)}>Alle Abhängigkeiten</button>
                        </div>}
                        {!compact && <>
                        <div>
                            <strong>{tree.plan.releasedConnections.length}</strong> Verbindungen lösen ·{' '}
                            {tree.plan.removalOrder.some((step) => step.actionKind === 'slide') ? (
                                <>
                                    <strong>
                                        {tree.plan.removalOrder.filter(
                                            (step) => !step.isTarget && step.actionKind !== 'slide'
                                        ).length}
                                    </strong>{' '}
                                    Teile ausbauen ·{' '}
                                    <strong>
                                        {tree.plan.removalOrder.filter(
                                            (step) => step.actionKind === 'slide'
                                        ).length}
                                    </strong>{' '}
                                    verschieben ·{' '}
                                </>
                            ) : (
                                <>
                                    <strong>{tree.plan.releasedPieceIds.length}</strong> Bauteile einzeln lösen ·{' '}
                                </>
                            )}
                            <strong>{tree.plan.intactUnits.length}</strong> intakte Baugruppen
                        </div>
                        <button className="rs-graph-legend-trigger" type="button" popoverTarget="graph-relations">Kantenlegende</button>
                        <div id="graph-relations" popover="auto" aria-label="Kantenlegende">
                            <strong>Kantenlegende</strong>
                            <span className="rs-graph-legend__item">
                                <span className="rs-graph-swatch rs-graph-swatch--requires" />
                                requires ({tree.stats.byRelation.requires})
                            </span>
                            <span className="rs-graph-legend__item">
                                <span className="rs-graph-swatch rs-graph-swatch--candidate" />
                                DOF/Verbindung ({tree.stats.byRelation['candidate-blocker']})
                            </span>
                            <span className="rs-graph-legend__item">
                                <span className="rs-graph-swatch rs-graph-swatch--connected" />
                                connected ({tree.stats.byRelation['connected-to']})
                            </span>
                            <span className="rs-graph-legend__item">
                                <span className="rs-graph-swatch rs-graph-swatch--unit-interface" />
                                Baugruppen-Grenze ({tree.stats.byRelation['unit-interface']})
                            </span>
                            <span className="rs-graph-legend__item">
                                <span className="rs-graph-swatch rs-graph-swatch--spatial-blocker" />
                                räumliche Blockade ({tree.stats.byRelation['spatial-blocker']})
                            </span>
                            <span className="rs-graph-legend__item">
                                <span className="rs-graph-swatch rs-graph-swatch--connection-release" />
                                Verbindung lösen ({tree.stats.byRelation['connection-release']})
                            </span>
                            <button type="button" popoverTarget="graph-relations" popoverTargetAction="hide">Schließen</button>
                        </div>
                        </>}
                    </div>

                    {compact && overview ? <section className="rs-graph-sequence" aria-label="Reparaturablauf">
                        <h2>Ausbaufolge für NAUO56</h2>
                        {overview.groups.map(({title, moves}) => <details key={title}>
                            <summary><span>{moves[0]!.step.ordinal}–{moves.at(-1)!.step.ordinal}</span> {title}</summary>
                            <ol start={moves[0]!.step.ordinal}>{moves.map(({piece, step, stroke}) => <li key={step.stepId}>
                                {step.partLabel} <code>{piece!.split('/').at(-1)}</code> · {stroke} mm
                                <div>{step.directionLabel}</div>
                            </li>)}</ol>
                        </details>)}
                        <p><strong>NAUO56 austauschen</strong> · {overview.exchange.stroke} mm seitlich abziehen. Die kurze Achse NAUO57 bleibt eingebaut.</p>
                    </section> : <DependencyTreeDiagram
                        tree={tree}
                        direction={direction}
                        highlightedId={inspectedId}
                        onSelectNode={(id) => setInspectedId(id)}
                        onReroot={(id) => {
                            if (model.occurrences.some((o) => o.id === id && o.kind === 'piece')) {
                                selectRoot(id);
                            }
                        }}
                    />}

                    {geometryUrl && (
                        <div className="rs-graph-visual" aria-label="3D-Übersicht Ausbau vs. Verbleib">
                            <div className="rs-graph-visual__bar">
                                <div className="rs-graph-legend">
                                    <span className="rs-graph-legend__item">
                                        <span className="rs-graph-dot rs-graph-dot--target" />
                                        Zielteil
                                    </span>
                                    <span className="rs-graph-legend__item">
                                        <span className="rs-graph-dot rs-graph-dot--remove" />
                                        {compact ? `Bewegt (${activeRepair!.disturbedCount})` : `Direkt bewegen (${directRemovalCount})`}
                                    </span>
                                    {!compact && <span className="rs-graph-legend__item">
                                        <span className="rs-graph-dot rs-graph-dot--remove-indirect" />
                                        Indirekt bewegen ({indirectRemovalCount})
                                    </span>}
                                    <span className="rs-graph-legend__item">
                                        <span className="rs-graph-dot rs-graph-dot--stay" />
                                        Bleibt ({Math.max(0, 70 - 1 - (compact ? activeRepair!.disturbedCount : tree.plan.releasedPieceIds.length))})
                                    </span>
                                </div>
                                <label className="rs-graph-explode">
                                    <span>Explosionsansicht</span>
                                    <input
                                        type="range"
                                        min={0}
                                        max={1}
                                        step={0.05}
                                        value={explode}
                                        onChange={(e) => setExplode(Number(e.target.value))}
                                    />
                                </label>
                            </div>
                            <div className="rs-graph-visual__scene">
                                <StudScene
                                    assemblyName={dataset.noun}
                                    url={geometryUrl}
                                    target={rootId}
                                    start={ZERO}
                                    end={ZERO}
                                    focus={false}
                                    replay={0}
                                    reset={0}
                                    colors={sceneColors}
                                    explode={explode}
                                    onPick={(id) => {
                                        if (
                                            model.occurrences.some(
                                                (o) => o.id === id && o.kind === 'piece'
                                            )
                                        ) {
                                            selectRoot(id);
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </section>

                <aside className="rs-graph-inspector">
                    <h2>Ausbau &amp; Wiedereinbau</h2>

                    {!compact && <div className="rs-graph-card">
                        <h3>
                            {tree.plan.releasedConnections.length} Verbindungen lösen ·{' '}
                            {tree.plan.releasedPieceIds.length === 0
                                ? '0 weitere Bauteile bewegen'
                                : tree.plan.removalOrder.some((step) => step.actionKind === 'slide')
                                  ? `${tree.plan.removalOrder.filter((step) => !step.isTarget && step.actionKind !== 'slide').length} Teile ausbauen · ${tree.plan.removalOrder.filter((step) => step.actionKind === 'slide').length} verschieben`
                                  : `${tree.plan.releasedPieceIds.length} weitere Bauteile einzeln lösen`}
                        </h3>
                        <p>
                            Quelle:{' '}
                            <strong>
                                {tree.plan.source === 'modeled-manual'
                                    ? 'Modellierte Anleitung'
                                    : tree.plan.source === 'reviewed-procedure'
                                      ? 'Bestätigter Ablaufentwurf (noch physisch zu prüfen)'
                                      : 'STEP-Freiheitsgrade (minimale Verbindungs-Trennung)'}
                            </strong>
                        </p>

                        <details open>
                            <summary>
                                <strong>
                                    Gelöste Verbindungen ({tree.plan.releasedConnections.length})
                                </strong>
                            </summary>
                            <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: '0.82rem' }}>
                                {tree.plan.releasedConnections.map((rc) => (
                                    <li key={rc.connectionId}>
                                        <strong>{rc.kind}</strong> ({rc.axisLabel}):{' '}
                                        {rc.pieceNames[0]} ↔ {rc.pieceNames[1]}
                                    </li>
                                ))}
                            </ul>
                        </details>

                        {tree.plan.intactUnits.length > 0 && (
                            <details open>
                                <summary>
                                    <strong>
                                        Intakte Baugruppen im Ganzen ({tree.plan.intactUnits.length} · bleiben Grün)
                                    </strong>
                                </summary>
                                <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: '0.82rem' }}>
                                    {tree.plan.intactUnits.map((u) => (
                                        <li key={u.unitId}>
                                            <strong>{u.unitName}</strong> ({u.memberIds.length} Teile bleiben zusammen)
                                        </li>
                                    ))}
                                </ul>
                            </details>
                        )}

                        <details open>
                            <summary>
                                <strong>1. Ausbauen (Demontage · {tree.plan.removalOrder.length} Schritte)</strong>
                            </summary>
                            <ol className="rs-graph-steps" style={{ marginTop: 6 }}>
                                {tree.plan.removalOrder.map((step) => (
                                    <li key={`rm:${step.pieceId}`}>
                                        <button
                                            type="button"
                                            className={`rs-graph-step-btn ${
                                                inspectedId === step.pieceId
                                                    ? 'rs-graph-step-btn--active'
                                                    : ''
                                            }`}
                                            onClick={() => setInspectedId(step.pieceId)}
                                        >
                                            <strong>
                                                {step.actionKind === 'slide'
                                                    ? `Zurückschieben #${step.order}:`
                                                    : `Ausbau #${step.order}:`}
                                            </strong>{' '}
                                            {step.commonName}{' '}
                                            <code>({step.pieceId.split('/').at(-1)})</code>
                                            {step.isUnit
                                                ? ` · BAUGRUPPE IM GANZEN (${step.memberCount ?? 0} Teile)`
                                                : ''}
                                            {step.directionLabel ? ` · ${step.directionLabel}` : ''}
                                            {step.isTarget ? ' · ZIELTEIL' : ''}
                                        </button>
                                    </li>
                                ))}
                            </ol>
                        </details>

                        <p style={{ padding: '4px 8px', background: '#fff2c4', borderRadius: 4 }}>
                            <strong>2. Austauschen:</strong> Defektes Zielteil durch Ersatzteil ersetzen.
                        </p>

                        <details open>
                            <summary>
                                <strong>3. Wieder zusammenbauen ({tree.plan.reassemblyOrder.length} Schritte)</strong>
                            </summary>
                            <ol className="rs-graph-steps" style={{ marginTop: 6 }}>
                                {tree.plan.reassemblyOrder.map((step) => (
                                    <li key={`re:${step.pieceId}`}>
                                        <button
                                            type="button"
                                            className={`rs-graph-step-btn ${
                                                inspectedId === step.pieceId
                                                    ? 'rs-graph-step-btn--active'
                                                    : ''
                                            }`}
                                            onClick={() => setInspectedId(step.pieceId)}
                                        >
                                            <strong>
                                                {step.actionKind === 'slide'
                                                    ? `Vorschieben #${step.order}:`
                                                    : `Einbau #${step.order}:`}
                                            </strong>{' '}
                                            {step.commonName}{' '}
                                            <code>({step.pieceId.split('/').at(-1)})</code>
                                            {step.isUnit
                                                ? ` · BAUGRUPPE IM GANZEN (${step.memberCount ?? 0} Teile)`
                                                : ''}
                                            {step.directionLabel ? ` · ${step.directionLabel}` : ''}
                                            {step.isTarget ? ' · ERSATZTEIL' : ''}
                                        </button>
                                    </li>
                                ))}
                            </ol>
                        </details>
                    </div>}

                    {activeRepair && (
                        <div className="rs-graph-card">
                            <h3>Modellierte Reparatur-Anleitung</h3>
                            <p>
                                <strong>{activeRepair.steps.length}</strong> Schritte ·{' '}
                                <strong>{activeRepair.disturbedCount}</strong> gesunde Teile bewegt ·{' '}
                                Status: <code>{activeRepair.search.status}</code>
                            </p>
                            <details>
                                <summary>Anleitungsschritte anzeigen</summary>
                                <ol className="rs-graph-steps" style={{ marginTop: 6 }}>
                                    {activeRepair.steps.map((step) => {
                                        const stepPieceId =
                                            pilot.movers[step.operationId] ??
                                            model.operations.find((o) => o.id === step.operationId)
                                                ?.members[0] ??
                                            rootId;
                                        return (
                                            <li key={step.stepId}>
                                                <button
                                                    type="button"
                                                    className={`rs-graph-step-btn ${
                                                        inspectedId === stepPieceId
                                                            ? 'rs-graph-step-btn--active'
                                                            : ''
                                                    }`}
                                                    onClick={() => setInspectedId(stepPieceId)}
                                                >
                                                    <strong>
                                                        {step.ordinal}. [{step.phase}]
                                                    </strong>{' '}
                                                    {step.instruction}
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ol>
                            </details>
                        </div>
                    )}

                    <h2>Knoten-Details &amp; Freiheitsgrade (STEP)</h2>
                    <div className="rs-graph-card">
                        <h3>{inspectedOcc.commonName}</h3>
                        <p>
                            <code>{inspectedOcc.id}</code>
                        </p>
                        {!compact && inspectedNode && (
                            <p>
                                Rolle: <strong>{inspectedNode.role}</strong> · Tiefe:{' '}
                                <strong>{inspectedNode.depth}</strong> · Evidenz:{' '}
                                <strong>{inspectedNode.evidenceTier}</strong>
                            </p>
                        )}
                        {inspectedDofPiece && (
                            <p>
                                <strong>Freiheitsgrade:</strong>{' '}
                                {inspectedDofPiece.remainingTranslationalDof} transl. DOF (
                                <code>{inspectedDofPiece.status}</code>) · Achsen:{' '}
                                {inspectedDofPiece.distinctAxes.map(formatAxisLabel).join(', ') || 'keine'}
                            </p>
                        )}
                        <div className="rs-graph-actions">
                            {inspectedOcc.kind === 'piece' && inspectedOcc.id !== rootId && (
                                <button type="button" onClick={() => selectRoot(inspectedOcc.id)}>
                                    Als Baum-Wurzel setzen
                                </button>
                            )}
                            <a href={`#/review?piece=${encodeURIComponent(inspectedOcc.id)}`}>
                                Im Reviewer bearbeiten
                            </a>
                        </div>

                        {inspectedDofConnections.length > 0 && (
                            <details open>
                                <summary>
                                    Verbindungs-Freiheitsgrade ({inspectedDofConnections.length})
                                </summary>
                                <ul>
                                    {inspectedDofConnections.map((conn) => {
                                        const peerId =
                                            conn.pieces[0] === inspectedOcc.id
                                                ? conn.pieces[1]
                                                : conn.pieces[0];
                                        const peerName =
                                            model.occurrences.find((o) => o.id === peerId)
                                                ?.commonName ?? peerId;
                                        const g = conn.globalAxes;
                                        const flags = [
                                            g.tx ? 'Tx' : null,
                                            g.ty ? 'Ty' : null,
                                            g.tz ? 'Tz' : null,
                                            g.rx ? 'Rx' : null,
                                            g.ry ? 'Ry' : null,
                                            g.rz ? 'Rz' : null
                                        ]
                                            .filter(Boolean)
                                            .join(' ');
                                        return (
                                            <li key={conn.connectionId}>
                                                <strong>{conn.kinematicType}</strong> ({conn.kind},{' '}
                                                {formatAxisLabel(conn.axis)},{' '}
                                                <code>{flags || '0 DOF'}</code>) ↔ {peerName} (
                                                <code>{peerId.split('/').at(-1)}</code>)
                                            </li>
                                        );
                                    })}
                                </ul>
                            </details>
                        )}

                        <details>
                            <summary>Verbindungen ({inspectedConnections.length})</summary>
                            <ul>
                                {inspectedConnections.map((conn) => {
                                    const peer = conn.a === inspectedOcc.id ? conn.b : conn.a;
                                    const peerName =
                                        model.occurrences.find((o) => o.id === peer)?.commonName ??
                                        peer;
                                    return (
                                        <li key={conn.id}>
                                            <strong>{conn.kind}</strong> ↔ {peerName} (
                                            <code>{peer.split('/').at(-1)}</code>)
                                        </li>
                                    );
                                })}
                            </ul>
                        </details>

                        <details>
                            <summary>Exit-Kandidaten ({inspectedCandidates.length})</summary>
                            <ul>
                                {inspectedCandidates.map((cand) => {
                                    const activeContacts = cand.contacts.filter(
                                        (c) => c.witness !== null
                                    ).length;
                                    return (
                                        <li key={cand.id}>
                                            {cand.proposedStrokeMm.toFixed(1)} mm · Achse [
                                            {cand.axis.map((v) => v.toFixed(1)).join(', ')}] ·{' '}
                                            {cand.transverseJoints.length} Quer-Verbindungen ·{' '}
                                            {activeContacts} Kontakte
                                        </li>
                                    );
                                })}
                            </ul>
                        </details>
                    </div>
                </aside>
            </div>
        </main>
    );
}
