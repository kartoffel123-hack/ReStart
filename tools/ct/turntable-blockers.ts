import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
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

function roundTrip(members:TriangleSoup[], scene:TriangleSoup[], points:Point[]) {
    const legs = (path:Point[]) => path.slice(1).map((end,i)=>sweepPair(members,scene,path[i]!,end));
    const outward = legs(points), back = legs([...points].reverse());
    const contacts = [...new Set([...outward.flat(),...back.flat()].map(h=>h.fixed))].sort();
    return {members:members.map(p=>p.id), points, outward, back, contacts};
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
    const tileWithPins = trial(parked,[110,184,188,191],-160);
    const tileParked = parkForTrial(parked,tile.members,tile.endpoint);
    const brick = trial(tileParked,[331],-210);
    const brickWithPin = trial(tileParked,[331,187],-210);
    const bridge = trial(tileParked,[331,149,332],-210);
    const bridgeWithPins = trial(tileParked,[331,149,332,187,180],-210);

    const rerun = (state:TriangleSoup[])=>roundTrip(members,state,points);
    const tileOnly = rerun(tileParked);
    const both = rerun(parkForTrial(tileParked,brick.members,brick.endpoint));
    const supportedTile = parkForTrial(parked,tileWithPins.members,tileWithPins.endpoint);
    // A separate sensitivity trial; it assumes the two fitted groups could
    // reach their endpoints. Do not mix it with the individual extraction run.
    const supportedBridge = trial(supportedTile,[331,149,332,187,180],-210);
    const bothWithSupports = rerun(parkForTrial(supportedTile,supportedBridge.members,supportedBridge.endpoint));
    const result = {generation,scopedDigest,kitOccurrences:parked.length,
        strictTrials:{tile,tileWithPins,brick,brickWithPin,bridge,bridgeWithPins,supportedBridge},
        endpointSensitivity:{tileOnly,both,bothWithSupports},
        note:'Endpoint sensitivities hold the named pieces at their measured offsets even when the approach was blocked. They are not confirmed repair states.'};
    await writeFile(join(demoStage,'turntable-blockers.json'),JSON.stringify(result,null,2)+'\n');
    for(const [name,t] of Object.entries(result.strictTrials)) console.log(`${name}: ${t.contacts.join(', ')}; tray [${t.endpoint.join(', ')}] mm`);
    for(const [name,t] of Object.entries(result.endpointSensitivity)) console.log(`${name}: ${t.contacts.length} stationary contacts; outward and return recorded separately`);
}

if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) await survey();
