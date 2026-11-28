import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { assemblyModelSchema } from '../../src/domain/schema.js';
import { procedureFingerprint } from '../../src/domain/fingerprint.js';
import { replay } from '../../src/domain/replay.js';
import { datasetManualSchema } from '../../src/app/pilot-data.js';
import { inspectAssemblyGlb } from '../lib/glb.js';
import { sha256 } from './import.js';

const entry=z.object({name:z.string().regex(/^[a-z0-9-]+\.(json|glb)$/),sha256:z.string().regex(/^[a-f0-9]{64}$/)});
export const scannerIndex=z.object({datasetId:z.literal('4000041'),schema:z.literal('restart.dataset/2'),revision:z.string(),manuals:entry,graph:entry,geometry:entry,candidates:entry,credits:entry.optional()});

/** No Studio, STEP or staging workspace needed on the static host. */
export async function readScannerGeneration(base:string,generation:string) {
    const index=await readFile(join(base,'index.json'));
    if(sha256(index)!==generation) throw new Error('Candidate index hash mismatch');
    const meta=scannerIndex.parse(JSON.parse(index.toString()));
    const bytes=async(e:z.infer<typeof entry>)=>{const b=await readFile(join(base,e.name));if(sha256(b)!==e.sha256)throw new Error(`Hash mismatch: ${e.name}`);return b;};
    const model=assemblyModelSchema.parse(JSON.parse((await bytes(meta.graph)).toString()));
    const manuals=datasetManualSchema.parse(JSON.parse((await bytes(meta.manuals)).toString()));
    await bytes(meta.candidates);
    if(meta.credits) await bytes(meta.credits);
    const glb=await bytes(meta.geometry);
    if(model.graphRevision!==meta.revision || model.source.datasetRevision!==sha256(glb) || manuals.geometry!==meta.geometry.name) throw new Error('CT package revision mismatch');
    return {meta,glb,model,manuals};
}

export async function checkScannerSite(root:string) {
    const channel=z.object({schemaVersion:z.literal(1),stage:z.literal('candidate'),path:z.string().regex(/^candidates\/[0-9a-f]{64}\/$/)}).parse(JSON.parse(await readFile(join(root,'channel.json'),'utf8')));
    const {model,manuals,glb}=await readScannerGeneration(join(root,channel.path),channel.path.split('/')[1]!);
    const report=await inspectAssemblyGlb(glb),ids=report.instances.map(p=>p.instanceId).sort();
    if(report.problems.length || ids.length!==566 || JSON.stringify(ids)!==JSON.stringify(manuals.inventory.map(p=>p.id).sort()) ||
        JSON.stringify(ids)!==JSON.stringify(model.occurrences.filter(o=>o.kind==='piece').map(o=>o.id).sort())) throw new Error('CT inventory mismatch');
    for(const job of Object.values(manuals.repairs)) {
        if(job.graphRevision!==model.graphRevision || job.datasetRevision!==model.source.datasetRevision || !replay(model,job).ok ||
            procedureFingerprint(model,job.targetIds,job.operationIds,job.functionCheckId)!==job.procedureFingerprint) throw new Error(`Invalid CT job: ${job.targetIds}`);
    }
    const poses=new Map(model.poses.map(p=>[p.id,p]));
    for (const op of model.operations) {
        const motion=model.motions.find(m=>m.id===op.motionId),lead=op.members[0]!;
        const home=poses.get(`${lead}/installed`)!,path=manuals.paths[op.id];
        if(!motion || motion.members.join()!==op.members.join() || manuals.movers[op.id]!==lead || !path || path.length!==motion.frames.length) throw new Error(`Wrong CT animation members: ${op.id}`);
        for(const [i,f] of motion.frames.entries()) if(f.frame.translation.some((v,j)=>Math.abs(v-home.frame.translation[j]!-path[i]![j]!)>1e-6) ||
            f.frame.rotation.some((v,j)=>Math.abs(v-home.frame.rotation[j]!)>1e-6)) throw new Error(`Wrong CT animation frame: ${op.id}`);
        for(const [assignments,offset] of [[op.from,path[0]!],[op.to,path.at(-1)!]] as const) for(const a of assignments) {
            const pose=poses.get(a.poseId)!,installed=poses.get(`${a.occurrenceId}/installed`)!;
            if(pose.frame.translation.some((v,j)=>Math.abs(v-installed.frame.translation[j]!-offset[j]!)>1e-6) ||
                pose.frame.rotation.some((v,j)=>Math.abs(v-installed.frame.rotation[j]!)>1e-6)) throw new Error(`Incorrect member endpoint: ${op.id}/${a.occurrenceId}`);
        }
    }
    console.log(`Static CT candidate intact: ${ids.length} pieces; ${Object.keys(manuals.repairs).length} modeled manuals.`);
    return {generation:channel.path.split('/')[1]!,repairs:Object.values(manuals.repairs)};
}
