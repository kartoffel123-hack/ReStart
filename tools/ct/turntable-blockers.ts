import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { BoxGeometry } from 'three';
import type { Box } from '../../src/domain/schema.js';
import type { Vec3 } from '../../src/domain/schema.js';
import type { TriangleSoup } from '../lib/sweep.js';
import { demoStage } from './import.js';
import { loadAccessScene, sweepPair } from './turntable-access.js';

type Point = readonly [number, number, number];
const home:Point = [0,0,0];

/** Preserve every occurrence. The input state may already have the roof in its trays. */
export function parkForTrial(scene:TriangleSoup[], ids:string[], offset:Point):TriangleSoup[] {
    const pending = new Set(ids);
    const next = scene.map(p => pending.delete(p.id)
        ? {id:p.id, positions:p.positions.map((value,i)=>value+offset[i%3]!)} : p);
    if (pending.size) throw new Error(`Unknown parking member: ${[...pending].join(', ')}`);
    return next;
}

export function roundTrip(members:TriangleSoup[], scene:TriangleSoup[], points:Point[]) {
    const legs = (path:Point[]) => path.slice(1).map((end,i)=>sweepPair(members,scene,path[i]!,end));
    const outward = legs(points), back = legs([...points].reverse());
    const contacts = [...new Set([...outward.flat(),...back.flat()].map(h=>h.fixed))].sort();
    return {members:members.map(p=>p.id), points, outward, back, contacts};
}

/** Clearance envelope for a dimensioned tool hypothesis. Tips close against
 * the two short tile ends. The crossbar spans the opening at all jaw widths. */
function tileGrip(scene:TriangleSoup[], tile:TriangleSoup & {bounds:Box}, path:Point[]) {
    const {min,max}=tile.bounds;
    const x=(min[0]+max[0])/2, bottom=max[1]-1.5;
    const box=(id:string, size:Vec3, center:Vec3):TriangleSoup=>{
        const mesh=new BoxGeometry(...size).toNonIndexed().translate(...center);
        return {id,positions:Array.from(mesh.getAttribute('position').array)};
    };
    const tip=(endZ:number,side:number)=>box(`end jaw ${side}`,[4,34,1],[x,bottom+17,endZ+side*.5]);
    const jaws=[tip(min[2],-1),tip(max[2],1)];
    const crossbar=box('crossbar',[4,4,max[2]-min[2]+3],[x,bottom+36,(min[2]+max[2])/2]);
    const neighbours=scene.filter(p=>p.id!==tile.id);
    const open=parkForTrial(parkForTrial(jaws,[jaws[0]!.id],[0,0,-.5]),[jaws[1]!.id],[0,0,.5]);
    const tool=[...jaws,crossbar];
    const endpoint=path.at(-1)!;
    const atTray=parkForTrial(scene,[tile.id],endpoint);
    function graspAt(offset:Point, obstacles:TriangleSoup[]) {
        const above:Vec3=[offset[0],offset[1]+path[1]![1],offset[2]];
        const openTool=[...open,crossbar];
        const openApproach=sweepPair(openTool,obstacles,above,offset);
        const openRetreat=sweepPair(openTool,obstacles,offset,above);
        // The target face is the intended terminal contact. The two flat
        // jaws stay outside its bounding planes throughout this half-mm close.
        const others=obstacles.filter(p=>p.id!==tile.id);
        const jawMotion=jaws.map((jaw,i)=>{
            const openOffset:Vec3=[offset[0],offset[1],offset[2]+(i===0?-.5:.5)];
            return {close:sweepPair([jaw],others,openOffset,offset),release:sweepPair([jaw],others,offset,openOffset)};
        });
        return {openApproach,openRetreat,jawMotion};
    }
    const fingers=[min[2]-3,max[2]+3].map((z,i)=>box(`finger ${i}`,[6,10,6],[x,bottom+5,z]));
    return {shape:'two 4 × 34 × 1 mm jaws, 0.5 mm opening per end, 4 mm high crossbar; 1.5 mm contact height',
        installedGrasp:graspAt(home,scene),benchGrasp:graspAt(endpoint,atTray),transport:roundTrip(tool,neighbours,path),
        broadFingerApproach:sweepPair(fingers,neighbours,path[1]!,home)};
}

async function survey() {
    const {parked,kit,scoped,members,points,generation,scopedDigest} = await loadAccessScene();
    const byId = new Map(scoped.map(p=>[p.id,p]));
    function trial(scene:TriangleSoup[], lines:number[], trayZ:number) {
        const group = lines.map(n=>{
            const p=byId.get(`4000041/L${n}`);
            if (!p) throw new Error(`Unknown scoped trial member: L${n}`);
            return p;
        });
        const lowest = Math.min(...group.map(p=>p.bounds.min[1]));
        const lift = kit.max.y-lowest+10;
        const endpoint:Vec3 = [0,kit.min.y-lowest,trayZ];
        const result = roundTrip(group,scene,[home,[0,lift,0],[0,lift,trayZ],endpoint]);
        return {...result,endpoint};
    }
    // Separate trays on the opposite side to the parked roofs and the proposed
    // turntable tray. Keep ungrasped supports at their actual installed poses.
    const tile = trial(parked,[110],-160);
    const grip=tileGrip(parked,byId.get('4000041/L110')!,tile.points);
    const tileWithPins = trial(parked,[110,184,188,191],-160);
    const brickAlone = trial(parked,[331],-210);
    const tileParked = parkForTrial(parked,tile.members,tile.endpoint);
    const brick = trial(tileParked,[331],-210);
    const brickWithPin = trial(tileParked,[331,187],-210);
    const bridge = trial(tileParked,[331,149,332],-210);
    const bridgeWithPins = trial(tileParked,[331,149,332,187,180],-210);

    const rerun = (state:TriangleSoup[])=>roundTrip(members,state,points);
    const tileOnly = rerun(tileParked);
    const brickOnly = rerun(parkForTrial(parked,brickAlone.members,brickAlone.endpoint));
    const both = rerun(parkForTrial(tileParked,brick.members,brick.endpoint));
    const tileAndBridge = rerun(parkForTrial(tileParked,bridge.members,bridge.endpoint));
    const supportedTile = parkForTrial(parked,tileWithPins.members,tileWithPins.endpoint);
    // A separate sensitivity trial; it assumes the two fitted groups could
    // reach their endpoints. Do not mix it with the individual extraction run.
    const supportedBridge = trial(supportedTile,[331,149,332,187,180],-210);
    const bothWithSupports = rerun(parkForTrial(supportedTile,supportedBridge.members,supportedBridge.endpoint));
    const result = {generation,scopedDigest,kitOccurrences:parked.length,
        strictTrials:{tile,tileWithPins,brickAlone,brick,brickWithPin,bridge,bridgeWithPins,supportedBridge},
        endpointSensitivity:{tileOnly,brickOnly,both,tileAndBridge,bothWithSupports}, tileGrip:grip,
        note:'Endpoint sensitivities hold the named pieces at their measured offsets even when the approach was blocked. They are not confirmed repair states.'};
    await writeFile(join(demoStage,'turntable-blockers.json'),JSON.stringify(result,null,2)+'\n');
    for(const [name,t] of Object.entries(result.strictTrials)) console.log(`${name}: ${t.contacts.join(', ')}; tray [${t.endpoint.join(', ')}] mm`);
    for(const [name,t] of Object.entries(result.endpointSensitivity)) console.log(`${name}: ${t.contacts.length} stationary contacts; outward and return recorded separately`);
}

if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) await survey();
