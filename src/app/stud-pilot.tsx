import { useEffect, useMemo, useState } from 'react';
import { ManualScreen } from '../presentation/manual-screen.js';
import { PiecePickerScreen } from '../presentation/piece-picker-screen.js';
import { toStepViewModel } from '../presentation/manual-contract.js';
import { StudScene } from '../scene/stud-scene.js';
import { confirmStep, createManualSession, unconfirmLastStep, type ManualSession } from './manual-session.js';
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
import { removedInstances } from './manual-scene-state.js';

const zero: Vec3 = [0,0,0];
export function StudPilot() {
    const [data, setData] = useState<PilotData>();
    const [model, setModel] = useState<AssemblyModel>();
    const [candidates, setCandidates] = useState<MotionCandidateSummary[]>([]);
    const [geometryUrl,setGeometryUrl]=useState('');
    const [stage,setStage]=useState<'pilot'|'release'>('pilot');
    const [session, setSession] = useState<ManualSession>();
    const [error, setError] = useState(false), [attempt, retry] = useState(0);
    const [replay, play] = useState(0), [reset, resetCamera] = useState(0);
    const [checkFailed, failCheck] = useState(false);
    const [checkpoint,setCheckpoint]=useState(loadCheckpoint);
    const [history,setHistory]=useState<number|null>(null);
    const [joint,setJoint]=useState(false);
    const [replaceWarning,setReplaceWarning]=useState(false);
    const [pick,select]=useState(''), [query,search]=useState('');
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
            }
        })().catch(() => { if (!abort.signal.aborted) setError(true); });
        return () => {abort.abort();if(url) URL.revokeObjectURL(url);};
    }, [attempt]);
    const jobs=data ? [data.repair,...data.alternatives] : [];
    const target=pick;
    const sceneTarget=target || data?.target;
    const job=joint && data ? data.jointRepair : jobs.find(r=>r.targetIds[0]===target);
    const label=data?.inventory.find(p=>p.id===target)?.name.split(' - ')[0] ?? 'piece';
    useEffect(()=>setReplaceWarning(false),[target]);
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
    const removed = session ? removedInstances(session.steps, session.confirmedCount, data?.movers ?? {}) : new Set<string>();
    const scene = data && sceneTarget && <StudScene url={geometryUrl} target={(step && data.movers[step.operationId]) || sceneTarget} selectionActive={!!target} replacementPreview={step?.phase==='replace'} removed={removed} offsets={offsets} colors={colors} isolate={false} explode={0} idleAutoRotate={!session && history===null} highlight={hovered}
        xrStep={step ? {id:step.stepId,text:`${step.ordinal}. ${step.instruction}`,replay:()=>play(n=>n+1),confirm:()=>{if(history===null && !checkFailed)setSession(s=>s && confirmStep(s,step.stepId));}} : undefined}
        start={path?.[0] ?? zero} end={path?.[1] ?? zero} focus={!!step}
        replay={replay} reset={reset} onPick={id => { if (!session && !checkpoint) {setJoint(false);select(id);} }} />;
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
            blockedReason: history!==null ? 'Viewing a confirmed step. Return to the current step to continue.' : 'Fit check failed. Inspect the seating before checking again.',
            isHistorical: history!==null, canGoBack: history===null && session.confirmedCount>0 })}
            scene={scene} actions={{
                confirmStep: id => setSession(s => s && !checkFailed ? confirmStep(s,id) : s),
                replayMotion: () => play(n => n+1), resetCamera: () => resetCamera(n => n+1),
                goBackOneStep: () => {
                    if (history === null && session.confirmedCount > 0) {
                        setSession(current => current && unconfirmLastStep(current));
                        failCheck(false);
                        resetCamera(n => n+1);
                        play(n => n+1);
                    }
                },
                returnToCurrentStep: () => { setHistory(null);resetCamera(n => n+1); play(n => n+1); }
            }} />
        {step.phase === 'check' && <button className="stud-check" onClick={() => failCheck(!checkFailed)}>
            {checkFailed ? 'Recheck after inspection' : 'Fit check failed'}
        </button>}
        {session.confirmedCount>0 && <details className="stud-check"><summary>Confirmed steps</summary>
            {session.steps.slice(0,session.confirmedCount).map((s,i)=><button key={s.stepId} onClick={()=>setHistory(i)}>{s.ordinal}. {s.instruction}</button>)}</details>}
        {manualTree && <details className="rs-manual-graph-bg">
            <summary>Dependency-Graph (Hintergrund zur Anleitung · {manualTree.stats.pieceCount} Teile, Tiefe {manualTree.stats.maxDepth})</summary>
            <div className="rs-manual-graph-bg__head">
                <span>Aktueller Schritt: <strong>{step.ordinal}. {step.partLabel}</strong></span>
                <a href={`#/graph?piece=${encodeURIComponent(target!)}`}>Vollständigen Dependency-Graph öffnen</a>
            </div>
            <DependencyTreeDiagram tree={manualTree} direction="TB" activeStepPieceId={data?.movers[step.operationId] ?? target!} compact={true} />
        </details>}
    </>;
    return <PiecePickerScreen scene={scene}>
            {data ? <><details className="stud-picker__advanced"><summary>Advanced Parameters</summary>
                <label>Search pieces <input value={query} onChange={e=>search(e.target.value)} placeholder="Name, element ID, design or usage ID"/></label>
                <label>Occurrence <select value={target} onChange={e=>select(e.target.value)}>
                    <option value="">Choose a piece</option>
                    {groups.map(([name,items])=><optgroup key={name} label={`${name} (${items.length})`}>{items.map(p=>
                        <option key={p.id} value={p.id}>{p.name} — {p.id}</option>)}</optgroup>)}</select></label>
                <details className="occurrence-browser"><summary>Browse parts ({groups.reduce((count, [,items])=>count+items.length,0)})</summary>
                    <div className="occurrence-list">{groups.map(([name,items])=><section key={name}><h3>{name}</h3>{items.map(p=><button key={p.id} type="button" aria-pressed={p.id===target}
                        onMouseEnter={()=>setHovered(p.id)} onMouseLeave={()=>setHovered('')}
                        onFocus={()=>setHovered(p.id)} onBlur={()=>setHovered('')}
                        onClick={()=>select(p.id)}>{p.name} — {p.id}</button>)}</section>)}</div>
                </details>
                <DescriptionPicker data={data} select={select} hover={setHovered}/>
                {(target===data.pin || target===data.target) && <button onClick={()=>begin(data.pin,true)}>Replace pin and light stud together</button>}
                <p className="stud-picker__coverage">{stage==='pilot'?'Generated model routes':'Reviewed model routes'} · {jobs.length} of {data.inventory.length} targets available.</p>
            </details>
                <h3 className="stud-picker__selection-title">Selected piece</h3>
                {target ? <div className="stud-picker__selection">
                    <strong>{label}</strong><code>{target}</code>
                    <button className="stud-picker__primary" onClick={()=>job ? begin(target) : setReplaceWarning(true)}>Replace {label}</button>
                    {replaceWarning && <p role="alert">No repair procedure is available for this piece.</p>}
                </div> : <div className="stud-picker__selection stud-picker__selection--empty"><p>[Please select a piece in the 3D view]</p></div>}
                </> :
                error ? <><p role="status">The repair inventory could not be loaded.</p><button onClick={() => retry(n => n+1)}>Retry loading repair</button></> : <p role="status">Loading repair…</p>}
    </PiecePickerScreen>;
}
