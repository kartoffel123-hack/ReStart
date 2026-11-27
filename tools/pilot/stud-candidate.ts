import type { ImportPackage } from '../import/build-package.js';
import { checkStudGeometry, PIN, TARGET } from './geometry.js';
import { assemblyModelSchema, type Vec3 } from '../../src/domain/schema.js';
import { planRepair } from '../../src/domain/planner.js';
import { replay } from '../../src/domain/replay.js';
import { quaternionFromFrame } from '../lib/glb.js';
import { sha256Hex } from '../../src/domain/hash.js';
import { checkPinGeometry } from './pin-geometry.js';
import { addPinOperations } from './pin-model.js';
import { addInstalledExits } from '../compile/installed-exits.js';
import { addCrossBlockRepair, CROSS_BLOCK } from '../compile/cross-block.js';
import { verifyTranslationJob } from '../verify/route-geometry.js';

export async function buildStudCandidate({ report, glb, catalog }: ImportPackage) {
const { travel, radialClearance, pieces } = await checkStudGeometry(glb);
const joints = report.interfaces.aggregated.detail.filter(j => j.pieces.includes(TARGET));
const joint = joints[0];
if (pieces.length !== 70 || joints.length !== 1 || !joint?.pieces.includes(PIN)) throw new Error('Unexpected stud assembly');
const stud = pieces.find(p => p.id === TARGET)!;
const pin = pieces.find(p => p.id === PIN)!;
const installed = `${TARGET}/installed`, free = `${TARGET}/free`;
const evidence = { tier: 'generated', source: `${report.glb.sha256}:${joint.id}`, note: '0.06 mm local radial fit allowance; finger access not verified.' };
const check = { id: 'stud-fit', instruction: 'Gently check the light stud without turning the pin.', expectedBehaviour: 'the stud stays seated and the pin remains in place' };
const definitions = [
    { id: 'release', phase: 'remove', from: installed, to: free, start: 0, end: -travel, text: 'Hold the pin still and pull the light stud straight off its exposed end', stop: 'the stud is clear of the pin tip' },
    { id: 'exchange', phase: 'replace', from: free, to: free, start: -travel, end: -travel, text: 'Set the removed stud aside and take the matching spare', stop: 'the spare’s open bore faces the exposed pin' },
    { id: 'reseat', phase: 'restore', from: free, to: installed, start: -travel, end: 0, text: 'Support the pin and press the spare straight onto it', stop: 'the stud seats against the pin shoulder' }
];
const point = (x: number): Vec3 => [x, 0, 0];
const frame = (x: number) => ({ ...stud.frame, translation: [stud.frame.translation[0] + x, ...stud.frame.translation.slice(1)] });
const model = assemblyModelSchema.parse({
    schemaVersion: 1, graphRevision: 'candidate',
    source: { datasetRevision: report.glb.sha256, stepSha256: report.source.sha256, importerVersion: report.runtime.occtImportJs, tessellation: { ...report.options, units: 'mm' }, triangleCount: report.tessellation.triangles },
    occurrences: [
        ...catalog.modules.map(p => ({ id: p.id, definitionId:p.definitionId, definitionName:p.name, parent:p.id.split('/').slice(0,-1).join('/') || null, path:p.id.split('/'), kind:'assembly', installedPoseId:`${p.id}/installed`, meshId:null, typeKey:p.definitionId, commonName:p.name, locationLabel:p.name })),
        ...pieces.map(p => ({ id: p.id, definitionId: p.definitionId, definitionName: p.name, parent: p.id.split('/').slice(0,-1).join('/'), path: p.id.split('/'), kind: 'piece', installedPoseId: `${p.id}/installed`, meshId: p.id, typeKey: p.definitionId, commonName: p.name.split(' - ')[0], locationLabel: p.id === TARGET ? 'Exposed end of friction pin' : p.id.split('/').slice(0,-1).join('/') }))],
    poses: [...pieces.map(p => ({ id: `${p.id}/installed`, occurrenceId: p.id, kind: 'installed', frame: p.frame, curveFrame: 'assembly' })), { id: free, occurrenceId: TARGET, kind: 'detached', frame: frame(-travel), curveFrame: 'assembly' }],
    connections: catalog.joints.map(j => ({ id:j.id, a:j.pieces[0], b:j.pieces[1], origin:j.origin, axis:j.axis, installedEngaged:true, kind:j.kind, evidence:{tier:'generated',source:j.faces.map(f=>f.id).join(',')} })),
    tools: [{ id: 'fingers', name: 'Fingers', class: 'fingers', isBenchTool: true }],
    motions: definitions.map(d => ({
        id: d.id, members: [TARGET], curveFrame: 'assembly', toolId: 'fingers', evidence,
        frames: [{ atMm: 0, frame: frame(d.start) }, { atMm: Math.abs(d.end-d.start), frame: frame(d.end) }],
        sweep: { min: geometryMin(d.start, d.end), max: geometryMax(d.start, d.end) }
    })),
    operations: definitions.map(d => ({
        id: d.id, label: d.text, phase: d.phase, members: [TARGET], motionId: d.id, toolId: 'fingers', evidence,
        from: [{ occurrenceId: TARGET, poseId: d.from }], to: [{ occurrenceId: TARGET, poseId: d.to }],
        direction: point(Math.sign(d.end-d.start)), directionLabel: d.text, stopLandmark: d.stop, strokeMm: Math.abs(d.end-d.start),
        ...(d.id === 'release' ? { releasesConnectionIds: [joint.id], returnOperationId: 'reseat' } : {}),
        ...(d.id === 'exchange' ? { fitsReplacementOf: TARGET } : {}),
        ...(d.id === 'reseat' ? { establishesConnectionIds: [joint.id], isReturn: true } : {})
    })), functionChecks: [check]
});
for (const m of catalog.modules) model.poses.push({id:`${m.id}/installed`, occurrenceId:m.id, kind:'installed', curveFrame:'assembly', frame:{translation:[...m.worldPlacement.translation], rotation:[...quaternionFromFrame(m.worldPlacement)]}});
if (!model.occurrences.some(o => o.id === '30465')) {
    model.occurrences.unshift({ id:'30465',definitionId:'30465', definitionName:'Helicopter', parent:null,path:['30465'],kind:'assembly',installedPoseId:'30465/installed',meshId:null,typeKey:'assembly',commonName:'Helicopter',locationLabel:'Assembly' });
    model.poses.unshift({ id:'30465/installed',occurrenceId:'30465',kind:'installed',curveFrame:'assembly',frame:{ translation:[0,0,0],rotation:[0,0,0,1] }});
}
const pinGeometry=await checkPinGeometry(glb);
addPinOperations(model,pinGeometry.travel,pinGeometry.park,new Map(pieces.map(p=>[p.id,p.bounds])));
const bounds = new Map(pieces.map(p => [p.id, p.bounds]));
const {checks,survey}=await addInstalledExits({report,glb,catalog},model,bounds);
const crossBlock = addCrossBlockRepair(model, bounds, catalog.joints);
const crossBlockIssues = await verifyTranslationJob(glb, model, {operationIds:crossBlock.route}, catalog.joints);
if (crossBlockIssues.length) throw new Error(`Invalid cross-block route: ${crossBlockIssues.join('; ')}`);
checks[CROSS_BLOCK] = crossBlock.check;
model.graphRevision = sha256Hex(JSON.stringify(model));
const { repair } = planRepair(model, [TARGET], { maxExpandedStates: 1000, allowIncumbent: false });
if (!repair || !replay(model, repair).ok || repair.operationIds.join() !== 'release,exchange,reseat') throw new Error('Invalid light-stud repair');
const geometry = `geometry-${report.glb.sha256}.glb`;
const pinRepair=planRepair(model,[PIN],{maxExpandedStates:100000,allowIncumbent:true},{functionCheckId:'pin-fit'}).repair;
if(!pinRepair?.replay.ok || pinRepair.disturbedIds.join()!==TARGET) throw new Error('Pin route failed replay');
const jointRepair=planRepair(model,[PIN,TARGET],{maxExpandedStates:100000,allowIncumbent:true},{functionCheckId:'pin-fit'}).repair;
if(!jointRepair?.replay.ok || jointRepair.disturbedCount!==0 || !jointRepair.operationIds.includes('swap-parked-cap')) throw new Error('Shared-access repair failed replay');
const motionPaths=Object.fromEntries(model.operations.map(op=>{
    const origin=pieces.find(p=>p.id===op.members[0])!.frame.translation;
    const frames=model.motions.find(m=>m.id===op.motionId)!.frames;
    return [op.id,frames.map(f=>f.frame.translation.map((v,i)=>v-origin[i]!))];
}));
const exposedRepairs=Object.entries(checks).map(([id,check])=>{
    // The pilot needs a feasible manual, not a proof over all access histories.
    const r=planRepair(model,[id],{maxExpandedStates:id === CROSS_BLOCK ? 256 : 100000,allowIncumbent:true},{functionCheckId:check,...(id === CROSS_BLOCK ? {incumbentRoute:crossBlock.route} : {})}).repair;
    if(!r?.replay.ok) throw new Error(`Invalid axial exit: ${id}`);
    return r;
});
return {model,survey,checks, referenceRoutes:new Map([[CROSS_BLOCK,crossBlock.route]]), pilot:{
    geometry, target: TARGET, pin: PIN, signedRadialGapMm: radialClearance,
    paths: motionPaths, repair, alternatives:[pinRepair,...exposedRepairs], jointRepair, movers:Object.fromEntries(model.operations.map(op=>[op.id,op.members[0]!]))
}};

function geometryMin(a: number,b: number) { return [stud.bounds.min[0]+Math.min(a,b), ...stud.bounds.min.slice(1)]; }
function geometryMax(a: number,b: number) { return [stud.bounds.max[0]+Math.max(a,b), ...stud.bounds.max.slice(1)]; }
}
