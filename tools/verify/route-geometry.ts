import { Vector3 } from 'three';
import type { AssemblyModel, Repair, Vec3 } from '../../src/domain/schema.js';
import { readWorldMeshes } from '../pilot/geometry.js';
import { buildObstacle } from '../lib/sweep.js';
import { translationWitness } from '../lib/translation-contact.js';
import { axialFitAllowance } from '../compile/axial-fit.js';
import type { Joint } from '../lib/joints.js';
import { prismaticExit } from '../compile/prismatic-fit.js';
import { crossBlockFit } from './cross-block-fit.js';

/** Fresh verifier for authored single-member translational strokes. Deliberately
 * refuses unsupported kinematics instead of linearising a rotation or moving a
 * multi-piece unit as if it were one mesh. No planner clearance flag is read. */
export async function verifyTranslationJob(glb:Uint8Array,model:AssemblyModel,repair:Pick<Repair,'operationIds'>,joints:readonly Joint[]) {
    const pieces=await readWorldMeshes(glb);
    const offsets=new Map(pieces.map(p=>[p.id,new Vector3()]));
    const engaged = new Set(model.connections.filter(c => c.installedEngaged).map(c => c.id));
    const tolerance=1e-5;
    const issues:string[]=[];
    for(const id of repair.operationIds) {
        const op=model.operations.find(o=>o.id===id)!;
        const motion=model.motions.find(m=>m.id===op.motionId);
        const moving=pieces.find(p=>p.id===op.members[0]);
        if (!motion || !moving || op.members.length!==1 || motion.members.join()!==moving.id || motion.curveFrame!=='assembly') return [`${id}: unsupported member/frame`];
        if(op.fitsReplacementOf) {
            for(const joint of joints.filter(j=>j.pieces.includes(moving.id))) {
                const other=pieces.find(p=>p.id!==moving.id && joint.pieces.includes(p.id))!;
                const range=(p:typeof moving)=>{
                    let min=Infinity,max=-Infinity;const axis=new Vector3(...joint.axis),v=new Vector3();
                    const off=offsets.get(p.id)!.dot(axis);
                    for(let k=0;k<p.positions.length;k+=3){const n=v.fromArray(p.positions,k).dot(axis)+off;min=Math.min(min,n);max=Math.max(max,n);}
                    return [min,max] as const;
                };
                const a=range(moving),b=range(other);
                if(Math.max(a[0]-b[1],b[0]-a[1])<0.1) issues.push(`${id}: target not individually clear of ${other.id} along ${joint.id}`);
            }
        }
        const tool=model.tools.find(t=>t.id===op.toolId);
        if (!tool || tool.class!=='fingers') return [`${id}: separate tool-corridor checker required`];
        const current=offsets.get(moving.id)!, home=new Vector3(...moving.frame.translation);
        const poses=motion.frames.map(f=>new Vector3(...f.frame.translation).sub(home));
        const end=model.poses.find(p=>p.id===op.to.find(a=>a.occurrenceId===moving.id)?.poseId);
        const partial = end?.kind === 'retracted' || model.poses.some(p => p.kind === 'retracted' && op.from.some(a => a.poseId === p.id));
        if (!end || poses[0]!.distanceTo(current)>tolerance || poses.at(-1)!.clone().add(home).distanceTo(new Vector3(...end.frame.translation))>tolerance) return [`${id}: discontinuous path or wrong endpoint`];
        if (end.kind === 'retracted') {
            // A partial shaft stroke must clear the released sleeve and still
            // carry each retained one. Measure from meshes, not the stop label.
            for (const joint of joints.filter(j => engaged.has(j.id) && j.pieces.includes(moving.id))) {
                const sleeve = joint.pieces.find(p => p !== moving.id)!;
                if (joint.roles.length !== 1 || joint.roles[0]!.maleOccurrenceId !== moving.id) return [`${id}: unsupported partial fit ${joint.id}`];
                const axis = new Vector3(...joint.axis), point = new Vector3();
                const offset = poses.at(-1)!.clone().sub(offsets.get(sleeve)!).sub(new Vector3(...joint.origin));
                let min = Infinity, max = -Infinity;
                for (let k = 0; k < moving.positions.length; k += 3) {
                    const projection = point.fromArray(moving.positions,k).add(offset).dot(axis);
                    min = Math.min(min, projection); max = Math.max(max, projection);
                }
                const [near, far] = joint.holderSpanMm;
                const overlap = Math.min(max, far) - Math.max(min, near);
                if (op.releasesConnectionIds.includes(joint.id) ? overlap > -0.1 : overlap < Math.min(4, joint.engagementMm) - tolerance) {
                    issues.push(`${id}: partial stop at ${sleeve} has ${overlap.toFixed(2)} mm axial overlap`);
                }
            }
        }
        if (motion.frames.some(f=>f.frame.rotation.some((v,i)=>Math.abs(v-moving.frame.rotation[i]!)>1e-8))) return [`${id}: rotational sweep not supported`];
        for(let i=1;i<poses.length;i++) {
            const from=poses[i-1]!,delta=poses[i]!.clone().sub(from);
            if(delta.lengthSq()<1e-18) continue;
            const positions=moving.positions.map((v,k)=>v+from.getComponent(k%3));
            for(const other of pieces.filter(p=>p!==moving)) {
                const offset=offsets.get(other.id)!;
                if([0,1,2].some(k=>other.bounds.min[k]!+offset.getComponent(k)>moving.bounds.max[k]!+from.getComponent(k)+Math.max(0,delta.getComponent(k))+tolerance ||
                    other.bounds.max[k]!+offset.getComponent(k)<moving.bounds.min[k]!+from.getComponent(k)+Math.min(0,delta.getComponent(k))-tolerance)) continue;
                const obstacle=buildObstacle(other,{translation:offset.toArray() as Vec3,rotation:[0,0,0,1]});
                try {
                    const allow=offset.lengthSq()<1e-18 ? motion.allowedContacts.filter(c=>[c.a,c.b].sort().join() === [moving.id,other.id].sort().join()).flatMap(c=>{
                         const j=joints.find(j=>j.id===c.region && j.pieces.includes(moving.id) && j.pieces.includes(other.id));
                         if (j && c.fitModel) {
                             const fit = crossBlockFit(c.fitModel, j, moving.id, from, delta);
                             return fit ? [fit] : [];
                         }
                        if(j && j.roles.length===1) {
                            const dir=delta.clone().normalize().multiplyScalar(op.isReturn?-1:1);
                            const begin=from.dot(dir),finish=poses[i]!.dot(dir);
                            const role=j.roles[0]!;
                            const certificate=prismaticExit(j,moving.id,dir.toArray(),pieces.find(p=>p.id===role.maleOccurrenceId)!.positions,pieces.find(p=>p.id===role.femaleOccurrenceId)!.positions);
                             // A checked partial stop follows a prefix of exactly the same monotone shaft.
                             if(certificate && from.clone().cross(dir).length()<tolerance && Math.min(begin,finish)>=-tolerance && (partial || Math.max(begin,finish)>=certificate.strokeToExit+tolerance)) return [()=>true];
                        }
                        return j ? [axialFitAllowance(j,moving.id,from,delta)] : [];
                    }):[];
                    const hit=translationWitness(positions,delta,obstacle,(a,b,t)=>allow.some(f=>f(a,b,t)) || (offset.lengthSq()<1e-18 && (from.length()<tolerance && t[1]*delta.length()<tolerance || poses[i]!.length()<tolerance && (1-t[0])*delta.length()<tolerance)));
                    if(hit) issues.push(`${id} interval ${i}: ${other.id} at ${hit.fromMm.toFixed(3)} mm`);
                } finally {obstacle.geometry.dispose();}
            }
        }
        offsets.set(moving.id,poses.at(-1)!);
        op.releasesConnectionIds.forEach(j => engaged.delete(j));
        op.establishesConnectionIds.forEach(j => engaged.add(j));
    }
    if([...offsets.values()].some(v=>v.length()>tolerance)) issues.push('Nonzero final mesh displacement');
    return issues;
}
