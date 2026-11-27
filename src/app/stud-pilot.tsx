import { useEffect, useMemo, useState } from 'react';
import scavangerGraphUrl from '../../scavanger-dependency-graph.json?url';
import { z } from 'zod';
import { ManualScreen } from '../presentation/manual-screen.js';
import { PiecePickerScreen } from '../presentation/piece-picker-screen.js';
import { toStepViewModel } from '../presentation/manual-contract.js';
import { StudScene } from '../scene/stud-scene.js';
import { confirmStep, createManualSession, type ManualSession } from './manual-session.js';
import { pilotBase, type PilotData } from './pilot-data.js';
import { loadPackage } from './package-loader.js';
import type { AssemblyModel, Vec3 } from '../domain/schema.js';
import { buildDependencyTree, type MotionCandidateSummary } from '../domain/dependency-tree.js';
import { DependencyTreeDiagram } from '../graph-view/dependency-tree-diagram.js';
import '../presentation/stud-pilot.css';
import '../presentation/dependency-graph.css';
import { loadCheckpoint, restoreSession, storeCheckpoint } from './checkpoint.js';
import { exportJson } from './export-json.js';
import { DescriptionPicker } from './description-picker.js';

const zero: Vec3 = [0,0,0];
const scavangerGraphSchema = z.object({
    schema: z.literal('restart.scavanger-dependency-graph/1'),
    graphRevision: z.string(),
    datasetRevision: z.string(),
    semantics: z.string(),
    nodes: z.array(z.object({
        id: z.string(),
        label: z.string(),
        location: z.string(),
        turn: z.number(),
        outcome: z.enum(['removed', 'retained'])
    })),
    edges: z.array(z.object({
        from: z.string(),
        to: z.string(),
        fromTurn: z.number(),
        toTurn: z.number(),
        relation: z.literal('removed-before'),
        evidence: z.literal('player-classified-turn-order-candidate')
    }))
});

export function StudPilot() {
    const [data, setData] = useState<PilotData>();
    const [model, setModel] = useState<AssemblyModel>();
    const [candidates, setCandidates] = useState<MotionCandidateSummary[]>([]);
    const [scavangerGraph, setScavangerGraph] = useState<z.infer<typeof scavangerGraphSchema>>();
    const [geometryUrl,setGeometryUrl]=useState('');
    const [stage,setStage]=useState<'pilot'|'release'>('pilot');
    const [session, setSession] = useState<ManualSession>();
    const [error, setError] = useState(false), [attempt, retry] = useState(0);
    const [replay, play] = useState(0), [reset, resetCamera] = useState(0);
    const [checkFailed, failCheck] = useState(false);
    const [checkpoint,setCheckpoint]=useState(loadCheckpoint);
    const [history,setHistory]=useState<number|null>(null);
    const [joint,setJoint]=useState(false);
    const [pick,select]=useState(''), [query,search]=useState(''), [isolate,setIsolate]=useState(false), [explode,setExplode]=useState(0);
    const [hovered,setHovered]=useState('');
    const colors=useMemo(()=>new Map(data?.inventory.map(p=>[p.id,p.color])),[data]);
    const groups=useMemo(()=>{
        const result=new Map<string,NonNullable<typeof data>['inventory']>();
        for(const p of data?.inventory ?? []) {
            if(![p.name,p.elementId,p.designNo,p.id,p.color].join(' ').toLowerCase().includes(query.trim().toLowerCase()) && p.id!==pick && p.id!==(!pick && data?.target)) continue;
            result.set(p.name,[...(result.get(p.name) ?? []),p]);
        }
        return [...result];
    },[data,pick,query]);
    useEffect(() => {
        const abort = new AbortController();
        let url:string | undefined;
        setError(false);
        (async () => {
            const bundle=await loadPackage(pilotBase,abort.signal);
            if (!abort.signal.aborted) {
                url=URL.createObjectURL(bundle.geometry);
                setGeometryUrl(url);
                setData(bundle.pilot);
                setModel(bundle.model);
                setCandidates(Array.isArray(bundle.candidates) ? (bundle.candidates as MotionCandidateSummary[]) : []);
                setStage(bundle.stage);
                fetch(scavangerGraphUrl, { signal: abort.signal })
                    .then((response) => {
                        if (!response.ok) throw new Error('Could not load Scavanger turn-order candidates');
                        return response.json();
                    })
                    .then((value: unknown) => {
                        const graph = scavangerGraphSchema.parse(value);
                        const occurrenceIds = new Set(bundle.model.occurrences.map((occurrence) => occurrence.id));
                        if (graph.graphRevision !== bundle.model.graphRevision
                            || graph.datasetRevision !== bundle.model.source.datasetRevision
                            || graph.nodes.some((node) => !occurrenceIds.has(node.id))
                            || graph.edges.some((edge) => !occurrenceIds.has(edge.from) || !occurrenceIds.has(edge.to))) {
                            return;
                        }
                        setScavangerGraph(graph);
                    })
                    .catch(() => {
                        // The modeled manual remains available if the optional player graph is stale.
                    });
            }
        })().catch(() => { if (!abort.signal.aborted) setError(true); });
        return () => {abort.abort();if(url) URL.revokeObjectURL(url);};
    }, [attempt]);
    const jobs=data ? [data.repair,...data.alternatives] : [];
    const target=pick || data?.target;
    const job=joint && data ? data.jointRepair : jobs.find(r=>r.targetIds[0]===target);
    const label=data?.inventory.find(p=>p.id===target)?.name.split(' - ')[0] ?? 'piece';
    const manualTree = useMemo(
        () =>
            model && target
                ? buildDependencyTree(model, target, {
                      includeRequires: true,
                      includeCandidates: true,
                      includeConnected: false,
                      includeContains: false,
                      maxDepth: 6,
                      repair: job,
                      candidates
                  })
                : undefined,
        [model, target, job, candidates]
    );
    useEffect(()=>{
        if(job && session) storeCheckpoint(session.current ? { target:job.targetIds.join('+'),fingerprint:job.procedureFingerprint,confirmed:session.confirmedCount,failed:checkFailed } : null);
    },[job,session,checkFailed]);
    const step = history!==null ? session?.steps[history] : session?.current;
    const path = step && data?.paths[step.operationId];
    const begin = (id:string,combined=false) => { const r=combined ? data?.jointRepair : jobs.find(j=>j.targetIds[0]===id);if(r) {setJoint(combined);select(id);setCheckpoint(null);setHistory(null);failCheck(false);setSession(createManualSession(r));} };
    const offsets:Record<string,Vec3>={};
    for(const s of (session?.steps ?? []).slice(0,history ?? session?.confirmedCount ?? 0)) {
        const member=data?.movers[s.operationId], to=data?.paths[s.operationId]?.[1];
        if(member && to) offsets[member]=to;
    }
    const scene = data && target && <StudScene url={geometryUrl} target={(step && data.movers[step.operationId]) || target} offsets={offsets} colors={colors} isolate={!session && isolate} explode={session ? 0 : explode} idleAutoRotate={!session && history===null} highlight={hovered}
        xrStep={step ? {id:step.stepId,text:`${step.ordinal}. ${step.instruction}`,replay:()=>play(n=>n+1),confirm:()=>{if(history===null && !checkFailed)setSession(s=>s && confirmStep(s,step.stepId));}} : undefined}
        start={path?.[0] ?? zero} end={path?.[1] ?? zero} focus={!!step}
        replay={replay} reset={reset} onPick={id => { if (!session && !checkpoint) {select(id);begin(id);} }} />;
    if (checkpoint && data && !session) {
        const saved=[...jobs,data.jointRepair].find(r=>r.targetIds.join('+')===checkpoint.target);
        const resumed=saved && restoreSession(saved,checkpoint);
        return <main className="stud-summary"><h1>Check the assembly before continuing</h1>
            {resumed ? <><p>{checkpoint.confirmed} confirmed step(s). Next: {resumed.current?.instruction}</p>
                <button onClick={()=>{setJoint(saved!.targetIds.length>1);select(saved!.targetIds[0]!);setSession(resumed);failCheck(checkpoint.failed);setCheckpoint(null);}}>Kit matches — resume</button></> :
                <p>The procedure changed. Return the helicopter to its installed state first.</p>}
            <button onClick={()=>begin(saved?.targetIds[0] ?? data.target,(saved?.targetIds.length ?? 0)>1)}>Kit is fully assembled — restart</button></main>;
    }
    if (session && !step && data && job) return <main className="stud-summary">
        <p>ReStart · 30465 / {stage==='pilot'?'Single-target pilot':'Released manual'}</p><h1>Repair complete</h1>
        <p>{joint?'Pin and light stud':label} · {job.targetIds.join(', ')}</p><p>{job.disturbedCount} healthy {job.disturbedCount===1?'piece':'pieces'} disturbed in the modeled route.</p>
        <p>Fit check confirmed by you. Modeled release and return replayed. {(!joint && data.evidence?.[target!]?.physicallyVerified) ? `Physical trial: ${data.evidence[target!]!.benchRecordId}` : 'No independent physical trial recorded for this procedure.'}</p>
        <p>Disassembly timing: {job.timing.timedActions} of {job.timing.totalActions} actions mapped. {job.timing.estimatedSeconds===null?'Duration unknown.':`${job.timing.estimatedSeconds} s (challenge estimate).`}</p>
        <p>{job.preservedUnits.length ? job.preservedUnits.map(u=>`${u.name}: ${u.outcome}`).join('; '):'Functional-unit membership has not been reviewed.'}</p>
        <details><summary>How this transfers to equipment service</summary><p>In a hypothetical equipment enclosure, a cover is a piece, its fasteners are connections and screwdriver access is a prerequisite. A fan cartridge can move intact while the housing stays installed. A real device needs its own service constraints and validated return path.</p></details>
        {data.signedRadialGapMm!==undefined && job.targetIds.some(id=>id===data.target || id===data.pin) && <p>Stud fit allowance: 0.06 mm. Modeled radial interference: {(-data.signedRadialGapMm).toFixed(3)} mm.</p>}
        <p>Finger access and support have not been verified on the kit.</p>
        {target===data.pin && <p>The pin route assumes the split shank compresses inside the cross-block bore.</p>}
        <p>Procedure: <code>{job.procedureFingerprint}</code></p>
        <button onClick={()=>exportJson('repair-report.json',{targetIds:job.targetIds,repair:job,check:'operator-confirmed',evidence:!joint && data.evidence?.[target!] || {replayedAgainstModel:true,physicallyVerified:false}})}>Export repair report</button>
        <button onClick={() => {setJoint(false);setSession(undefined);}}>Back to target selection</button>
    </main>;
    if (step && session) return <>
        <ManualScreen step={toStepViewModel(step,session.total,{ canConfirm: !checkFailed && history===null,
            blockedReason: history!==null ? 'Viewing a confirmed step. Return to the current step to continue.' : 'Fit check failed. Inspect the seating before checking again.' })}
            scene={scene} actions={{
                confirmStep: id => setSession(s => s && !checkFailed ? confirmStep(s,id) : s),
                replayMotion: () => play(n => n+1), resetCamera: () => resetCamera(n => n+1),
                returnToCurrentStep: () => { setHistory(null);resetCamera(n => n+1); play(n => n+1); }
            }} />
        {step.phase === 'check' && <button className="stud-check" onClick={() => failCheck(!checkFailed)}>
            {checkFailed ? 'Recheck after inspection' : 'Fit check failed'}
        </button>}
        {session.confirmedCount>0 && <details className="stud-check"><summary>Confirmed steps</summary>
            {session.steps.slice(0,session.confirmedCount).map((s,i)=><button key={s.stepId} onClick={()=>setHistory(i)}>{s.ordinal}. {s.instruction}</button>)}</details>}
        {manualTree && <details className="rs-manual-graph-bg">
            <summary>Dependency graph (manual model · {manualTree.stats.pieceCount} parts, depth {manualTree.stats.maxDepth})</summary>
            <div className="rs-manual-graph-bg__head">
                <span>Aktueller Schritt: <strong>{step.ordinal}. {step.partLabel}</strong></span>
                <a href={`#/graph?piece=${encodeURIComponent(target!)}`}>Vollständigen Dependency-Graph öffnen</a>
            </div>
            <DependencyTreeDiagram tree={manualTree} direction="TB" activeStepPieceId={data?.movers[step.operationId] ?? target!} compact={true} />
            {scavangerGraph && <section aria-label="Scavanger repair order">
                <h3>Scavanger repair order</h3>
                <p>Authoritative recorded order for which pieces precede this target. These links describe sequence, not physical blockers. The reviewed route above remains authoritative for motions, replacement, and restoration.</p>
                {(() => {
                    const earlier = scavangerGraph.edges
                        .filter((edge) => edge.to === target)
                        .sort((a, b) => a.fromTurn - b.fromTurn || a.from.localeCompare(b.from));
                    return earlier.length
                        ? <ul>{earlier.map((edge) => {
                            const node = scavangerGraph.nodes.find((item) => item.id === edge.from);
                            return <li key={`${edge.from}:${edge.to}`}>Turn {edge.fromTurn}: {node?.label ?? edge.from} ({edge.from}) precedes this target’s turn {edge.toTurn}</li>;
                        })}</ul>
                        : <p>No earlier pieces are recorded before this target.</p>;
                })()}
            </section>}
        </details>}
    </>;
    return <PiecePickerScreen edition={stage === 'pilot' ? 'Single-target pilot' : 'Released manual'} scene={scene} headerLinks={<>
        <a href={`#/graph?piece=${encodeURIComponent(target ?? '')}`}>Dependency-Graph</a>
        <a href="#/dof">DOF &amp; Zeiten</a>
        <a href="#/review">Inspect the repair graph</a>
        <a href="#/scavanger">Scavanger</a>
    </>} viewControls={<>
        <label><input type="checkbox" checked={isolate} onChange={e=>setIsolate(e.target.checked)}/> Isolate selected piece</label>
        <label>Exploded view <input type="range" min="0" max="1" step="0.05" value={explode} onChange={e=>setExplode(Number(e.target.value))}/></label>
    </>}>
            {data ? <><label>Search pieces <input value={query} onChange={e=>search(e.target.value)} placeholder="Name, element ID, design or usage ID"/></label>
                <label>Occurrence <select value={target} onChange={e=>select(e.target.value)}>
                    {groups.map(([name,items])=><optgroup key={name} label={`${name} (${items.length})`}>{items.map(p=>
                        <option key={p.id} value={p.id}>{p.name} — {p.id}</option>)}</optgroup>)}</select></label>
                <details className="occurrence-browser"><summary>Browse parts ({groups.reduce((count, [,items])=>count+items.length,0)})</summary>
                    <div className="occurrence-list">{groups.map(([name,items])=><section key={name}><h3>{name}</h3>{items.map(p=><button key={p.id} type="button" aria-pressed={p.id===target}
                        onMouseEnter={()=>setHovered(p.id)} onMouseLeave={()=>setHovered('')}
                        onFocus={()=>setHovered(p.id)} onBlur={()=>setHovered('')}
                        onClick={()=>select(p.id)}>{p.name} — {p.id}</button>)}</section>)}</div>
                </details>
                <DescriptionPicker data={data} select={select} hover={setHovered}/>
                <div className="stud-picker__selection">
                    <p>Selected piece</p><strong>{label}</strong><code>{target}</code>
                    {job ? <button className="stud-picker__primary" onClick={()=>begin(target!)}>Select {label.toLowerCase()}</button> : <p>No modeled repair available for this occurrence. <a href={`#/review?piece=${encodeURIComponent(target!)}`}>Inspect its candidate exits</a></p>}
                </div>
                {(target===data.pin || target===data.target) && <button onClick={()=>begin(data.pin,true)}>Replace pin and light stud together</button>}
                <p className="stud-picker__coverage">{stage==='pilot'?'Generated model routes':'Reviewed model routes'} · {jobs.length} of {data.inventory.length} targets available.</p></> :
                error ? <><p role="status">The repair inventory could not be loaded.</p><button onClick={() => retry(n => n+1)}>Retry loading repair</button></> : <p role="status">Loading repair…</p>}
    </PiecePickerScreen>;
}
