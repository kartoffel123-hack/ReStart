import { Triangle, Vector3 } from 'three';
import type { Joint } from '../lib/joints.js';

/** Scope a potential mating exception to a named coaxial fit. Both triangle
 * bounds must establish that overlap is confined to its thin annulus; a flange
 * sweeping across the same neighbour does not inherit the exception. */
export function axialFitAllowance(joint:Joint, moving:string, shift:Vector3, delta:Vector3) {
    const role=joint.roles[0];
    if (!role || joint.roles.length!==1 || joint.radii.length!==1) return ()=>false;
    const axis = new Vector3(...joint.axis), origin = new Vector3(...joint.origin);
    const radii=joint.radii[0]!, maleMoves=role.maleOccurrenceId===moving;
    const parallel=delta.clone().normalize().cross(axis).length()<1e-6;
    const project=(v:Vector3)=>{
        const diff=v.clone().sub(origin);
        return diff.addScaledVector(axis,-diff.dot(axis));
    };
    const zero=new Vector3();
    return (m:Triangle,b:Triangle,t:readonly [number,number])=>{
        if(!parallel) return false;
        const male=maleMoves?m:b, female=maleMoves?b:m;
        // Female moves only along the line so its radial coordinates are unchanged.
        const projected=new Triangle(project(female.a),project(female.b),project(female.c));
        const p=[projected.a,projected.b,projected.c];
        let inner=Infinity;
        for(let i=0;i<3;i++) {
            const v=p[i]!, e=p[(i+1)%3]!.clone().sub(v);
            const s=Math.max(0,Math.min(1,-v.dot(e)/(e.lengthSq()||1)));
            inner=Math.min(inner,v.clone().addScaledVector(e,s).length());
        }
        if(projected.getArea()>1e-12 && projected.containsPoint(zero)) inner=0;
        const outer=Math.max(...[male.a,male.b,male.c].map(v=>project(v).length()));
        if(inner<radii.femaleMm-0.12 || outer>radii.maleMm+0.06 || outer-inner>0.12) return false;
        const range=(tri:Triangle)=>[tri.a,tri.b,tri.c].map(v=>v.clone().sub(origin).dot(axis));
        // Contact may occur only within this holder span in its original frame.
        const relative=maleMoves?0:shift.dot(axis);
        const wall=range(female).map(s=>s-relative);
        const travel=t.map(s=>s*delta.dot(axis));
        const shaft=range(male).map(s=>s-relative);
        const off=maleMoves?travel:travel.map(s=>-s);
        const near=Math.max(Math.min(...wall),Math.min(...shaft)+Math.min(...off));
        const far=Math.min(Math.max(...wall),Math.max(...shaft)+Math.max(...off));
        return near>=joint.holderSpanMm[0]-0.12 && far<=joint.holderSpanMm[1]+0.12;
    };
}
