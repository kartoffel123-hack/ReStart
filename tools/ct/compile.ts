import { readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { assemblyModelSchema, type RigidFrame } from '../../src/domain/schema.js';
import { planRepair } from '../../src/domain/planner.js';
import { demoStage, demoInventorySchema, sha256 } from './import.js';
import { readWorldMeshes } from '../pilot/geometry.js';
import { scannerEvidence } from './evidence.js';
import { installCandidate } from './generation.js';
import { addGantryJob, gantryMeasurements, gantryRecipe } from './gantry-brick.js';

export const demoScopeSchema=z.object({candidate:z.string(),support:z.string(),travelMm:z.number().positive(),tool:z.string(),remove:z.string(),exchange:z.string(),restore:z.string(),check:z.string(),open:z.record(z.string(),z.string())});
export const readScope=async()=>demoScopeSchema.parse(JSON.parse(await readFile('data/review/4000041/demo-targets.json','utf8')));
export const importedSchema=z.object({inventory:demoInventorySchema,geometry:z.string().regex(/^geometry-[a-f0-9]{64}\.glb$/),stepSha256:z.string().regex(/^[a-f0-9]{64}$/),triangles:z.number().int().positive()});

export async function compileScanner() {
    const source=importedSchema.parse(JSON.parse(await readFile(`${demoStage}/import.json`,'utf8')));
    const glb=await readFile(`${demoStage}/${source.geometry}`);
    const datasetRevision=sha256(glb);
    if(source.geometry!==`geometry-${datasetRevision}.glb`) throw new Error('Changed import geometry');
    const pieces=await readWorldMeshes(glb);
    const frames=new Map(pieces.map(p=>[p.id,p.frame]));
    if(frames.size!==pieces.length || frames.size!==source.inventory.pieces.length || source.inventory.pieces.some(p=>!frames.has(p.id))) throw new Error('Demo inventory differs from geometry');
    const blank:RigidFrame={translation:[0,0,0],rotation:[0,0,0,1]};
    const assemblyId='4000041';
    const groups=[...new Set(source.inventory.pieces.map(p=>p.group))];
    const occurrence=(id:string,name:string,ref:string,parent:string|null,piece:boolean,location:string)=>({id,definitionId:ref,definitionName:ref,parent,
        path:parent===null?[id]:parent===assemblyId?[assemblyId,id]:[assemblyId,parent,id],kind:piece?'piece':'assembly',installedPoseId:`${id}/installed`,meshId:piece?id:null,typeKey:ref,commonName:name,locationLabel:location});
    const occurrences=[occurrence(assemblyId,'CT scanner','4000041',null,false,'Assembly'),...groups.map(g=>occurrence(`${assemblyId}/${g}`,g,g,assemblyId,false,g)),
        ...source.inventory.pieces.map(p=>occurrence(p.id,p.name,p.ref,`${assemblyId}/${p.group}`,true,p.group==='MRI'?'Scanner gantry':p.group))];
    const model=assemblyModelSchema.parse({schemaVersion:1,graphRevision:'candidate',source:{datasetRevision,stepSha256:source.stepSha256,importerVersion:'Fusion STEP / OpenCascade 8.0.1',
        tessellation:{units:'mm',linearDeflection:.12,angularDeflection:.4},triangleCount:source.triangles},occurrences,
        poses:occurrences.map(o=>({id:o.installedPoseId,kind:'installed',curveFrame:'assembly',occurrenceId:o.id,frame:frames.get(o.id)??blank})),
        tools:[{id:'fingers',name:'Fingertips on the two opposed lips',class:'fingers',isBenchTool:true}],connections:[],motions:[],operations:[],functionChecks:[]});
    const gantry=await gantryRecipe();
    const measurements=await gantryMeasurements(join(demoStage,source.geometry),true);
    const hard=addGantryJob(model,new Map(pieces.map(p=>[p.id,p.bounds])),gantry,measurements);
    model.graphRevision=sha256(JSON.stringify(model));
    const repair=planRepair(model,[gantry.target],{maxExpandedStates:1000,allowIncumbent:true},{functionCheckId:gantry.check,incumbentRoute:hard.route}).repair;
    if(!repair?.replay.ok || repair.disturbedCount!==10 || repair.operationIds.join()!==hard.route.join()) throw new Error('Buried gantry repair failed');
    const manuals={defaultTarget:gantry.target,geometry:source.geometry,repairs:{[gantry.target]:repair},evidence:{[gantry.target]:await scannerEvidence(repair,true)},
        inventory:source.inventory.pieces.map(p=>({id:p.id,name:p.id===gantry.target?'Buried gantry support brick (1 × 4)':p.name,designNo:p.ref.replace(/\.dat$/,''),elementId:'',color:p.colorName})),
        paths:hard.paths,movers:Object.fromEntries(model.operations.map(op=>[op.id,op.members[0]!]))};
    const files=new Map<string,Buffer>();
    const entry=(name:string,bytes:Buffer)=>{files.set(name,bytes);return {name,sha256:sha256(bytes)};};
    const credits=z.object({definitions:z.record(z.string(),z.object({origin:z.string(),sha256:z.string(),credits:z.string().array()}))}).parse(JSON.parse(await readFile('.tmp/ct/source.json','utf8')));
    const attribution={library:'The LDraw Parts Library',terms:['https://creativecommons.org/licenses/by/2.0/','https://creativecommons.org/licenses/by/4.0/'],
        conversion:'Studio placement, surface-to-solid reconstruction, Fusion STEP export and browser tessellation. Original licence lines and author credits follow.',
        review:'An absent licence line is not a redistribution grant. External publication of unmarked inputs requires separate review.',...credits};
    const index={schema:'restart.dataset/2',datasetId:assemblyId,revision:model.graphRevision,credits:entry('credits.json',Buffer.from(JSON.stringify(attribution))),geometry:entry(source.geometry,glb),graph:entry('graph.json',Buffer.from(JSON.stringify(model))),
        candidates:entry('motion-candidates.json',Buffer.from('[]')),manuals:entry('manuals.json',Buffer.from(JSON.stringify(manuals)))};
    const indexBytes=Buffer.from(JSON.stringify(index)), generation=sha256(indexBytes);
    await installCandidate(demoStage,generation,async dir=>{
        for (const [name,bytes] of files) await writeFile(join(dir,name),bytes);
        await writeFile(join(dir,'index.json'),indexBytes);
    });
    const temp=join(demoStage,`candidate-${randomUUID()}.tmp`); await writeFile(temp,generation);await rename(temp,join(demoStage,'candidate'));
    console.log(`Scoped CT candidate ${generation}: ${pieces.length} pieces; ${gantry.target} moves 10 healthy pieces in two intact crown sections. Physical trial pending.`);
}
