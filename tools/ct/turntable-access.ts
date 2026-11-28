import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Box3, Vector3 } from 'three';
import type { Vec3 } from '../../src/domain/schema.js';
import { buildObstacle, type TriangleSoup } from '../lib/sweep.js';
import { translationWitness } from '../lib/translation-contact.js';
import { readWorldMeshes } from '../pilot/geometry.js';
import { ctStage, demoStage, isDemoSet, sha256 } from './import.js';
import { gantryRecipe } from './gantry-brick.js';
import { readScannerGeneration } from './site.js';

type Point = readonly [number, number, number];
type Contact = { mover:string; fixed:string; fromMm:number; toMm:number };
const home:Point = [0,0,0];

/** Both members follow the same translation; their mutual fit cannot change.
 * In the moving frame, sweep each neighbour in reverse against the two BVHs.
 * Report one continuous triangle-contact interval per pair, not first impact. */
export function sweepPair(members:TriangleSoup[], scene:TriangleSoup[], start:Point, end:Point):Contact[] {
    const hits:Contact[] = [];
    const moving = new Set(members.map(p=>p.id));
    const reverse = new Vector3(start[0]-end[0],start[1]-end[1],start[2]-end[2]);
    for (const member of members) {
        const indexed = buildObstacle(member,{translation:[0,0,0],rotation:[0,0,0,1]});
        try {
            for (const fixed of scene) {
                if (moving.has(fixed.id)) continue;
                const relative = start.every(x=>x===0) ? fixed.positions : fixed.positions.map((x,i)=>x-start[i%3]!);
                const hit = translationWitness(relative,reverse,indexed);
                if (hit) hits.push({mover:member.id,fixed:fixed.id,fromMm:hit.fromMm,toMm:hit.toMm});
            }
        } finally {
            indexed.geometry.dispose();
        }
    }
    return hits;
}

const fullDigest='6b29220b3f79c718ce1e096fa9aa5d089d24f75217fecc9784f115a470124b75';

async function survey() {
    const imported=JSON.parse(await readFile(join(demoStage,'import.json'),'utf8'));
    const scopedBytes=await readFile(join(demoStage,imported.geometry));
    const fullBytes=await readFile(join(ctStage,`geometry-${fullDigest}.glb`));
    const scopedDigest=sha256(scopedBytes);
    if(imported.geometry!==`geometry-${scopedDigest}.glb` || sha256(fullBytes)!==fullDigest) throw new Error('Access survey geometry hash mismatch');
    const scoped=await readWorldMeshes(scopedBytes), full=await readWorldMeshes(fullBytes);
    const scopedIds=new Set(scoped.map(p=>p.id));
    const scene=[...scoped,...full.filter(p=>!scopedIds.has(p.id))].sort((a,b)=>a.id.localeCompare(b.id,'en'));
    if(!isDemoSet([...scopedIds]) || scene.length!==566 || new Set(scene.map(p=>p.id)).size!==566) throw new Error('Incomplete obstruction scene');
    const scope=JSON.parse(await readFile('data/review/4000041/demo-assembly.json','utf8'));
    const members=[scope.gearTarget,scope.turntableBottom].map(id=>{
        const member=scoped.find(p=>p.id===id);
        if(!member) throw new Error(`Missing turntable member ${id}`);
        return member;
    });
    const bounds=(pieces:typeof scene)=>{
        const box=new Box3();
        for(const p of pieces) box.union(new Box3(new Vector3(...p.bounds.min),new Vector3(...p.bounds.max)));
        return box;
    };
    const kit=bounds(scene), unit=bounds(members);
    const up:Vec3=[0,kit.max.y-unit.min.y+10,0];
    const across:Vec3=[0,up[1],kit.max.z-unit.min.z+20];
    const bench:Vec3=[0,kit.min.y-unit.min.y,across[2]];
    const recipe=await gantryRecipe();
    const caps=new Set(recipe.groups.flatMap(g=>g.members));
    const directions:Record<string,Point>={up,positiveX:[kit.max.x-unit.min.x+10,0,0],negativeX:[kit.min.x-unit.max.x-10,0,0]};
    const installed:Record<string,Contact[]>={};
    for(const [name,end] of Object.entries(directions)) installed[name]=sweepPair(members,scene,home,end);

    // Use the actually replayed park offsets, not a visibility filter.
    const generation=(await readFile(join(demoStage,'candidate'),'utf8')).trim();
    const verification=JSON.parse(await readFile(join(demoStage,'verification.json'),'utf8'));
    if(!/^[a-f0-9]{64}$/.test(generation) || verification.generation!==generation || verification.stepSha256!==imported.stepSha256) throw new Error('Reverify the scoped fallback before measuring its parked state');
    const {manuals,meta}=await readScannerGeneration(join(demoStage,'candidates',generation),generation);
    if(meta.geometry.sha256!==scopedDigest) throw new Error('Parked roof sections belong to a different geometry');
    const parked=scene.map(p=>{
        if(!caps.has(p.id)) return p;
        const group=recipe.groups.find(g=>g.members.includes(p.id))!;
        const offset=manuals.paths[`gantry-${group.key}-remove`]!.at(-1)!;
        return {...p,positions:p.positions.map((x,i)=>x+offset[i%3]!)};
    });
    const points=[home,up,across,bench];
    const legs=(path:Point[],obstacles:TriangleSoup[])=>path.slice(1).map((end,i)=>sweepPair(members,obstacles,path[i]!,end));
    const outward=legs(points,parked),back=legs([...points].reverse(),parked);
    const ids=(hits:Contact[])=>[...new Set(hits.map(h=>h.fixed))].sort();
    const remaining=ids([...outward.flat(),...back.flat()]);
    const result={scopedDigest,fullDigest,generation,members:members.map(p=>p.id),directions,installed,
        parkedCrownIds:[...caps],benchPathOffsetsMm:points,outward,back,remaining,excluded:remaining.filter(id=>!scopedIds.has(id)),
        status:remaining.length?'blocked after both crown sections parked':'no surface contact on tested translations'};
    await writeFile(join(demoStage,'turntable-access.json'),JSON.stringify(result,null,2)+'\n');
    for(const [direction,hits] of Object.entries(installed)) console.log(`${direction}: ${ids(hits).length} installed obstacles`);
    console.log(`With both caps parked: outward ${outward.map(h=>ids(h).length)}, return ${back.map(h=>ids(h).length)}. ${result.status}.`);
    console.log(`Remaining IDs: ${remaining.join(', ')}. Outside demo: ${result.excluded.join(', ')||'none'}.`);
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) await survey();
