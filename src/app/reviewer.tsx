import { useEffect, useMemo, useRef, useState } from 'react';
import { assemblyModelSchema, reviewPatchSchema, type AssemblyModel, type ReviewEdit, type ReviewPatch } from '../domain/schema.js';
import { applyReview } from '../domain/review.js';
import type { PlanOutcome } from '../domain/planner.js';
import { AssemblyDiagram } from '../graph-view/assembly-diagram.js';
import { pilotBase, pilotSchema, type PilotData } from './pilot-data.js';
import { exportJson } from './export-json.js';
import { StudScene } from '../scene/stud-scene.js';
import '../presentation/reviewer.css';
import { z } from 'zod';
import { loadPackage } from './package-loader.js';
import { ManualScreen } from '../presentation/manual-screen.js';
import { toStepViewModel } from '../presentation/manual-contract.js';
import { createManualSession,confirmStep,type ManualSession } from './manual-session.js';
import type { Repair } from '../domain/schema.js';

const candidatesSchema=z.array(z.object({id:z.string(),piece:z.string(),axis:z.array(z.number()),proposedStrokeMm:z.number(),
    transverseJoints:z.string().array(),exitAssessment:z.string().array().nullable().optional(),
    contacts:z.array(z.object({obstacle:z.string(),witness:z.object({fromMm:z.number(),toMm:z.number()}).nullable()}))}));

const zero: [number,number,number] = [0,0,0];
export function Reviewer() {
    const [base,setBase] = useState<AssemblyModel>();
    const [geometry,setGeometry]=useState('');
    const [candidates,setCandidates]=useState<z.infer<typeof candidatesSchema>>([]);
    const [pilot,setPilot] = useState<PilotData>();
    const [patch,setPatch] = useState<ReviewPatch>();
    const [selected,select] = useState(''), [option,setOption] = useState('release');
    const [obstacle,setObstacle] = useState(''), [reason,setReason] = useState('');
    const [subjectKind,setSubjectKind]=useState<'connection'|'occurrence'>('connection');
    const [pose,setPose]=useState(''), [previewId,setPreviewId]=useState('');
    const [message,setMessage] = useState(''), [outcome,setOutcome] = useState<PlanOutcome>();
    const last = useRef<string|null>(null), seq = useRef(0);
    const [rehearsal,setRehearsal]=useState<{repair:Repair;session:ManualSession}>();
    const [motionReplay,replayMotion]=useState(0),[viewReset,resetView]=useState(0);
    const resolved=useMemo(()=>base && patch ? applyReview(base,patch).model : undefined,[base,patch]);
    const key = (b:AssemblyModel) => `restart:draft:${b.source.datasetRevision}:${b.graphRevision}`;
    useEffect(()=>{
        const abort = new AbortController();
        let url:string|undefined;
        loadPackage(pilotBase,abort.signal).then(bundle=>{
            if(abort.signal.aborted) return;
            const {model:b,pilot:d,candidates:c}=bundle;
            url=URL.createObjectURL(bundle.geometry);setGeometry(url);
            const requested=new URLSearchParams(window.location.hash.split('?')[1]).get('piece');
            setBase(b); setPilot(d); select(b.occurrences.some(o=>o.id===requested)?requested!:d.target);
            setCandidates(candidatesSchema.parse(c));
            let initial:ReviewPatch={schemaVersion:1,baseDatasetRevision:b.source.datasetRevision,baseGraphRevision:b.graphRevision,edits:[]};
            try {
                last.current=localStorage.getItem(key(b));
                if(last.current) {
                    const loaded=reviewPatchSchema.parse(JSON.parse(last.current));
                    if(!applyReview(b,loaded).model) throw new Error();
                    initial=loaded;
                }
            } catch {setMessage('Saved draft unavailable. Export a copy of any new edits.');}
            setPatch(initial);
        }).catch(e=>{if(!abort.signal.aborted) setMessage(String(e));});
        return ()=>{abort.abort();if(url) URL.revokeObjectURL(url);};
    },[]);
    useEffect(()=>{
        if(!base || !patch || !pilot) return;
        const worker=new Worker(new URL('./preview-worker.ts',import.meta.url),{type:'module'});
        const token=++seq.current; setOutcome(undefined);
        worker.onmessage=e=>{
            if(e.data.seq!==seq.current) return;
            if(e.data.error) setMessage(e.data.error);
            else if(e.data.revision===base.graphRevision) setOutcome(e.data.outcome);
        };
        worker.onerror=()=>setMessage('Preview failed; baseline is still available.');
        const manual=[pilot.repair,...pilot.alternatives].find(r=>r.targetIds[0]===previewId) ?? pilot.repair;
        worker.postMessage({seq:token,model:base,patch,target:manual.targetIds[0],check:manual.functionCheckId});
        return ()=>{seq.current++;worker.terminate();};
    },[base,patch,pilot,previewId]);
    if(!base || !pilot || !patch) return <main className="reviewer"><h1>Repair reviewer</h1><p>{message || 'Loading assembly…'}</p></main>;
    const model=resolved!;
    const op=model.operations.find(o=>o.id===option)!;
    const connections=model.connections.filter(c=>c.a===selected || c.b===selected);
    const obstacleId=obstacle || model.connections[0]!.id;
    const movable=model.occurrences.filter(p=>p.kind==='piece' && model.poses.some(s=>s.occurrenceId===p.id && s.kind!=='installed'));
    const selectedObstacle=subjectKind==='connection'?obstacleId:(obstacle || movable[0]!.id);
    const clearPoses=model.poses.filter(p=>p.occurrenceId===selectedObstacle && p.kind!=='installed');
    const baseline=[pilot.repair,...pilot.alternatives].find(r=>r.targetIds[0]===previewId) ?? pilot.repair;
    const update=(value:unknown)=>{
        const result=applyReview(base,value);
        if(!result.model) {setMessage(result.issues.join('; '));return;}
        const next=reviewPatchSchema.parse(value);
        try {
            if(localStorage.getItem(key(base))!==last.current) {setMessage('Another tab changed this draft. Reload before saving.');return;}
            const text=JSON.stringify(next); localStorage.setItem(key(base),text);last.current=text;setMessage('Draft saved locally.');
        } catch {setMessage('Storage unavailable; draft kept in memory. Export it before closing.');}
        setOutcome(undefined);setPatch(next);
    };
    const edit=(decision:ReviewEdit['decision'],relation?:string)=>{
        const id=crypto.randomUUID(), evidence={tier:'generated' as const,source:`local-draft:${id}`};
        const item:ReviewEdit={id,decision,targetOperationId:option,author:'local reviewer',reason,evidence,
            ...(decision==='add' ? {requirement:{id,subject:{kind:subjectKind,id:selectedObstacle},acceptable:[subjectKind==='connection'?'released':pose || clearPoses[0]!.id],role:'blocker',reason,evidence}} : {removesRequirementId:relation!})};
        update({...patch,edits:[...patch.edits,item]});
    };
    if(rehearsal) {
        const step=rehearsal.session.current;
        const offsets=Object.fromEntries(rehearsal.repair.steps.slice(0,rehearsal.session.confirmedCount).flatMap(s=>pilot.paths[s.operationId] ? [[pilot.movers[s.operationId]!,pilot.paths[s.operationId]![1]]]:[]));
        const path=step && pilot.paths[step.operationId];
        return <><header className="draft-banner"><strong>Local rehearsal</strong> · Draft state replay only. <button onClick={()=>setRehearsal(undefined)}>Back to reviewer</button></header>
            {step ? <ManualScreen step={toStepViewModel(step,rehearsal.session.total,{canConfirm:true})} scene={<StudScene url={geometry} target={pilot.movers[step.operationId] ?? rehearsal.repair.targetIds[0]!} start={path?.[0]??zero} end={path?.[1]??zero} offsets={offsets} focus={true} replay={motionReplay} reset={viewReset} onPick={()=>{}}/>}
                actions={{confirmStep:id=>setRehearsal(s=>s && {...s,session:confirmStep(s.session,id)}),resetCamera:()=>resetView(n=>n+1),replayMotion:()=>replayMotion(n=>n+1),returnToCurrentStep:()=>resetView(n=>n+1)}}/> : <h1>Rehearsal complete</h1>}</>;
    }
    const tree=(parent:string):React.ReactNode=>model.occurrences.filter(o=>o.parent===parent).map(p=>p.kind==='piece'?<li key={p.id}><button onClick={()=>select(p.id)}>{p.commonName} — {p.id.split('/').at(-1)}</button></li>:
        <li key={p.id}><details><summary>{p.commonName}</summary><ul>{tree(p.id)}</ul></details></li>);
    return <main className="reviewer" data-route="review"><header><a href="#/">Mechanic manual</a><h1>Repair reviewer</h1>
        <p>Inspect a connection, then test what happens if a move needs it released.</p></header>
        <section><h2>Assembly relationships</h2><label>Occurrence <select value={selected} onChange={e=>select(e.target.value)}>
            {model.occurrences.map(p=><option key={p.id} value={p.id}>{p.commonName} — {p.id}</option>)}</select></label>
        <details><summary>Browse assembly hierarchy</summary><ul>{tree('30465')}</ul></details>
        <AssemblyDiagram model={model} id={selected} select={select}/>
        {model.occurrences.some(p=>p.id===selected && p.kind==='piece') && <div className="review-scene"><StudScene url={geometry}
            target={selected} start={zero} end={zero} focus={true} replay={0} reset={0} onPick={()=>{}}/></div>}
        <details><summary>{connections.length} generated contacts</summary><ul>{connections.map(c=><li key={c.id}>{c.kind}: {c.a} ↔ {c.b}</li>)}</ul></details>
        <h2>Proposed exit directions</h2><p>These straight strokes were tested against installed meshes. A contact may be a mating surface or a blocker; stop, tools and return still need review.</p>
        {candidates.filter(c=>c.piece===selected).map(c=><details key={c.id}><summary>{c.proposedStrokeMm.toFixed(2)} mm along [{c.axis.map(v=>Number(v.toFixed(2))).join(', ')}]</summary>
            <p>{c.transverseJoints.length?`${c.transverseJoints.length} transverse interfaces need a separate access move.` :
                c.exitAssessment ? `${c.exitAssessment.length} unresolved obstacles after checking the modeled mating fits.` : 'Fit-specific replay not recorded.'}</p>
            <ul>{c.contacts.filter(k=>k.witness).map(k=><li key={k.obstacle}>{k.obstacle}: contact at {k.witness!.fromMm.toFixed(2)}–{k.witness!.toMm.toFixed(2)} mm</li>)}</ul></details>)}</section>
        <section><h2>Review a move</h2><label>Move option <select value={option} onChange={e=>setOption(e.target.value)}>{model.operations.map(o=><option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
        <label>Blocker type <select value={subjectKind} onChange={e=>{setSubjectKind(e.target.value as typeof subjectKind);setObstacle('');setPose('');}}><option value="connection">Connection</option><option value="occurrence">Piece in the way</option></select></label>
        {subjectKind==='connection' ? <label>Connection that must be released <select value={obstacleId} onChange={e=>setObstacle(e.target.value)}>{model.connections.map(c=><option key={c.id} value={c.id}>{c.a} ↔ {c.b}</option>)}</select></label> : <>
        <label>Obstacle piece <select value={selectedObstacle} onChange={e=>{setObstacle(e.target.value);setPose('');}}>{movable.map(p=><option key={p.id} value={p.id}>{p.commonName} — {p.id}</option>)}</select></label>
        <label>Clear state <select value={pose || clearPoses[0]?.id} onChange={e=>setPose(e.target.value)}>{clearPoses.map(p=><option key={p.id}>{p.id}</option>)}</select></label></>}
        <label>Reason <input value={reason} onChange={e=>setReason(e.target.value)}/></label>
        <button disabled={!reason.trim()} onClick={()=>edit('add')}>Add blocker</button>
        <details><summary>{op.requires.length} prerequisites</summary><ul>{op.requires.map(r=><li key={r.id}>{r.reason} — {r.subject.id}
            <button disabled={!reason.trim()} onClick={()=>edit('accept',r.id)}>Accept</button>
            <button disabled={!reason.trim()} onClick={()=>edit('reject',r.id)}>Reject</button></li>)}</ul></details>
        <h2>Repair preview</h2><label>Preview target <select value={baseline.targetIds[0]} onChange={e=>setPreviewId(e.target.value)}>{[pilot.repair,...pilot.alternatives].map(r=><option key={r.targetIds[0]} value={r.targetIds[0]}>{model.occurrences.find(o=>o.id===r.targetIds[0])?.commonName}</option>)}</select></label>
        <p>Baseline: {baseline.steps.length} steps, {baseline.disturbedCount} healthy pieces disturbed. {baseline.search.status}; timing {baseline.timing.coverage}.</p>
        <p role="status">{outcome ? outcome.repair ? `Draft: ${outcome.repair.steps.length} steps, ${outcome.repair.disturbedCount} healthy pieces disturbed. ${outcome.search.status}; replay ${outcome.repair.replay.ok?'passed':'failed'}. Timing: ${outcome.repair.timing.coverage}.` :
            `${outcome.search.status}: ${outcome.search.firstUnsatisfied.map(r=>r.reason).join('; ')}` : 'Computing preview…'}</p>
        <ol>{outcome?.repair?.steps.map(s=><li key={s.stepId}>{s.instruction}</li>)}</ol>
        {outcome?.repair && <><p>Added moves: {outcome.repair.operationIds.filter(o=>!baseline.operationIds.includes(o)).join(', ') || 'none'}. Removed moves: {baseline.operationIds.filter(o=>!outcome.repair!.operationIds.includes(o)).join(', ') || 'none'}.</p>
            <button onClick={()=>setRehearsal({repair:outcome.repair!,session:createManualSession(outcome.repair!)})}>Rehearse draft locally</button></>}
        <button onClick={()=>exportJson('review-patch.json',patch)}>Export draft</button>
        <button onClick={()=>exportJson('resolved-graph.json',model)}>Export graph</button>
        <button onClick={()=>update({...patch,edits:[]})}>Restore baseline</button>
        <label>Import draft <input type="file" accept="application/json" onChange={async e=>{
            const f=e.target.files?.[0]; if(!f)return;
            try {update(JSON.parse(await f.text()));} catch {setMessage('Malformed draft. Existing edits kept.');}
        }}/></label><p aria-live="polite">{message}</p></section></main>;
}
