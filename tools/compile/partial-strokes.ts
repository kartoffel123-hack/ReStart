import type { ImportPackage } from '../import/build-package.js';
import type { inspectExits } from './exposed.js';

/** Survey a supported partial withdrawal separately from a full extraction.
 * Only use an already clear straight sweep; every retained sleeve must still
 * overlap the shaft. Such overlap is not a
 * bearing-load measurement. The team must identify a supported visible stop. */
export function partialStrokes(catalog:ImportPackage['catalog'],survey:Awaited<ReturnType<typeof inspectExits>>) {
    const results=[];
    for(const exit of survey) {
        if(exit.obstructions.length || exit.certificates.length<2) continue;
        const shaft=exit.piece,certs=exit.certificates;
        const joints=catalog.joints.filter(j=>j.pieces.includes(shaft));
        if(joints.length!==certs.length || certs.some(c=>c.shaft!==shaft)) continue;
        for(const stop of certs) {
            const strokeMm=stop.strokeToExit+0.25;
            const freed=certs.filter(c=>c.strokeToExit<strokeMm),retained=certs.filter(c=>c.strokeToExit>=strokeMm);
            if(!retained.length || freed.length!==1) continue;
            const support=retained.map(c=>({id:c.joint,sleeve:c.sleeve,residualMm:Math.min(c.strokeToExit-strokeMm,joints.find(j=>j.id===c.joint)!.engagementMm)}));
            if(support.some(c=>c.residualMm<=1e-5)) continue;
            results.push({id:`partial:${exit.id}:${stop.joint}`,shaft,clearTarget:stop.sleeve,axis:exit.axis,strokeMm,support,
                stop:'Trailing axle end just clears the target face',status:'needs-supported-stop-review' as const});
        }
    }
    return results;
}
