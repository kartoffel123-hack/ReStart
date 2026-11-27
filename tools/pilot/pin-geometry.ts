import { Vector3, type Triangle } from 'three';
import { buildObstacle } from '../lib/sweep.js';
import { translationWitness } from '../lib/translation-contact.js';
import { PIN, TARGET, readWorldMeshes } from './geometry.js';

export const HOLDER='30465/NAUO28/NAUO44';
const installed={translation:[0,0,0],rotation:[0,0,0,1]} as const;

/** Exposed end family: park the light cap farther along the already measured
 * stud axis, then slide the blue pin through its cross-block bore. Coordinates
 * in mm. The only extra contact assumption is compression of the split shank
 * inside the identified bore; neither the collar nor the block is exempt. */
export async function checkPinGeometry(glb:Uint8Array) {
    const pieces=await readWorldMeshes(glb);
    const pin=pieces.find(p=>p.id===PIN)!, stud=pieces.find(p=>p.id===TARGET)!, holder=pieces.find(p=>p.id===HOLDER)!;
    const travel=pin.bounds.max[0]-holder.bounds.min[0]+4;
    const park=stud.bounds.max[0]-(pin.bounds.min[0]-travel)+4;
    const [,cy,cz]=pin.frame.translation;
    const tolerance=1e-5;
    const maxRadius=(tri:Triangle)=>Math.max(...[tri.a,tri.b,tri.c].map(v=>Math.hypot(v.y-cy,v.z-cz)));
    const shifted=(values:number[],d:number)=>values.map((v,i)=>i%3===0?v+d:v);
    // Out and back sweep the same volume under this fixed configuration; the
    // backward query uses its own start triangles and signed displacement.
    for(const [mover,stroke] of [[stud,park],[pin,travel]] as const) {
        for(const other of pieces.filter(p=>p!==mover)) {
            if(mover===stud && other===pin) continue; // same bore proof as checkStudGeometry; additional travel is away from pin
            const obstacle=buildObstacle(other,{translation:[mover===pin && other===stud ? -park:0,0,0],rotation:[...installed.rotation]});
            try {
                for(const returning of [false,true]) {
                    const start=returning ? -stroke:0,delta=new Vector3(returning?stroke:-stroke,0,0);
                    const witness=translationWitness(start ? shifted(mover.positions,start):mover.positions,delta,obstacle,
                        mover===pin && other===holder ? (m,b,t)=>{
                            // Reject back-side/outer surfaces, and distant flanges of the same pieces.
                            if(maxRadius(b)>3.11 || maxRadius(m)>2.93) return false;
                            const axial=Math.min(m.a.x,m.b.x,m.c.x)-start;
                            if(axial>=-2.9-tolerance && maxRadius(m)<=2.64) return true;
                            // Collar shoulder may meet its seat only at the installed endpoint.
                            return Math.max(Math.abs(start+delta.x*t[0]),Math.abs(start+delta.x*t[1]))<tolerance;
                        }:undefined);
                    if(witness) throw new Error(`${returning?'return':'release'} ${mover.id} vs ${other.id}: ${JSON.stringify(witness)}`);
                }
            } finally {obstacle.geometry.dispose();}
        }
    }
    return {travel,park};
}
