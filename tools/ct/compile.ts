import { readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { assemblyModelSchema, type RigidFrame, type Vec3 } from '../../src/domain/schema.js';
import { planRepair } from '../../src/domain/planner.js';
import { ctStage, inventorySchema, sha256 } from './import.js';
import { checkTile } from './tile-clearance.js';
import { scannerEvidence } from './evidence.js';
import { installCandidate } from './generation.js';

export const demoScopeSchema=z.object({candidate:z.string(),support:z.string(),travelMm:z.number().positive(),tool:z.string(),remove:z.string(),exchange:z.string(),restore:z.string(),check:z.string(),open:z.record(z.string(),z.string())});
export const readScope=async()=>demoScopeSchema.parse(JSON.parse(await readFile('data/review/4000041/demo-targets.json','utf8')));
export const importedSchema=z.object({inventory:inventorySchema,geometry:z.string().regex(/^geometry-[a-f0-9]{64}\.glb$/),stepSha256:z.string().regex(/^[a-f0-9]{64}$/),triangles:z.number().int().positive()});

export async function compileScanner() {
    const source=importedSchema.parse(JSON.parse(await readFile(`${ctStage}/import.json`,'utf8')));
    const scope=await readScope(),glb=await readFile(`${ctStage}/${source.geometry}`);
    const datasetRevision=sha256(glb);
    if(source.geometry!==`geometry-${datasetRevision}.glb`) throw new Error('Changed import geometry');
    const {tile,pieces,center,seat,sweep}=await checkTile(glb,scope.candidate,scope.support,scope.travelMm);
    const target=tile.id, installed=`${target}/installed`,free=`${target}/detached`,joint=`${target}/wall-studs`;
    const evidence={tier:'generated' as const,source:`${source.stepSha256}:${target}:${scope.support}`,note:'Four nominal studs; continuous translation and two modelled finger pads. Human grip and seating pending.'};
    const blank:RigidFrame={translation:[0,0,0],rotation:[0,0,0,1]};
    const frames=new Map(pieces.map(p=>[p.id,p.frame]));
    const assemblyId='4000041';
    const groups=[...new Set(source.inventory.pieces.map(p=>p.group))];
    const occurrence=(id:string,name:string,ref:string,parent:string|null,piece:boolean,location:string)=>({id,definitionId:ref,definitionName:ref,parent,
        path:parent===null?[id]:parent===assemblyId?[assemblyId,id]:[assemblyId,parent,id],kind:piece?'piece':'assembly',installedPoseId:`${id}/installed`,meshId:piece?id:null,typeKey:ref,commonName:name,locationLabel:location});
    const occurrences=[occurrence(assemblyId,'CT scanner','4000041',null,false,'Assembly'),...groups.map(g=>occurrence(`${assemblyId}/${g}`,g,g,assemblyId,false,g)),
        ...source.inventory.pieces.map(p=>occurrence(p.id,p.name,p.ref,`${assemblyId}/${p.group}`,true,p.group))];
    const raised:RigidFrame={rotation:tile.frame.rotation,translation:[tile.frame.translation[0],tile.frame.translation[1]+scope.travelMm,tile.frame.translation[2]]};
    const moves=[{id:'release',phase:'remove',text:scope.remove,start:installed,end:free,stop:'The four wall studs are visible and the tile is free.'},
        {id:'exchange',phase:'replace',text:scope.exchange,start:free,end:free,stop:'The original is set aside and the spare faces smooth side up.'},
        {id:'reseat',phase:'restore',text:scope.restore,start:free,end:installed,stop:'Both ends sit flush with the adjacent tiles.'}];
    const frame=(pose:string)=>pose===installed?tile.frame:raised;
    const model=assemblyModelSchema.parse({schemaVersion:1,graphRevision:'candidate',source:{datasetRevision,stepSha256:source.stepSha256,importerVersion:'Fusion STEP / OpenCascade 8.0.1',
        tessellation:{units:'mm',linearDeflection:.12,angularDeflection:.4},triangleCount:source.triangles},occurrences,
        poses:[...occurrences.map(o=>({id:o.installedPoseId,kind:'installed',curveFrame:'assembly',occurrenceId:o.id,frame:frames.get(o.id)??blank})),{id:free,kind:'detached',curveFrame:'assembly',occurrenceId:target,frame:raised}],
        tools:[{id:'fingers',name:scope.tool,class:'fingers',isBenchTool:true}],connections:[{id:joint,a:target,b:scope.support,axis:[0,1,0],origin:[center.x,seat,center.z],kind:'stud-tube',installedEngaged:true,evidence}],
        motions:moves.map(m=>({id:m.id,members:[target],curveFrame:'assembly',toolId:'fingers',evidence,sweep,frames:[{atMm:0,frame:frame(m.start)},{atMm:m.start===m.end?0:scope.travelMm,frame:frame(m.end)}]})),
        operations:moves.map(m=>({id:m.id,members:[target],motionId:m.id,label:m.text,phase:m.phase,toolId:'fingers',evidence,from:[{occurrenceId:target,poseId:m.start}],to:[{occurrenceId:target,poseId:m.end}],
            direction:[0,m.phase==='restore'?-1:m.phase==='remove'?1:0,0],directionLabel:m.text,stopLandmark:m.stop,strokeMm:m.start===m.end?0:scope.travelMm,
            ...(m.phase==='remove'?{returnOperationId:'reseat',releasesConnectionIds:[joint]}:{}),...(m.phase==='restore'?{isReturn:true,establishesConnectionIds:[joint]}:{}),...(m.phase==='replace'?{fitsReplacementOf:target}:{})})),
        functionChecks:[{id:'tile-fit',instruction:scope.check,expectedBehaviour:'Both ends are flush; the wall and neighbouring tiles stay seated.'}]});
    model.graphRevision=sha256(JSON.stringify(model));
    const repair=planRepair(model,[target],{maxExpandedStates:1000,allowIncumbent:false},{functionCheckId:'tile-fit'}).repair;
    if(!repair?.replay.ok || repair.disturbedCount!==0 || repair.operationIds.join()!=='release,exchange,reseat') throw new Error('CT tile exchange did not replay');
    const manuals={defaultTarget:target,geometry:source.geometry,repairs:{[target]:repair},evidence:{[target]:await scannerEvidence(repair,true)},inventory:source.inventory.pieces.map(p=>({id:p.id,name:p.id===target?'Grooved 1 × 4 tile':p.name,designNo:p.ref.replace(/\.dat$/,''),elementId:'',color:p.colorName})),
        paths:Object.fromEntries(moves.map(m=>[m.id,[m.start,m.end].map(id=>[0,id===installed?0:scope.travelMm,0] as Vec3)])),movers:Object.fromEntries(moves.map(m=>[m.id,target]))};
    const files=new Map<string,Buffer>();
    const entry=(name:string,bytes:Buffer)=>{files.set(name,bytes);return {name,sha256:sha256(bytes)};};
    const credits=z.object({definitions:z.record(z.string(),z.object({origin:z.string(),sha256:z.string(),credits:z.string().array()}))}).parse(JSON.parse(await readFile('.tmp/ct/source.json','utf8')));
    const attribution={library:'The LDraw Parts Library',terms:['https://creativecommons.org/licenses/by/2.0/','https://creativecommons.org/licenses/by/4.0/'],
        conversion:'Studio placement, surface-to-solid reconstruction, Fusion STEP export and browser tessellation. Original licence lines and author credits follow.',
        review:'An absent licence line is not a redistribution grant. External publication of unmarked inputs requires separate review.',...credits};
    const index={schema:'restart.dataset/2',datasetId:assemblyId,revision:model.graphRevision,credits:entry('credits.json',Buffer.from(JSON.stringify(attribution))),geometry:entry(source.geometry,glb),graph:entry('graph.json',Buffer.from(JSON.stringify(model))),
        candidates:entry('motion-candidates.json',Buffer.from('[]')),manuals:entry('manuals.json',Buffer.from(JSON.stringify(manuals)))};
    const indexBytes=Buffer.from(JSON.stringify(index)), generation=sha256(indexBytes);
    await installCandidate(ctStage,generation,async dir=>{
        for (const [name,bytes] of files) await writeFile(join(dir,name),bytes);
        await writeFile(join(dir,'index.json'),indexBytes);
    });
    const temp=join(ctStage,`candidate-${randomUUID()}.tmp`); await writeFile(temp,generation);await rename(temp,join(ctStage,'candidate'));
    console.log(`CT candidate ${generation}: ${target} releases, exchanges, reseats and checks; ${repair.disturbedCount} healthy pieces disturbed. Not approved for physical demonstration.`);
}
