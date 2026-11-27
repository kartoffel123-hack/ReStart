import type { ImportPackage } from '../import/build-package.js';
import type { Vec3 } from '../../src/domain/schema.js';
import { Vector3 } from 'three';
import { readWorldMeshes } from '../pilot/geometry.js';
import { buildObstacle } from '../lib/sweep.js';
import { translationWitness } from '../lib/translation-contact.js';

/** Broad-phase work queue. An overlap asks for a narrow-phase check; it is
 * neither proof of collision nor permission to ignore an entire mating part. */
export function axialCandidates(catalog: ImportPackage['catalog'], meshes:Awaited<ReturnType<typeof readWorldMeshes>>) {
    return catalog.pieces.flatMap(piece => {
        const joints = catalog.joints.filter(j => j.pieces.includes(piece.id));
        const axes = joints.flatMap(j => j.releaseDirections);
        const dot = (a: readonly number[], b: readonly number[]) => a.reduce((s,v,i) => s+v*b[i]!,0);
        const extent=(id:string,axis:readonly number[],maximum:boolean)=>{
            const coordinates=meshes.find(p=>p.id===id)!.positions;
            let extreme=maximum ? -Infinity : Infinity;
            for(let k=0;k<coordinates.length;k+=3) {
                const v=coordinates[k]!*axis[0]!+coordinates[k+1]!*axis[1]!+coordinates[k+2]!*axis[2]!;
                extreme=maximum ? Math.max(extreme,v):Math.min(extreme,v);
            }
            return extreme;
        };
        return axes.filter((a,i) => !axes.slice(0,i).some(b => dot(a,b)>0.99999)).map((axis,i) => {
            const aligned = joints.filter(j => Math.abs(dot(axis,j.axis))>0.99999);
            const movingMin = extent(piece.id,axis,false);
            const stroke = Math.max(0,...aligned.map(j => {
                if(j.roles.some(r=>r.femaleOccurrenceId===piece.id)) return extent(j.pieces.find(id=>id!==piece.id)!,axis,true)-movingMin;
                const end = dot(j.axis,axis)>0 ? j.holderSpanMm[1] : -j.holderSpanMm[0];
                return end + dot(j.origin,axis) - movingMin;
            }));
            const offset = axis.map(v => v*stroke) as Vec3;
            const overlaps = catalog.pieces.filter(p => p.id!==piece.id && [0,1,2].every(k =>
                p.boundsMin[k]! <= piece.boundsMax[k]!+Math.max(0,offset[k]!) &&
                p.boundsMax[k]! >= piece.boundsMin[k]!+Math.min(0,offset[k]!)));
            return { id:`axis:${piece.id}:${i}`, piece:piece.id, axis, proposedStrokeMm:stroke,
                alignedJoints:aligned.map(j => j.id), transverseJoints:joints.filter(j=>!aligned.includes(j)).map(j=>j.id),
                possibleObstacles:overlaps.map(p=>p.id), status:'needs-motion-review' as const };
        });
    });
}

export async function measureCandidates(input:ImportPackage) {
    const pieces = await readWorldMeshes(input.glb);
    const obstacles = pieces.map(piece=>buildObstacle(piece,{translation:[0,0,0],rotation:[0,0,0,1]}));
    try {
        return axialCandidates(input.catalog,pieces).map(option=>{
            const moving=pieces.find(p=>p.id===option.piece)!;
            const delta=new Vector3(...option.axis).multiplyScalar(option.proposedStrokeMm);
            const contacts=obstacles.filter(o=>o.id!==moving.id && [0,1,2].every(k=>
                o.bounds.min[k]! <= moving.bounds.max[k]!+Math.max(0,delta.getComponent(k))+1e-6 &&
                o.bounds.max[k]! >= moving.bounds.min[k]!+Math.min(0,delta.getComponent(k))-1e-6
            )).map(o=>({ obstacle:o.id, witness:translationWitness(moving.positions,delta,o) }));
            return {...option,contacts,method:'continuous triangle SAT; installed obstacles only',projectionToleranceMm:1e-7};
        });
    } finally { obstacles.forEach(o=>o.geometry.dispose()); }
}
