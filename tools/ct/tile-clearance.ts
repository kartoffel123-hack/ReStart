import { Box3, Vector3 } from 'three';
import type { Box } from '../../src/domain/schema.js';
import { buildObstacle } from '../lib/sweep.js';
import { translationWitness } from '../lib/translation-contact.js';
import { readWorldMeshes } from '../pilot/geometry.js';

const boxOf = (box:Box) => new Box3(new Vector3(...box.min),new Vector3(...box.max));
const mmTolerance=.002; // adjacent tiles share nominal planes; source locations differ by <2 microns

/** Local fit model for this four-stud tile only. Test return with the same
 * installed world geometry, starting at the parked pose. No endpoint-only verdict. */
export async function checkTile(glb:Uint8Array,target:string,support:string,travel:number) {
    const pieces=await readWorldMeshes(glb);
    const tile=pieces.find(p=>p.id===target), wall=pieces.find(p=>p.id===support);
    if(tile?.definitionId!=='2431.dat' || wall?.definitionId!=='6111.dat' || travel<2) throw new Error('Unsupported tile and wall fit');
    const home=boxOf(tile.bounds),center=home.getCenter(new Vector3());
    const seat=home.min.y,box=home.clone();box.max.y+=travel;
    const size=home.getSize(new Vector3());
    if(Math.abs(size.x-32)>.01 || Math.abs(size.z-8)>.01 || Math.abs(wall.bounds.max[1]-seat-1.6)>.01) throw new Error('Tile seating dimensions changed');
    // Both pad corridors run down from above to a grip 0.8 mm above the wall.
    // This is a geometric proxy; it does not measure a particular operator's hand force.
    const grips=[home.min.z-8,home.max.z].map(z=>new Box3(new Vector3(center.x-5,seat+.8,z),new Vector3(center.x+5,home.max.y+travel+12,z+8)));
    const boxIssues:string[]=[];
    const studs=[-12,-4,4,12].map(x=>center.x+x);
    // At the entry to each stud the expected rim has four cardinal points.
    // A flat shelf with one tall protrusion has the same bounds but cannot
    // establish four seated studs. This check is independent of part names.
    const rim=[[-2.4,0],[2.4,0],[0,-2.4],[0,2.4]] as const;
    for (const x of studs) for(const [dx,dz] of rim) {
        let found=false;
        for(let i=0;i<wall.positions.length;i+=3) {
            if(Math.hypot(wall.positions[i]!-x-dx,wall.positions[i+1]!-seat-1.6,wall.positions[i+2]!-center.z-dz)<.012) {found=true;break;}
        }
        if(!found) throw new Error(`Missing stud landmark at ${x+dx}, ${center.z+dz}`);
    }
    const region=(xx:number,zz:number)=>studs.some(x=>Math.hypot(xx-x,zz-center.z)<=2.402);
    for (const other of pieces) {
        if(other===tile) continue;
        const bounds=boxOf(other.bounds);
        for(const grip of grips) {
            if(!grip.clone().expandByScalar(-mmTolerance).intersectsBox(bounds)) continue;
            // A stud's box includes its corners; test actual vertices/faces against the pad volume.
            const obstacle=buildObstacle(other,{translation:[0,0,0],rotation:[0,0,0,1]});
            if(obstacle.tree.shapecast({intersectsBounds:b=>b.intersectsBox(grip),intersectsTriangle:t=>grip.intersectsTriangle(t)})) boxIssues.push(`finger corridor: ${other.id}`);
            obstacle.geometry.dispose();
        }
        if(!box.clone().expandByScalar(-mmTolerance).intersectsBox(bounds)) continue;
        const obstacle=buildObstacle(other,{translation:[0,0,0],rotation:[0,0,0,1]});
        for(const returning of [false,true]) {
            const start=returning ? tile.positions.map((v,i)=>i%3===1?v+travel:v) : tile.positions;
            const hit=translationWitness(start,new Vector3(0,returning?-travel:travel,0),obstacle,(_moving,stationary,interval)=>{
                if(other!==wall) return false;
                const vertices=[stationary.a,stationary.b,stationary.c];
                const nearestToSeat=(returning?1-interval[1]:interval[0])*travel;
                const farthestFromSeat=(returning?1-interval[0]:interval[1])*travel;
                if(vertices.every(p=>p.y<=seat+mmTolerance)) return farthestFromSeat<=mmTolerance;
                return nearestToSeat>=-mmTolerance && farthestFromSeat<=1.6+mmTolerance &&
                    vertices.every(p=>p.y>=seat-mmTolerance && p.y<=seat+1.6+mmTolerance && region(p.x,p.z));
            });
            if(hit) boxIssues.push(`${returning?'return':'release'}: ${other.id} at ${hit.fromMm.toFixed(3)} mm`);
        }
        obstacle.geometry.dispose();
    }
    if(boxIssues.length) throw new Error(boxIssues.join('; '));
    return {pieces,tile,center,seat,studs,grips,sweep:{min:box.min.toArray(),max:box.max.toArray()}};
}
