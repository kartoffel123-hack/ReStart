import { Vector3 } from 'three';
import type { ImportPackage } from '../import/build-package.js';
import { readWorldMeshes } from '../pilot/geometry.js';
import { buildObstacle } from '../lib/sweep.js';
import { translationWitness } from '../lib/translation-contact.js';

/** Source subassemblies are proposals, not reviewed functional units. Sweep all
 * members by the same translation and keep the complete internal interface set
 * for the person deciding whether the group can really be carried intact. */
export async function moduleSurvey(input:ImportPackage) {
    const meshes=await readWorldMeshes(input.glb), obstacles=meshes.map(p=>buildObstacle(p,{translation:[0,0,0],rotation:[0,0,0,1]}));
    const groups=[];
    try {
        for(const module of input.catalog.modules) {
            const members=meshes.filter(p=>p.id.startsWith(module.id+'/'));
            if(members.length<2 || members.length>=meshes.length)continue;
            const ids=members.map(p=>p.id);
            const internal=input.catalog.joints.filter(j=>j.pieces.every(p=>ids.includes(p)));
            const external=input.catalog.joints.filter(j=>j.pieces.filter(p=>ids.includes(p)).length===1);
            const dirs=external.flatMap(j=>j.releaseDirections.map(axis=>new Vector3(...axis)));
            const options=[];
            for(const dir of dirs.filter((v,i)=>!dirs.slice(0,i).some(w=>w.dot(v)>0.99999))) {
                let travel=0;
                for(const j of external) {
                    const mover=members.find(m=>j.pieces.includes(m.id))!;
                    const other=meshes.find(m=>j.pieces.includes(m.id) && m!==mover)!;
                    const extent=(positions:number[],maximum:boolean)=>{
                        let value=maximum?-Infinity:Infinity;const point=new Vector3();
                        for(let k=0;k<positions.length;k+=3){const t=point.fromArray(positions,k).dot(dir);value=maximum?Math.max(t,value):Math.min(t,value);}
                        return value;
                    };
                    travel=Math.max(travel,extent(other.positions,true)-extent(mover.positions,false));
                }
                travel+=4;
                const delta=dir.clone().multiplyScalar(travel),hits=[];
                for(const member of members) for(const o of obstacles) {
                    if(ids.includes(o.id) || [0,1,2].some(k=>o.bounds.min[k]!>member.bounds.max[k]!+Math.max(0,delta.getComponent(k))+1e-6 || o.bounds.max[k]!<member.bounds.min[k]!+Math.min(0,delta.getComponent(k))-1e-6)) continue;
                    const hit=translationWitness(member.positions,delta,o);
                    if(hit) hits.push({member:member.id,obstacle:o.id,...hit});
                }
                options.push({axis:dir.toArray(),travelMm:travel,hits});
            }
            groups.push({id:module.id,name:module.name,members:ids,internal:internal.map(j=>j.id),external:external.map(j=>j.id),options,status:'needs-membership-support-and-return-review'});
        }
        return groups;
    } finally {obstacles.forEach(o=>o.geometry.dispose());}
}
