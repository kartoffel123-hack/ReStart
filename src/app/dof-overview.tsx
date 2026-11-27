import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import {
    buildDependencyTree,
    type MotionCandidateSummary,
    type ReviewedDependencyPlan
} from '../domain/dependency-tree.js';
import {
    computeDofTimingSummary,
    connectionDofCatalogSchema,
    DEFAULT_REASSEMBLY_FACTOR,
    formatAxisLabel,
    secondsForConnectionKind,
    type ConnectionDofCatalog,
    type ConnectionTimingOverrides
} from '../domain/dof.js';
import type { AssemblyModel, ConnectionKind } from '../domain/schema.js';
import nauo9AccessPlanRaw from '../../data/review/nauo9-access-plan.json';
import { exportJson } from './export-json.js';
import { loadPackage } from './package-loader.js';
import { pilotBase, type PilotData } from './pilot-data.js';
import '../presentation/dof-overview.css';

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

function formatSeconds(sec: number): string {
    if (sec >= 60) {
        const mins = Math.floor(sec / 60);
        const rem = Number((sec - mins * 60).toFixed(1));
        return `${sec.toFixed(1)} s (${mins}m ${rem}s)`;
    }
    return `${sec.toFixed(1)} s`;
}

export function DofOverviewScreen() {
    const [model, setModel] = useState<AssemblyModel>();
    const [pilot, setPilot] = useState<PilotData>();
    const [candidates, setCandidates] = useState<MotionCandidateSummary[]>([]);
    const [dofCatalog, setDofCatalog] = useState<ConnectionDofCatalog>();
    const [error, setError] = useState('');

    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'kinematically-locked' | 'axial-slide'>('all');
    const [sortBy, setSortBy] = useState<'name' | 'connections' | 'plan-time'>('plan-time');
    const [timingOverrides, setTimingOverrides] = useState<ConnectionTimingOverrides>({});
    const [reassemblyFactor, setReassemblyFactor] = useState<number>(DEFAULT_REASSEMBLY_FACTOR);

    useEffect(() => {
        const abort = new AbortController();
        Promise.all([
            loadPackage(pilotBase, abort.signal),
            fetch(`${pilotBase}pilot/connection-dof.json`, { signal: abort.signal }).then((res) => {
                if (!res.ok) throw new Error(`connection-dof.json HTTP ${res.status}`);
                return res.json();
            })
        ])
            .then(([bundle, rawDof]) => {
                if (abort.signal.aborted) return;
                setModel(bundle.model);
                setPilot(bundle.pilot);
                setCandidates(candidateSchema.parse(bundle.candidates));
                setDofCatalog(connectionDofCatalogSchema.parse(rawDof));
            })
            .catch((err) => {
                if (!abort.signal.aborted) setError(String(err));
            });

        return () => abort.abort();
    }, []);

    const timingSummary = useMemo(
        () =>
            dofCatalog
                ? computeDofTimingSummary(dofCatalog, timingOverrides, reassemblyFactor)
                : undefined,
        [dofCatalog, timingOverrides, reassemblyFactor]
    );

    const rows = useMemo(() => {
        if (!model || !dofCatalog || !pilot) return [];
        const repairByTarget = new Map(
            [pilot.repair, ...pilot.alternatives]
                .filter((r) => r.targetIds[0])
                .map((r) => [r.targetIds[0]!, r])
        );
        const occById = new Map(model.occurrences.map((o) => [o.id, o]));
        const connById = new Map(dofCatalog.connections.map((c) => [c.connectionId, c]));

        return dofCatalog.pieces.map((piece) => {
            const occ = occById.get(piece.pieceId);
            const parentName = occ?.parent ? occById.get(occ.parent)?.commonName ?? occ.parent : '30465';
            const pieceConns = piece.connectionIds
                .map((id) => connById.get(id))
                .filter((c): c is NonNullable<typeof c> => c !== undefined);

            const tree = buildDependencyTree(model, piece.pieceId, {
                includeRequires: true,
                includeCandidates: true,
                preserveIntactUnits: true,
                includeConnected: false,
                includeContains: false,
                repair: repairByTarget.get(piece.pieceId),
                candidates,
                dofCatalog,
                reviewedPlan: nauo9AccessPlan
            });

            const planReleaseSeconds = Number(
                tree.plan.releasedConnections
                    .reduce((sum, rc) => sum + secondsForConnectionKind(rc.kind, timingOverrides), 0)
                    .toFixed(2)
            );
            const planReassemblySeconds = Number((planReleaseSeconds * reassemblyFactor).toFixed(2));
            const planRoundTripSeconds = Number(
                (planReleaseSeconds + planReassemblySeconds).toFixed(2)
            );

            return {
                piece,
                commonName: occ?.commonName ?? piece.commonName,
                parentName,
                connections: pieceConns,
                releasedConnectionCount: tree.plan.releasedConnections.length,
                releasedPieceCount: tree.plan.releasedPieceIds.length,
                intactUnitCount: tree.plan.intactUnits.length,
                planReleaseSeconds,
                planReassemblySeconds,
                planRoundTripSeconds
            };
        });
    }, [model, dofCatalog, pilot, candidates, timingOverrides, reassemblyFactor]);

    const filteredRows = useMemo(() => {
        const needle = query.trim().toLowerCase();
        return rows
            .filter((row) => statusFilter === 'all' || row.piece.status === statusFilter)
            .filter((row) => {
                if (!needle) return true;
                return [
                    row.commonName,
                    row.piece.pieceId,
                    row.parentName,
                    ...row.connections.map((c) => `${c.kind} ${c.kinematicType}`)
                ]
                    .join(' ')
                    .toLowerCase()
                    .includes(needle);
            })
            .sort((a, b) => {
                if (sortBy === 'connections') {
                    return b.releasedConnectionCount - a.releasedConnectionCount || a.commonName.localeCompare(b.commonName);
                }
                if (sortBy === 'plan-time') {
                    return b.planRoundTripSeconds - a.planRoundTripSeconds || a.commonName.localeCompare(b.commonName);
                }
                return a.commonName.localeCompare(b.commonName);
            });
    }, [rows, query, statusFilter, sortBy]);

    if (!model || !dofCatalog || !timingSummary) {
        return (
            <main className="rs-dof-page" data-route="dof">
                <header className="rs-dof-header">
                    <div>
                        <h1>Freiheitsgrade &amp; Verbindungszeiten · 30465</h1>
                    </div>
                    <nav className="rs-dof-nav">
                        <a href="#/">Mechanic manual</a>
                        <a href="#/graph">Dependency Graph</a>
                        <a href="#/review">Repair reviewer</a>
                    </nav>
                </header>
                <p style={{ padding: 24 }}>{error || 'Lade STEP-Freiheitsgrade und Zeiten…'}</p>
            </main>
        );
    }

    const lockedCount = dofCatalog.pieces.filter((p) => p.status === 'kinematically-locked').length;
    const axialCount = dofCatalog.pieces.filter((p) => p.status === 'axial-slide').length;
    const avgPlanRelease =
        filteredRows.length > 0
            ? filteredRows.reduce((sum, r) => sum + r.planReleaseSeconds, 0) / filteredRows.length
            : 0;
    const avgPlanRoundTrip =
        filteredRows.length > 0
            ? filteredRows.reduce((sum, r) => sum + r.planRoundTripSeconds, 0) / filteredRows.length
            : 0;

    const updateRate = (kind: ConnectionKind, raw: string): void => {
        const parsed = Number(raw);
        if (!Number.isFinite(parsed) || parsed < 0) return;
        setTimingOverrides((prev) => ({ ...prev, [kind]: parsed }));
    };

    return (
        <main className="rs-dof-page" data-route="dof">
            <header className="rs-dof-header">
                <div>
                    <h1>Freiheitsgrade &amp; Verbindungszeiten · 30465</h1>
                    <div className="rs-dof-header__sub">
                        Alle 70 Bauteile, 84 STEP-Verbindungen, Freiheitsgrade (DOF) und MTM-Zeiten pro Verbindungstyp
                    </div>
                </div>
                <nav className="rs-dof-nav">
                    <a href="#/">Mechanic manual</a>
                    <a href="#/graph">Dependency Graph</a>
                    <a href="#/review">Repair reviewer</a>
                    <button
                        type="button"
                        onClick={() =>
                            exportJson('dof-and-timing-summary.json', {
                                timingSummary,
                                parts: rows.map((r) => ({
                                    pieceId: r.piece.pieceId,
                                    commonName: r.commonName,
                                    subassembly: r.parentName,
                                    remainingTranslationalDof: r.piece.remainingTranslationalDof,
                                    status: r.piece.status,
                                    directConnectionCount: r.connections.length,
                                    releasedConnectionCount: r.releasedConnectionCount,
                                    releasedPieceCount: r.releasedPieceCount,
                                    planReleaseSeconds: r.planReleaseSeconds,
                                    planRoundTripSeconds: r.planRoundTripSeconds
                                }))
                            })
                        }
                    >
                        Export JSON
                    </button>
                </nav>
            </header>

            <div className="rs-dof-content">
                <section className="rs-dof-kpis" aria-label="Kennzahlen">
                    <div className="rs-dof-kpi">
                        <div className="rs-dof-kpi__label">Bauteile &amp; DOF</div>
                        <div className="rs-dof-kpi__value">{dofCatalog.pieces.length} Bauteile</div>
                        <div className="rs-dof-kpi__sub">
                            {lockedCount} gesperrt (DOF 0) · {axialCount} axial (DOF 1)
                        </div>
                    </div>
                    <div className="rs-dof-kpi">
                        <div className="rs-dof-kpi__label">STEP-Verbindungen gesamt</div>
                        <div className="rs-dof-kpi__value">{timingSummary.totalConnections}</div>
                        <div className="rs-dof-kpi__sub">
                            {timingSummary.byType.map((t) => `${t.count}× ${t.kind}`).join(' · ')}
                        </div>
                    </div>
                    <div className="rs-dof-kpi">
                        <div className="rs-dof-kpi__label">Gesamtzeit Lösen (84 Verb.)</div>
                        <div className="rs-dof-kpi__value">
                            {formatSeconds(timingSummary.totalReleaseSeconds)}
                        </div>
                        <div className="rs-dof-kpi__sub">MTM-Worst-Case (+30%), ohne zusätzlichen Faktor</div>
                    </div>
                    <div className="rs-dof-kpi">
                        <div className="rs-dof-kpi__label">Gesamtzeit Zusammenbau</div>
                        <div className="rs-dof-kpi__value">
                            {formatSeconds(timingSummary.totalReassemblySeconds)}
                        </div>
                        <div className="rs-dof-kpi__sub">
                            Kalibriert auf ~15 min Praxis-Zusammenbau (×{reassemblyFactor.toFixed(2)})
                        </div>
                    </div>
                    <div className="rs-dof-kpi">
                        <div className="rs-dof-kpi__label">Gesamt (Lösen + Zusammenbau)</div>
                        <div className="rs-dof-kpi__value">
                            {formatSeconds(timingSummary.totalRoundTripSeconds)}
                        </div>
                        <div className="rs-dof-kpi__sub">
                            Ø pro Einzelteil-Austausch: {formatSeconds(avgPlanRoundTrip)}
                        </div>
                    </div>
                </section>

                <section className="rs-dof-panel">
                    <h2>Zeit pro Verbindungstyp &amp; Gesamtzeit</h2>
                    <p className="rs-dof-provenance">{timingSummary.provenance}</p>
                    <div className="rs-dof-controls">
                        <label>
                            <strong>Zusammenbau-Faktor (Kalibrierung ~15 min):</strong>{' '}
                            <input
                                type="number"
                                className="rs-dof-num-input"
                                min={0.5}
                                max={10}
                                step={0.05}
                                value={reassemblyFactor}
                                onChange={(e) => {
                                    const v = Number(e.target.value);
                                    if (Number.isFinite(v) && v >= 0) setReassemblyFactor(v);
                                }}
                            />{' '}
                            × Lösezeit
                        </label>
                    </div>
                    <div className="rs-dof-table-wrap">
                        <table className="rs-dof-table">
                            <thead>
                                <tr>
                                    <th>Verbindungstyp</th>
                                    <th>MTM-Referenz</th>
                                    <th>Anzahl im Helikopter</th>
                                    <th>Zeit Lösen / Verb. (s)</th>
                                    <th>Gesamt Lösen</th>
                                    <th>Gesamt Zusammenbau</th>
                                    <th>Gesamt (Lösen + Zusammenbau)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {timingSummary.byType.map((row) => (
                                    <tr key={row.kind}>
                                        <td>
                                            <strong>{row.kind}</strong>
                                        </td>
                                        <td>
                                            <code>{row.mtmRowId}</code> — {row.mtmLabel}
                                        </td>
                                        <td>{row.count}</td>
                                        <td>
                                            <input
                                                type="number"
                                                className="rs-dof-num-input"
                                                min={0}
                                                step={0.001}
                                                value={row.secondsPerConnection}
                                                aria-label={`Sekunden für ${row.kind}`}
                                                onChange={(e) => updateRate(row.kind, e.target.value)}
                                            />{' '}
                                            s
                                        </td>
                                        <td>{formatSeconds(row.totalReleaseSeconds)}</td>
                                        <td>{formatSeconds(row.totalReassemblySeconds)}</td>
                                        <td>{formatSeconds(row.totalRoundTripSeconds)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan={2}>Gesamt (alle Verbindungen im Helikopter)</td>
                                    <td>{timingSummary.totalConnections}</td>
                                    <td>—</td>
                                    <td>{formatSeconds(timingSummary.totalReleaseSeconds)}</td>
                                    <td>{formatSeconds(timingSummary.totalReassemblySeconds)}</td>
                                    <td>{formatSeconds(timingSummary.totalRoundTripSeconds)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </section>

                <section className="rs-dof-panel">
                    <h2>Bauteile-Liste: Verbindungen, Freiheitsgrade &amp; Austauschzeit ({filteredRows.length} / {rows.length})</h2>
                    <div className="rs-dof-controls">
                        <input
                            type="search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Bauteil, Usage-ID (z. B. NAUO78), Baugruppe oder Verbindungstyp suchen…"
                            aria-label="Bauteile filtern"
                        />
                        <select
                            value={statusFilter}
                            onChange={(e) =>
                                setStatusFilter(
                                    e.target.value as 'all' | 'kinematically-locked' | 'axial-slide'
                                )
                            }
                            aria-label="DOF-Status filtern"
                        >
                            <option value="all">Alle DOF-Zustände</option>
                            <option value="kinematically-locked">Nur gesperrt (DOF 0)</option>
                            <option value="axial-slide">Nur axial verschiebbar (DOF 1)</option>
                        </select>
                        <select
                            value={sortBy}
                            onChange={(e) =>
                                setSortBy(e.target.value as 'name' | 'connections' | 'plan-time')
                            }
                            aria-label="Sortierung"
                        >
                            <option value="plan-time">Sortieren: Austauschzeit (absteigend)</option>
                            <option value="connections">Sortieren: Gelöste Verbindungen</option>
                            <option value="name">Sortieren: Bauteilname (A–Z)</option>
                        </select>
                    </div>

                    <div className="rs-dof-table-wrap">
                        <table className="rs-dof-table">
                            <thead>
                                <tr>
                                    <th>Bauteil</th>
                                    <th>Freiheitsgrade (DOF)</th>
                                    <th>Direkte Verbindungen (STEP)</th>
                                    <th>Zu lösende Verbindungen (Plan)</th>
                                    <th>Zeit Ausbau</th>
                                    <th>Gesamtzeit (Ausbau + Einbau)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRows.map((row) => (
                                    <tr key={row.piece.pieceId}>
                                        <td>
                                            <strong>{row.commonName}</strong>
                                            <div>
                                                <code>{row.piece.pieceId}</code>
                                            </div>
                                            <div style={{ fontSize: '0.78rem', color: '#5c666d' }}>
                                                {row.parentName}
                                            </div>
                                            <a
                                                className="rs-dof-link"
                                                href={`#/graph?piece=${encodeURIComponent(row.piece.pieceId)}`}
                                            >
                                                Dependency-Graph öffnen →
                                            </a>
                                        </td>
                                        <td>
                                            <span
                                                className={`rs-dof-badge ${
                                                    row.piece.status === 'kinematically-locked'
                                                        ? 'rs-dof-badge--locked'
                                                        : 'rs-dof-badge--axial'
                                                }`}
                                            >
                                                {row.piece.status === 'kinematically-locked'
                                                    ? 'DOF 0 (gesperrt)'
                                                    : `DOF ${row.piece.remainingTranslationalDof} (axial)`}
                                            </span>
                                            <div style={{ marginTop: 4, fontSize: '0.78rem' }}>
                                                Achsen:{' '}
                                                {row.piece.distinctAxes.map(formatAxisLabel).join(', ') || '—'}
                                            </div>
                                        </td>
                                        <td>
                                            <ul className="rs-dof-conn-list">
                                                {row.connections.map((conn) => {
                                                    const peerId =
                                                        conn.pieces[0] === row.piece.pieceId
                                                            ? conn.pieces[1]
                                                            : conn.pieces[0];
                                                    const peerName =
                                                        conn.pieces[0] === row.piece.pieceId
                                                            ? conn.pieceNames[1]
                                                            : conn.pieceNames[0];
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
                                                    const sec = secondsForConnectionKind(
                                                        conn.kind,
                                                        timingOverrides
                                                    );
                                                    return (
                                                        <li key={conn.connectionId}>
                                                            <strong>{conn.kind}</strong> ({conn.kinematicType},{' '}
                                                            {formatAxisLabel(conn.axis)},{' '}
                                                            <code>{flags}</code>, {conn.engagementMm.toFixed(1)} mm) ↔{' '}
                                                            {peerName} (<code>{peerId.split('/').at(-1)}</code>) ·{' '}
                                                            <strong>{sec} s</strong>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </td>
                                        <td>
                                            <strong>{row.releasedConnectionCount}</strong> Verbindungen
                                            <div style={{ fontSize: '0.78rem', color: '#5c666d' }}>
                                                +{row.releasedPieceCount} weitere Teile (Gelb)
                                                {row.intactUnitCount > 0 &&
                                                    ` · ${row.intactUnitCount} intakte Baugruppe(n)`}
                                            </div>
                                        </td>
                                        <td>{formatSeconds(row.planReleaseSeconds)}</td>
                                        <td>
                                            <strong>{formatSeconds(row.planRoundTripSeconds)}</strong>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan={4}>
                                        Durchschnitt über {filteredRows.length} angezeigte Bauteile (Einzelteil-Austausch)
                                    </td>
                                    <td>{formatSeconds(avgPlanRelease)}</td>
                                    <td>{formatSeconds(avgPlanRoundTrip)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </section>
            </div>
        </main>
    );
}
