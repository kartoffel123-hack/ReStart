import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Vec3 } from '../../src/domain/schema.js';
import type { TriangleSoup } from '../lib/sweep.js';
import { demoStage } from './import.js';
import { loadAccessScene } from './turntable-access.js';
import { parkForTrial, roundTrip } from './turntable-blockers.js';
import { trayPath } from './side-wall.js';

type TrayMove = {name:string; members:TriangleSoup[]; points:Vec3[]};

/** With last-out/first-in restoration, each mover's return sees the exact
 * same neighbours as its departure. roundTrip sweeps both ways on that state.
 * Continue past a collision only to measure the conditional downstream path. */
export function traySequence(initial:TriangleSoup[], moves:TrayMove[]) {
    let scene=initial, reachable=true;
    const operations=moves.map(move=>{
        const trip=roundTrip(move.members,scene,move.points);
        reachable=reachable && trip.contacts.length===0;
        scene=parkForTrial(scene,trip.members,trip.points.at(-1)!);
        return {name:move.name,...trip,reachableByTestedPrefix:reachable};
    });
    return {operations,restoreOrder:moves.map(m=>m.name).reverse(),contactFreeRoundTrip:reachable};
}

async function survey() {
    const {parked,scoped,kit,scopedDigest,generation}=await loadAccessScene();
    function move(name:string, lines:number[], trayZ:number):TrayMove {
        const members=lines.map(line=>{
            const member=scoped.find(m=>m.id===`4000041/L${line}`);
            if(!member) throw new Error(`Missing plate study member L${line}`);
            return member;
        });
        const bottom=Math.min(...members.map(p=>p.bounds.min[1]));
        return {name,members,points:trayPath(bottom,kit.max.y,kit.min.y,trayZ)};
    }
    // Keep the 40 mm separation the plates have at home, in a tray lane
    // beyond the full kit (a -100 mm transfer would lower L214 into the room).
    const first=move('L214',[214],-160), second=move('L215',[215],-160);
    const wall=move('wall',[248,230],-285), bridge=move('bridge',[331,149,332],-210);
    const run=(prefix:TrayMove[])=>traySequence(parked,[...prefix,wall,bridge]);
    const trials={
        individual:run([first,second]),
        reversed:run([second,first]),
        topped:run([move('L214 with top',[214,237],-160),move('L215 with top',[215,240],-160)]),
        topsFirst:run([move('L237',[237],-405),move('L240',[240],-405),first,second]),
    };
    const result={generation,scopedDigest,kitOccurrences:parked.length,initial:'Crown sections parked; L110 and pins installed.',trials};
    await writeFile(join(demoStage,'rail-plates.json'),JSON.stringify(result,null,2)+'\n');
    for (const [name,trial] of Object.entries(trials)) {
        console.log(`${name}: ${trial.operations.map(op=>`${op.name} (${op.contacts.length})`).join(' → ')}; contact-free round trip: ${trial.contactFreeRoundTrip}`);
    }
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) await survey();
