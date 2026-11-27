import { BoxGeometry } from 'three';
import { expect,it } from 'vitest';
import { prismaticExit } from '../../tools/compile/prismatic-fit.js';
import type { Joint } from '../../tools/lib/joints.js';

// A straight square shaft is deliberate: the certificate is about a keyed
// section not getting wider, not an assumption that every axle is a cylinder.
function box(length:number,center:number,width:number) {
    const g=new BoxGeometry(length,width,width).translate(center,0,0).toNonIndexed();
    const points=Array.from(g.getAttribute('position').array);g.dispose();return points;
}
it('admits sliding off an installed straight shaft but rejects even a small downstream shoulder',()=>{
    const joint={id:'fit',origin:[0,0,0],axis:[1,0,0],radii:[{maleMm:2,femaleMm:2}],roles:[{maleOccurrenceId:'shaft',femaleOccurrenceId:'sleeve'}]} satisfies Pick<Joint,'id'|'origin'|'axis'|'radii'|'roles'>;
    const sleeve=box(2,0,5),shaft=box(20,0,2);
    expect(prismaticExit(joint,'sleeve',[1,0,0],shaft,sleeve)?.strokeToExit).toBe(11);
    expect(prismaticExit(joint,'sleeve',[1,0,0],[...shaft,...box(0.2,8,2.2)],sleeve)).toBeNull();
    expect(prismaticExit(joint,'sleeve',[0,1,0],shaft,sleeve)).toBeNull();
});
