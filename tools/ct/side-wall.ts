import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Vec3 } from '../../src/domain/schema.js';
import type { TriangleSoup } from '../lib/sweep.js';
import { demoStage } from './import.js';
import { loadAccessScene } from './turntable-access.js';
import { parkForTrial, roundTrip } from './turntable-blockers.js';

/** Nested order: wall out, bridge out, bridge home, wall home. In particular,
 * the wall returns against the restored bridge, not an empty bridge socket. */
export function wallThenBridge(scene:TriangleSoup[], wallMembers:TriangleSoup[], wallPath:Vec3[],
    bridgeMembers:TriangleSoup[], bridgePath:Vec3[]) {
    const wall=roundTrip(wallMembers,scene,wallPath);
    const displaced=parkForTrial(scene,wall.members,wallPath.at(-1)!);
    const bridge=roundTrip(bridgeMembers,displaced,bridgePath);
    return {wall,bridge,contactFreeRoundTrip:!wall.contacts.length && !bridge.contacts.length};
}

async function survey() {
    const {parked,scoped,kit,scopedDigest,generation}=await loadAccessScene();
    const parts=(lines:number[])=>lines.map(line=>{
        const p=scoped.find(m=>m.id===`4000041/L${line}`);
        if(!p) throw new Error(`Missing side-wall study member L${line}`);
        return p;
    });
    const bridge=parts([331,149,332]);
    const wall=parts([248]), wallAndPlate=parts([248,230]);
    const facedWall=parts([248,230,127,129]);
    // Both the side-stud brick and the rail extend into the installed bridge's
    // X range. Round up to the next hundredth with 0.05 mm test clearance.
    const intrusion=Math.max(...wallAndPlate.map(p=>p.bounds.max[0]))-Math.min(...bridge.map(p=>p.bounds.min[0]));
    if(intrusion<=0) throw new Error('Installed side-wall overlap changed');
    const dx=-Math.ceil((intrusion+.05)*100)/100;
    const home:Vec3=[0,0,0], shifted:Vec3=[dx,0,0];
    function trayPath(moving:typeof bridge, trayZ:number):Vec3[] {
        const bottom=Math.min(...moving.map(p=>p.bounds.min[1]));
        const lift=kit.max.y-bottom+10;
        return [home,[0,lift,0],[0,lift,trayZ],[0,kit.min.y-bottom,trayZ]];
    }
    const bridgePath=trayPath(bridge,-210);
    const run=(moving:typeof bridge,path:Vec3[])=>wallThenBridge(parked,moving,path,bridge,bridgePath);
    const trials={
        brickShift:run(wall,[home,shifted]),
        brickRemoval:run(wall,trayPath(wall,-285)),
        wallAndPlateShift:run(wallAndPlate,[home,shifted]),
        wallAndPlateRemoval:run(wallAndPlate,trayPath(wallAndPlate,-285)),
        facedWallShift:run(facedWall,[home,shifted]),
        facedWallRemoval:run(facedWall,trayPath(facedWall,-285)),
    };
    const result={scopedDigest,generation,kitOccurrences:parked.length,installedXOverlapMm:intrusion,shiftXMm:dx,
        initial:'Both crown sections at verified tray poses; L110, all pins and bridge installed.',trials};
    await writeFile(join(demoStage,'side-wall.json'),JSON.stringify(result,null,2)+'\n');
    console.log(`Full kit ${parked.length}; wall/rail X overlap ${intrusion.toFixed(5)} mm; shift ${dx} mm`);
    for(const [name,{wall,bridge,contactFreeRoundTrip}] of Object.entries(trials)) {
        console.log(`${name}: wall contacts ${wall.contacts.length}; bridge contacts ${bridge.contacts.join(', ')}; contact-free sequence ${contactFreeRoundTrip}`);
    }
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) await survey();
