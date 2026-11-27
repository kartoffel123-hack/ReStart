import { Box3, Triangle, Vector3 } from 'three';
import type { Obstacle } from './sweep.js';

/** Continuous SAT: orientations stay fixed during a translation, so on each
 * separating axis the times of interval overlap form one closed interval.
 * Edge × normal axes also separate disjoint triangles in a shared plane. */
export function contactInterval(a:Triangle,b:Triangle,delta:Vector3):[number,number]|null {
    let enter=0, exit=1;
    const test=(axis:Vector3)=>{
        const length=axis.length();
        if(length<1e-14) return true;
        axis.divideScalar(length);
        const pa=a.a.dot(axis),qa=a.b.dot(axis),ra=a.c.dot(axis);
        const pb=b.a.dot(axis),qb=b.b.dot(axis),rb=b.c.dot(axis);
        const low=Math.min(pb,qb,rb)-Math.max(pa,qa,ra)-1e-7;
        const high=Math.max(pb,qb,rb)-Math.min(pa,qa,ra)+1e-7;
        const speed=delta.dot(axis);
        if(Math.abs(speed)<1e-14) return low<=0 && high>=0;
        enter=Math.max(enter,Math.min(low/speed,high/speed));
        exit=Math.min(exit,Math.max(low/speed,high/speed));
        return enter<=exit;
    };
    const na=a.getNormal(new Vector3()), nb=b.getNormal(new Vector3());
    if(!test(na)||!test(nb)) return null;
    const edges=(t:Triangle)=>[t.b.clone().sub(t.a),t.c.clone().sub(t.b),t.a.clone().sub(t.c)];
    const ea=edges(a),eb=edges(b),axis=new Vector3();
    for(const e of ea) {
        if(!test(axis.crossVectors(e,na))) return null;
        for(const f of eb) if(!test(axis.crossVectors(e,f))) return null;
    }
    for(const f of eb) if(!test(axis.crossVectors(f,nb))) return null;
    return [enter,exit];
}

/** A first witness (not necessarily the earliest) on an installed mesh, or no
 * intersecting surface over this specific straight stroke. No contact exemptions. */
export function translationWitness(positions:readonly number[], delta:Vector3, obstacle:Obstacle,
    allow?: (moving:Triangle, stationary:Triangle, interval:readonly [number,number])=>boolean) {
    const tri=new Triangle(), bounds=new Box3(), dest=new Box3(), other=new Box3(), end=delta.length();
    const targetBox=obstacle.geometry.boundingBox!;
    for(let i=0;i<positions.length;i+=9) {
        tri.a.fromArray(positions,i);tri.b.fromArray(positions,i+3);tri.c.fromArray(positions,i+6);
        bounds.setFromPoints([tri.a,tri.b,tri.c]);dest.copy(bounds).translate(delta);bounds.union(dest).expandByScalar(1e-6);
        if(!bounds.intersectsBox(targetBox)) continue;
        let witness:{movingTriangle:number;obstacleTriangle:number;fromMm:number;toMm:number}|undefined;
        obstacle.tree.shapecast({
            intersectsBounds:box=>bounds.intersectsBox(box),
            intersectsTriangle:(b,j)=>{
                if(!bounds.intersectsBox(other.setFromPoints([b.a,b.b,b.c]))) return false;
                const times=contactInterval(tri,b,delta);
                if(!times || allow?.(tri,b,times)) return false;
                witness={movingTriangle:i/9,obstacleTriangle:j,fromMm:times[0]*end,toMm:times[1]*end};
                return true;
            }
        });
        if(witness) return witness;
    }
    return null;
}
