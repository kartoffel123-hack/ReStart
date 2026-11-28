import { cp, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { NodeIO } from '@gltf-transform/core';
import { Matrix4, Quaternion } from 'three';
import { z } from 'zod';
import { replay } from '../../src/domain/replay.js';
import { procedureFingerprint } from '../../src/domain/fingerprint.js';
import { assertSurfaceCoverage,demoStage,gearTarget,isDemoSet,sha256 } from './import.js';
import { scannerEvidence } from './evidence.js';
import { readScannerGeneration } from './site.js';
import { installCandidate } from './generation.js';
import { gantryMeasurements,gantryRecipe } from './gantry-brick.js';

/** Read the staged bytes as a consumer. The source-to-STEP witness is independent
 * of the GLB and compiler. Never infer coverage from just the number of files. */
export async function verifyScanner(stage=demoStage) {
    const generation=(await readFile(join(stage,'candidate'),'utf8')).trim();
    if (!/^[a-f0-9]{64}$/.test(generation)) throw new Error('Invalid CT candidate pointer');
    const base=join(stage,'candidates',generation);
    const {model,manuals,glb,meta}=await readScannerGeneration(base,generation);
    const crosswalk=z.object({sha256:z.string(),records:z.record(z.string(),z.object({ref:z.string(),world:z.array(z.array(z.number()).length(4)).length(4)}))})
        .parse(JSON.parse(await readFile('.tmp/ct/fusion-demo.crosswalk.json','utf8')));
    if(crosswalk.sha256!==model.source.stepSha256 || sha256(await readFile('.tmp/ct/fusion-demo.step'))!==crosswalk.sha256) throw new Error('STEP revision mismatch');
    await assertSurfaceCoverage(crosswalk.sha256,[...new Set(Object.values(crosswalk.records).map(r=>r.ref))],true);
    const inventory=manuals.inventory.map(p=>p.id).sort(),expected=Object.keys(crosswalk.records).sort();
    const nodes=(await new NodeIO().readBinary(glb)).getRoot().listNodes();
    const sets=[inventory,nodes.map(n=>String(n.getExtras().instanceId)).sort(),model.occurrences.filter(o=>o.kind==='piece').map(o=>o.id).sort()];
    if(!isDemoSet(expected) || sets.some(s=>JSON.stringify(s)!==JSON.stringify(expected))) throw new Error('Incomplete CT demo inventory crosswalk');
    for (const n of nodes) {
        const id=String(n.getExtras().instanceId),w=crosswalk.records[id]!;
        const m=new Matrix4().fromArray(w.world.flat()).transpose();
        const q=new Quaternion().setFromRotationMatrix(m);
        if(!n.getMesh() || n.getExtras().definitionId!==w.ref || n.getWorldTranslation().some((v,i)=>Math.abs(v*1000-w.world[i]![3]!)>.1) ||
            q.angleTo(new Quaternion(...n.getWorldRotation()))>Math.PI/360) throw new Error(`Wrong geometry or placement: ${id}`);
    }
    const gantry=await gantryRecipe();
    const ids=Object.keys(manuals.repairs).sort();
    if(ids.join()!==gantry.target || manuals.defaultTarget!==gantry.target) throw new Error('Declared demo targets differ from the repair catalog');
    const moves=model.operations;
    const hard=manuals.repairs[gantry.target]!;
    const witness=await gantryMeasurements(join(base,meta.geometry.name),true);
    const groups=[...gantry.groups,{key:'brick',members:[gantry.target]}];
    const expectedOps=[...groups.map(g=>`gantry-${g.key}-remove`),'gantry-brick-replace',...groups.toReversed().map(g=>`gantry-${g.key}-restore`)];
    const expectedMoved=gantry.groups.flatMap(g=>g.members).sort();
    if(hard.operationIds.join()!==expectedOps.join() || hard.steps.at(-1)?.phase!=='check' || hard.functionCheckId!==gantry.check ||
        hard.disturbedCount!==10 || [...hard.disturbedIds].sort().join()!==expectedMoved.join() || hard.preservedUnits.filter(u=>u.outcome==='preserved-intact').length!==2) throw new Error('Incomplete gantry exchange or incorrect disturbance');
    for (const g of groups) for(const phase of (g.key==='brick'?['remove','replace','restore']:['remove','restore'])) {
        const id=`gantry-${g.key}-${phase}`,op=model.operations.find(o=>o.id===id)!;
        const motion=model.motions.find(m=>m.id===op.motionId)!,out=witness.paths[g.key]!,end=out.at(-1)!;
        const points=phase==='remove'?out:phase==='restore'?out.toReversed():[end,end];
        const lead=model.poses.find(p=>p.occurrenceId===g.members[0] && p.kind==='installed')!;
        if(!motion.evidence.note?.includes(witness.revision) || op.members.join()!==g.members.join() || motion.members.join()!==g.members.join() || manuals.movers[id]!==g.members[0] ||
            motion.frames.length!==points.length || JSON.stringify(manuals.paths[id])!==JSON.stringify(points)) throw new Error(`Incorrect group or trajectory at ${id}`);
        for(const [k,f] of motion.frames.entries()) if(f.frame.translation.some((v,j)=>Math.abs(v-lead.frame.translation[j]!-points[k]![j]!)>1e-6) ||
            f.frame.rotation.some((v,j)=>Math.abs(v-lead.frame.rotation[j]!)>1e-6)) throw new Error(`Motion differs from the checked bench path at ${id}`);
        for(const member of g.members) {
            const installed=model.poses.find(p=>p.id===`${member}/installed`)!,park=model.poses.find(p=>p.id===`${member}/crown-park`)!;
            if(!park || park.frame.translation.some((v,j)=>Math.abs(v-installed.frame.translation[j]!-end[j]!)>1e-6) ||
                park.frame.rotation.some((v,j)=>Math.abs(v-installed.frame.rotation[j]!)>1e-6)) throw new Error(`Member drift: ${member}`);
        }
    }
    await writeFile(join(stage,'gantry-access.json'),JSON.stringify({generation,...witness},null,2));
    const evidence=await Promise.all(ids.map(async id=>{
        const r=manuals.repairs[id]!;
        if(r.datasetRevision!==model.source.datasetRevision || r.graphRevision!==meta.revision || !replay(model,r).ok ||
            procedureFingerprint(model,r.targetIds,r.operationIds,r.functionCheckId)!==r.procedureFingerprint) throw new Error(`Invalid CT repair: ${id}`);
        const actual=await scannerEvidence(r,true),published=manuals.evidence?.[id];
        if(!published || JSON.stringify(published)!==JSON.stringify(actual)) throw new Error(`CT evidence does not match the reviewed ledger: ${id}`);
        return actual;
    }));
    const rows=inventory.map(id=>({id,status:ids.includes(id)?'model-replayed':'unavailable',reason:ids.includes(id)?'':id===gearTarget?'Turntable release, spare insertion and restored engagement not verified':'No reviewed removal and return motion',
        procedureFingerprint:manuals.repairs[id]?.procedureFingerprint??null,physicallyVerified:manuals.evidence?.[id]?.physicallyVerified??false}));
    await writeFile(join(stage,'verification.json'),JSON.stringify({generation,stepSha256:model.source.stepSha256,rows},null,2));
    console.log(`CT ${generation}: ${rows.length}/284 scoped source, STEP, GLB and inventory IDs; ${ids.length} complete modeled exchange; ${rows.length-ids.length} unavailable; ${evidence.filter(e=>e.physicallyVerified).length} physically verified. Buried brick ${hard.procedureFingerprint}; ${hard.disturbedCount} healthy pieces in two intact sections.`);
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
