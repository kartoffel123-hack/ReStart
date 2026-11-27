import { Vector3 } from 'three';
import type { Joint } from '../lib/joints.js';
import type { Vec3 } from '../../src/domain/schema.js';

/** An installed keyed/sliding fit may be withdrawn axially if the shaft only
 * stays the same size or narrows toward its free end. Along each axial ray an
 * outward normal pointing upstream is an entry into solid, i.e. a widening or
 * a new obstruction. Reject even one such face beyond the installed near seat.
 * Check the full shaft there, not just triangles assigned to a cylinder face.
 * Opposing part is held fixed in the relative frame. This certificate is a
 * generated assumption about an already fitted interface, not force evidence. */
export function prismaticExit(j:Pick<Joint,'id'|'origin'|'axis'|'roles'|'radii'>,movingId:string,direction:readonly number[],shaft:number[],sleeve:number[]) {
    if(j.roles.length!==1 || j.radii.length!==1) return null;
    const role=j.roles[0]!,dir=new Vector3().fromArray(direction);
    if(role.maleOccurrenceId===movingId) dir.negate();
    const axis=new Vector3(...j.axis);
    if(dir.clone().cross(axis).length()>1e-6) return null;
    const origin=new Vector3(...j.origin);
    let near=Infinity,far=-Infinity;
    const a=new Vector3(),b=new Vector3(),c=new Vector3(),normal=new Vector3();
    for(let i=0;i<sleeve.length;i+=3) near=Math.min(near,a.fromArray(sleeve,i).sub(origin).dot(dir));
    const tolerance=1e-5;
    let considered=0,maxRadius=0;
    for(let i=0;i<shaft.length;i+=9) {
        a.fromArray(shaft,i).sub(origin);b.fromArray(shaft,i+3).sub(origin);c.fromArray(shaft,i+6).sub(origin);
        const span=[a.dot(dir),b.dot(dir),c.dot(dir)];
        if(Math.max(...span)<=near+tolerance) continue;
        far=Math.max(far,...span);
        normal.crossVectors(b.clone().sub(a),c.clone().sub(a));
        if(normal.lengthSq()<1e-20) continue;
        if(normal.normalize().dot(dir)<-0.00001) return null;
        for(const v of [a,b,c]) maxRadius=Math.max(maxRadius,v.clone().addScaledVector(axis,-v.dot(axis)).length());
        considered++;
    }
    // An unrelated lobe cannot be exempted on the strength of one mating axis.
    if(!considered || maxRadius>j.radii[0]!.maleMm+0.12 || far<=near) return null;
    return {joint:j.id,shaft:role.maleOccurrenceId,sleeve:role.femaleOccurrenceId,relativeAxis:dir.toArray() as Vec3,
        strokeToExit:far-near,shaftTriangles:considered,maxRadiusMm:maxRadius};
}
