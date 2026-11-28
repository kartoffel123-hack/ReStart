import { cp, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { NodeIO } from '@gltf-transform/core';
import { Matrix4, Quaternion } from 'three';
import { z } from 'zod';
import { replay } from '../../src/domain/replay.js';
import { procedureFingerprint } from '../../src/domain/fingerprint.js';
import { checkTile } from './tile-clearance.js';
import { assertSurfaceCoverage,ctStage } from './import.js';
import { readScope } from './compile.js';
import { scannerEvidence } from './evidence.js';
import { readScannerGeneration } from './site.js';
import { installCandidate } from './generation.js';

/** Read the staged bytes as a consumer. The source-to-STEP witness is independent
 * of the GLB and compiler. Never infer coverage from just the number of files. */
export async function verifyScanner(stage=ctStage) {
    const generation=(await readFile(join(stage,'candidate'),'utf8')).trim();
    if (!/^[a-f0-9]{64}$/.test(generation)) throw new Error('Invalid CT candidate pointer');
    const base=join(stage,'candidates',generation),scope=await readScope();
    const {model,manuals,glb,meta}=await readScannerGeneration(base,generation);
    const crosswalk=z.object({sha256:z.string(),records:z.record(z.string(),z.object({ref:z.string(),world:z.array(z.array(z.number()).length(4)).length(4)}))})
        .parse(JSON.parse(await readFile('.tmp/ct/fusion-4000041.crosswalk.json','utf8')));
    if(crosswalk.sha256!==model.source.stepSha256) throw new Error('STEP revision mismatch');
    await assertSurfaceCoverage(crosswalk.sha256,[...new Set(Object.values(crosswalk.records).map(r=>r.ref))]);
    const inventory=manuals.inventory.map(p=>p.id).sort(),expected=Object.keys(crosswalk.records).sort();
    const nodes=(await new NodeIO().readBinary(glb)).getRoot().listNodes();
    const sets=[inventory,nodes.map(n=>String(n.getExtras().instanceId)).sort(),model.occurrences.filter(o=>o.kind==='piece').map(o=>o.id).sort()];
    if(expected.length!==566 || sets.some(s=>JSON.stringify(s)!==JSON.stringify(expected))) throw new Error('Incomplete CT inventory crosswalk');
    for (const n of nodes) {
        const id=String(n.getExtras().instanceId),w=crosswalk.records[id]!;
        const m=new Matrix4().fromArray(w.world.flat()).transpose();
        const q=new Quaternion().setFromRotationMatrix(m);
        if(!n.getMesh() || n.getExtras().definitionId!==w.ref || n.getWorldTranslation().some((v,i)=>Math.abs(v*1000-w.world[i]![3]!)>.1) ||
            q.angleTo(new Quaternion(...n.getWorldRotation()))>Math.PI/360) throw new Error(`Wrong geometry or placement: ${id}`);
    }
    const ids=Object.keys(manuals.repairs);
    if(ids.length!==1 || ids[0]!==scope.candidate) throw new Error('Declared demo targets differ from the repair catalog');
    const job=manuals.repairs[scope.candidate]!;
    if(job.datasetRevision!==model.source.datasetRevision || job.graphRevision!==meta.revision || !replay(model,job).ok ||
        procedureFingerprint(model,job.targetIds,job.operationIds,job.functionCheckId)!==job.procedureFingerprint) throw new Error('CT repair replay/fingerprint mismatch');
    const moves=model.operations;
    const tile=scope.candidate;
    if(job.steps.map(s=>s.phase).join()!=='remove,replace,restore,check' || job.operationIds.join()!=='release,exchange,reseat' || job.disturbedIds.length || job.disturbedCount!==0) throw new Error('Not a complete single-tile exchange');
    const home=model.poses.find(p=>p.occurrenceId===tile && p.kind==='installed')!;
    for(const [i,id] of job.operationIds.entries()) {
        const op=moves.find(o=>o.id===id)!,motion=model.motions.find(m=>m.id===op.motionId)!;
        const ends=[[0,scope.travelMm],[scope.travelMm,scope.travelMm],[scope.travelMm,0]][i]!;
        if(op.members.join()!==tile || motion.members.join()!==tile || manuals.movers[id]!==tile || motion.frames.length!==2 ||
            (i===1 && op.fitsReplacementOf!==tile)) throw new Error(`Wrong mover or spare: ${id}`);
        for(const [k,f] of motion.frames.entries()) {
            const offset=[0,ends[k]!,0];
            if(f.frame.translation.some((v,j)=>Math.abs(v-home.frame.translation[j]!-offset[j]!)>1e-6) || f.frame.rotation.some((v,j)=>Math.abs(v-home.frame.rotation[j]!)>1e-6) ||
                manuals.paths[id]?.[k]?.some((v,j)=>Math.abs(v-offset[j]!)>1e-6)!==false) throw new Error(`Playback differs from verified stroke: ${id}`);
        }
    }
    await checkTile(glb,tile,scope.support,scope.travelMm);
    const evidence=await scannerEvidence(job,true);
    const published=manuals.evidence?.[tile];
    if(!published || published.physicallyVerified!==evidence.physicallyVerified || published.benchRecordId!==evidence.benchRecordId || published.reviewed!==evidence.reviewed || published.minimumUnderReviewedModel!==evidence.minimumUnderReviewedModel) throw new Error('CT evidence does not match the reviewed ledger');
    const rows=inventory.map(id=>({id,status:id===tile?'model-replayed':'unavailable',reason:id===tile?'':scope.open[id]??'No reviewed removal and return motion',
        procedureFingerprint:id===tile?job.procedureFingerprint:null,physicallyVerified:id===tile && evidence.physicallyVerified}));
    await writeFile(join(stage,'verification.json'),JSON.stringify({generation,stepSha256:model.source.stepSha256,rows},null,2));
    console.log(`CT ${generation}: ${rows.length}/566 source, STEP, GLB and inventory IDs; 1 complete modeled exchange; 565 unavailable; ${Number(evidence.physicallyVerified)} physically verified. ${job.procedureFingerprint}`);
    return {base,generation,evidence};
}

/** Opt-in local candidate URL. Nothing changes the default or the helicopter channel. */
export async function serveScannerCandidate() {
    const {base,generation}=await verifyScanner();
    const root='public/models/4000041',path=`candidates/${generation}/`;
    await installCandidate(root,generation,dir=>cp(base,dir,{recursive:true}));
    const temp=join(root,`channel-${randomUUID()}.tmp`);
    await writeFile(temp,JSON.stringify({schemaVersion:1,stage:'candidate',path}));await rename(temp,join(root,'channel.json'));
    console.log(`Staged locally at /?dataset=4000041#/`);
}
