import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Vec3 } from '../../src/domain/schema.js';
import { demoStage } from './import.js';
import { traySequence } from './rail-plates.js';
import { trayPath } from './side-wall.js';
import { loadAccessScene } from './turntable-access.js';

async function survey() {
    const {parked,scoped,caps,kit,scopedDigest,generation}=await loadAccessScene();
    function move(name:string, lines:number[], trayZ:number, axis:'side'|'up') {
        const members=lines.map(line=>{
            const p=scoped.find(m=>m.id===`4000041/L${line}`);
            if(!p) throw new Error(`Missing scoped member L${line}`);
            return p;
        });
        const bottom=Math.min(...members.map(p=>p.bounds.min[1]));
        // The west-facing side studs separate along -X. Clear the complete
        // kit before transferring to a separate tray and lowering to bench Y.
        const dx=kit.min.x-Math.max(...members.map(p=>p.bounds.max[0]))-10;
        const points:Vec3[]=axis==='side'?[[0,0,0],[dx,0,0],[dx,0,trayZ],[dx,kit.min.y-bottom,trayZ]]:
            trayPath(bottom,kit.max.y,kit.min.y,trayZ);
        return {name,members,points};
    }
    const wall=move('wall',[248,230],-285,'up'), bridge=move('bridge',[331,149,332],-210,'up');
    const first=move('L127',[127],-360,'side'), second=move('L129',[129],-420,'side');
    const trials={
        side:traySequence(parked,[first,second,wall,bridge],'reachable-only'),
        reverseSide:traySequence(parked,[second,first,wall,bridge],'reachable-only'),
        sideTogether:traySequence(parked,[move('both faces',[127,129],-360,'side'),wall,bridge],'reachable-only'),
        up:traySequence(parked,[move('L127',[127],-360,'up'),move('L129',[129],-420,'up'),wall,bridge],'reachable-only')
    };
    await writeFile(join(demoStage,'facing-access.json'),JSON.stringify({generation,scopedDigest,kitOccurrences:parked.length,
        initialParkedIds:[...caps],policy:'reachable-only',trials},null,2)+'\n');
    for(const [name,trial] of Object.entries(trials)) {
        const counts=trial.operations.map(op=>`${op.name}: ${op.contacts.length}`).join('; ');
        console.log(`${name}: ${counts}. New tray poses: ${trial.restoreOrder.length}.`);
    }
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) await survey();
