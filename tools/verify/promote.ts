import { createHash } from 'node:crypto';
import { mkdir,mkdtemp,readFile,rename,rm,writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { assemblyModelSchema,repairSchema,type Vec3 } from '../../src/domain/schema.js';
import { planRepair } from '../../src/domain/planner.js';
import { verifyStage } from '../compile/stage.js';
import { checkSite } from './site.js';
import { PIN,TARGET } from '../pilot/geometry.js';
import type { ImportPackage } from '../import/build-package.js';

const hash=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
const browser=z.object({version:z.string().min(1),operatingSystemVersion:z.string().min(1),testedUrl:z.url().startsWith('https://'),buildRevision:z.string().regex(/^[a-f0-9]{7,64}$/),datasetGeneration:z.string().regex(/^[a-f0-9]{64}$/),fullRepair:z.literal(true),draftRoundTrip:z.literal(true),hardRefresh:z.literal(true)});
const acceptance=z.object({windowsEdge:browser,macosSafari:browser});

/** Explicit promotion only. Compare the immutable staged bytes and hands-on
 * records before writing; replace the small channel pointer last. */
const [generation,acceptanceFile]=process.argv.slice(2);
if(!generation || !/^[0-9a-f]{64}$/.test(generation) || !acceptanceFile) throw new Error('Usage: model:publish -- <generation hash> <browser-acceptance.json>');
const directory=join('.staging/30465',generation), verified=await verifyStage(directory);
if(!verified.releaseReady) throw new Error('Publication requires 70 reviewed replays and three linked uncoached trials. Current public channel unchanged.');
const signed=acceptance.parse(JSON.parse(await readFile(acceptanceFile,'utf8')));
if(Object.values(signed).some(v=>v.datasetGeneration!==generation) || signed.windowsEdge.testedUrl!==signed.macosSafari.testedUrl || signed.windowsEdge.buildRevision!==signed.macosSafari.buildRevision) throw new Error('Browser records do not identify the same release');
const manifest=JSON.parse(await readFile(join(directory,'manifest.json'),'utf8'));
const bytes=(kind:string)=>readFile(join(directory,manifest.files[kind]));
const model=assemblyModelSchema.parse(JSON.parse((await bytes('graph')).toString()));
const repairs=repairSchema.array().parse(JSON.parse((await bytes('manuals')).toString()));
const catalog=JSON.parse((await bytes('inventory')).toString()) as ImportPackage['catalog'];
const poses=new Map(model.poses.map(p=>[p.id,p])),members=new Map(model.occurrences.map(p=>[p.id,p]));
const paths:Record<string,Vec3[]>={},movers:Record<string,string>={};
for(const op of model.operations) {
    const home=poses.get(members.get(op.members[0]!)!.installedPoseId)!;
    const motion=model.motions.find(m=>m.id===op.motionId)!;
    if(op.members.length!==1 || motion.frames.length!==2 || motion.frames.some(f=>f.frame.rotation.some((n,i)=>Math.abs(n-home.frame.rotation[i]!)>1e-8))) throw new Error(`No validated browser adapter for ${op.id}`);
    paths[op.id]=motion.frames.map(f=>f.frame.translation.map((v,i)=>v-home.frame.translation[i]!) as Vec3);movers[op.id]=op.members[0]!;
}
const primary=repairs.find(r=>r.targetIds[0]===TARGET)!;
const joint=planRepair(model,[PIN,TARGET],{maxExpandedStates:100000,allowIncumbent:true},{functionCheckId:'pin-fit'}).repair;
if(!joint?.replay.ok) throw new Error('Joint demo no longer replays');
const root='public/models/30465',releases=join(root,'releases');
await mkdir(releases,{recursive:true});const temp=await mkdtemp(join(releases,'.incoming-'));
try {
    const emit=async(name:string,b:Buffer|string)=>{await writeFile(join(temp,name),b);return {name,sha256:hash(b)};};
    const geometry=await emit(manifest.files.geometry,await bytes('geometry'));
    const graph=await emit('graph.json',await bytes('graph'));
    const candidates=await emit('motion-candidates.json',await bytes('candidates'));
    const manuals=await emit('light-stud.json',JSON.stringify({geometry:geometry.name,target:TARGET,pin:PIN,paths,movers,repair:primary,jointRepair:joint,alternatives:repairs.filter(r=>r!==primary),
        inventory:catalog.inventory.flatMap(t=>t.occurrenceIds.map(id=>({id,name:t.stepName,color:t.color,elementId:t.elementId}))),evidence:Object.fromEntries(verified.rows.map(r=>[r.target,r.evidence]))}));
    await emit('index.json',JSON.stringify({schema:'restart.pilot/1',revision:model.graphRevision,geometry,graph,candidates,manuals}));
    await emit('acceptance.json',JSON.stringify({generation,...signed}));
    if(await checkSite(temp)!==70) throw new Error('Incomplete static site');
    await rename(temp,join(releases,generation));
    const pointer=join(root,`channel-${process.pid}.tmp`);
    await writeFile(pointer,JSON.stringify({schemaVersion:1,stage:'release',path:`releases/${generation}/`}));
    await rename(pointer,join(root,'channel.json'));
    console.log(`Selected ${generation} for the next static build.`);
} finally {await rm(temp,{recursive:true,force:true});}
