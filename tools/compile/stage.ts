import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { z } from 'zod';
import { assemblyModelSchema, datasetManifestSchema, repairSchema, type Repair } from '../../src/domain/schema.js';
import { planRepair } from '../../src/domain/planner.js';
import { replay } from '../../src/domain/replay.js';
import { procedureFingerprint } from '../../src/domain/fingerprint.js';
import { applyReview } from '../../src/domain/review.js';
import { buildImportPackage, type ImportPackage } from '../import/build-package.js';
import { inspectAssemblyGlb } from '../lib/glb.js';
import { STEP_SHA256 } from '../lib/step-tree.js';
import { checkStudGeometry, TARGET, PIN } from '../pilot/geometry.js';
import { checkPinGeometry } from '../pilot/pin-geometry.js';
import { buildStudCandidate } from '../pilot/stud-candidate.js';
import { measureCandidates } from './candidates.js';
import { ledgerSchema, evaluateEvidence } from '../../src/domain/evidence.js';
import { catalogSchema,extendCatalog } from './motion-catalog.js';
import { verifyTranslationJob } from '../verify/route-geometry.js';
import { partialStrokes } from './partial-strokes.js';
import { moduleSurvey } from './modules.js';
import { inspectExits } from './exposed.js';

const source = 'assets/lego-helicopter-30465-1.snapshot.9/STEP File Assembly - Lego Helicopter - 30465.STEP';
const digest = (v: Uint8Array | string) => createHash('sha256').update(v).digest('hex');
const manifestSchema = datasetManifestSchema.extend({
    files: datasetManifestSchema.shape.files.extend({ candidates:z.string(),evidence:z.string(),exitSurvey:z.string(),partial:z.string(),modules:z.string() })
});

export async function stageAssembly(root: string, patch?: unknown) {
    const input = await buildImportPackage(source);
    const authors=catalogSchema.parse(JSON.parse(await readFile('data/review/motions.json','utf8')));
    const built=await buildStudCandidate(input);
    const base = extendCatalog(built.model,authors);
    const result = patch === undefined ? {model:base,issues:[]} : applyReview(base,patch);
    if (!result.model) throw new Error(result.issues.join('\n'));
    const model = result.model;
    const manuals: Repair[] = [];
    const missing: string[] = [];
    for (const p of input.catalog.pieces) {
        const route = planRepair(model,[p.id],{maxExpandedStates:100000,allowIncumbent:true},{functionCheckId:authors.targetChecks[p.id] ?? built.checks[p.id] ?? (p.id===PIN?'pin-fit':p.id===TARGET?'stud-fit':null)});
        if (route.repair?.replay.ok) manuals.push(route.repair);
        else missing.push(p.id);
    }
    await mkdir(root,{recursive:true});
    const temp = await mkdtemp(join(root,'.generation-'));
    const hashes: Record<string,string> = {};
    const file = async (name: string, value: Uint8Array | string, ext='json') => {
        const hash = digest(value), filename = `${name}-${hash}.${ext}`;
        hashes[name] = hash;
        await writeFile(join(temp,filename),value);
        return filename;
    };
    try {
        const files = {
            geometry:await file('geometry',input.glb,'glb'),
            graph:await file('graph',JSON.stringify(model)),
            inventory:await file('inventory',JSON.stringify(input.catalog)),
            evidence:await file('evidence',JSON.stringify(ledgerSchema.parse(JSON.parse(await readFile('data/review/procedures.json','utf8'))))),
            candidates:await file('candidates',JSON.stringify(await measureCandidates(input))),
            exitSurvey:await file('exitSurvey',JSON.stringify(built.survey)),
            partial:await file('partial',JSON.stringify(partialStrokes(input.catalog,built.survey))),
            modules:await file('modules',JSON.stringify(await moduleSurvey(input))),
            manuals:await file('manuals',JSON.stringify(manuals))
        };
        const manifest = JSON.stringify(manifestSchema.parse({schemaVersion:1, datasetRevision:model.source.datasetRevision,
            graphRevision:model.graphRevision,source:model.source,files,hashes,coverage:{targets:input.catalog.pieces.length,solved:manuals.length,unresolved:missing}}));
        await writeFile(join(temp,'manifest.json'),manifest);
        const directory = join(root,digest(manifest));
        try { await rename(temp,directory); } catch (e) {
            if (!['EEXIST','ENOTEMPTY'].includes((e as NodeJS.ErrnoException).code ?? '')) throw e;
            if (await readFile(join(directory,'manifest.json'),'utf8') !== manifest) throw e;
        }
        return directory;
    } finally { await rm(temp,{recursive:true,force:true}); }
}

export async function verifyStage(directory: string) {
    const raw = await readFile(join(directory,'manifest.json'),'utf8');
    if (digest(raw)!==basename(directory)) throw new Error('Manifest hash mismatch');
    const manifest = manifestSchema.parse(JSON.parse(raw));
    const blobs = new Map<string,Buffer>();
    for (const [key,name] of Object.entries(manifest.files)) {
        const hash = manifest.hashes[key];
        if (!hash || !/^[a-f0-9]{64}$/.test(hash) || name!==`${key}-${hash}.${key==='geometry'?'glb':'json'}`) throw new Error(`Invalid ${key} hash or filename`);
        const bytes = await readFile(join(directory,name));
        if (digest(bytes)!==hash) throw new Error(`${key} hash mismatch`);
        blobs.set(key,bytes);
    }
    const json = (key:string): unknown => JSON.parse(blobs.get(key)!.toString());
    const model = assemblyModelSchema.parse(json('graph'));
    extendCatalog(model,{schemaVersion:1,baseSourceSha256:model.source.stepSha256,poses:[],operations:[],motions:[],checks:[],targetChecks:{}});
    if (model.source.stepSha256!==STEP_SHA256 || model.source.datasetRevision!==manifest.hashes.geometry ||
        manifest.datasetRevision!==model.source.datasetRevision || model.graphRevision!==manifest.graphRevision) throw new Error('Mixed generation');
    const geometry = blobs.get('geometry')!;
    const inspection = await inspectAssemblyGlb(geometry);
    const ids = inspection.instances.map(i=>i.instanceId).sort();
    const pieces = model.occurrences.filter(o=>o.kind==='piece').map(p=>p.id).sort();
    if (ids.length!==70 || new Set(ids).size!==70 || inspection.problems.length || JSON.stringify(ids)!==JSON.stringify(pieces)) throw new Error('Incomplete occurrence crosswalk');
    const manuals = repairSchema.array().parse(json('manuals'));
    const missing=ids.filter(id=>!manuals.some(r=>r.targetIds[0]===id));
    if(manifest.coverage.targets!==ids.length || manifest.coverage.solved!==manuals.length || JSON.stringify([...manifest.coverage.unresolved].sort())!==JSON.stringify(missing)) throw new Error('Coverage disagrees with serialized manuals');
    const survey=z.array(z.object({piece:z.string(),id:z.string(),obstructions:z.string().array()})).parse(json('exitSurvey'));
    if (manuals.some(r=>r.targetIds.length!==1 || !ids.includes(r.targetIds[0]!)) || new Set(manuals.map(r=>r.targetIds[0])).size!==manuals.length) throw new Error('Duplicate or invalid manual target');
    const rows = [];
    const ledger=ledgerSchema.parse(json('evidence'));
    const measured = await checkStudGeometry(geometry);
    const pinFit = await checkPinGeometry(geometry);
    for (const target of ids) {
        const repair = manuals.find(r=>r.targetIds[0]===target);
        const reason = repair ? 'Contact allowance, finger access and return need team review' : 'No validated release/exchange/return catalog for this target';
        if (!repair) { rows.push({target,status:'missing-motion',reason,proposedExits:survey.filter(c=>c.piece===target).map(c=>({option:c.id,unresolvedContacts:c.obstructions}))}); continue; }
        if (repair.graphRevision!==model.graphRevision || repair.datasetRevision!==model.source.datasetRevision ||
            !replay(model,repair).ok || repair.procedureFingerprint!==procedureFingerprint(model,[target],repair.operationIds,repair.functionCheckId)) throw new Error(`Invalid replay: ${target}`);
        if(!repair.functionCheckId || !model.functionChecks.some(c=>c.id===repair.functionCheckId)) throw new Error(`Missing function check: ${target}`);
        if (![TARGET,PIN].includes(target)) {
            const catalog=json('inventory') as ImportPackage['catalog'];
            const issues=await verifyTranslationJob(geometry,model,repair,catalog.joints);
            if(issues.length) { rows.push({target,status:'invalid-path',reason:issues.join('; ')});continue; }
        } else {
        const expected=target===TARGET ? [[0,-measured.travel],[-measured.travel,-measured.travel],[-measured.travel,0]] :
            [[0,-pinFit.park],[0,-pinFit.travel],[-pinFit.travel,-pinFit.travel],[-pinFit.travel,0],[-pinFit.park,0]];
        const members=target===TARGET ? [TARGET,TARGET,TARGET] : [TARGET,PIN,PIN,PIN,TARGET];
        const sequence=target===TARGET?'release,exchange,reseat':'park-cap,withdraw-pin,swap-pin,return-pin,return-cap';
        if (repair.operationIds.join()!==sequence) throw new Error(`Unknown sequence for ${target}`);
        repair.operationIds.forEach((id,i) => {
            const motion = model.motions.find(m=>m.id===model.operations.find(o=>o.id===id)?.motionId);
            const stud = measured.pieces.find(p=>p.id===members[i])!;
            if (motion?.frames.length!==2 || motion.curveFrame!=='assembly' || motion.members.join()!==members[i]) throw new Error(`Unexpected motion: ${id}`);
            motion.frames.forEach(({frame},j) => {
                const want = [...stud.frame.translation]; want[0]! += expected[i]![j]!;
                if (frame.translation.some((v,k)=>Math.abs(v-want[k]!)>1e-6) ||
                    frame.rotation.some((v,k)=>Math.abs(v-stud.frame.rotation[k]!)>1e-8)) throw new Error(`Unverified path: ${id}`);
            });
        });
        }
        const evidence=evaluateEvidence(repair,ledger,true);
        rows.push({ target,status:evidence.reviewed?'reviewed-and-replayed':'pending-review',reason:evidence.reviewed?'Procedure matches the team review':reason,evidence,fingerprint:repair.procedureFingerprint,disturbed:repair.disturbedIds,steps:repair.steps.length,search:repair.search.status,timing:repair.timing.coverage });
    }
    return { generation:basename(directory), modelComplete:rows.every(r => r.status==='reviewed-and-replayed'),
        releaseReady:rows.every(r=>r.status==='reviewed-and-replayed') && rows.filter(r=>r.evidence?.physicallyVerified).length>=3, rows };
}
