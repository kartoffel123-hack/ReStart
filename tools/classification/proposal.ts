import { z } from 'zod';
import type { inspectExits } from '../compile/exposed.js';

const stroke=z.object({optionId:z.string(),travelMm:z.number().positive().max(300),requiredClear:z.string().array().max(70),stop:z.string().trim().min(1).max(320)}).strict();
export const proposalSchema=z.object({target:z.string(),release:stroke,return:stroke,tool:z.enum(['fingers','pusher']),support:z.string().trim().min(1).max(320)}).strict();
type Exit=Awaited<ReturnType<typeof inspectExits>>[number];
type Observation=Pick<Exit,'id'|'piece'|'travel'|'obstructions'>;

/** A model may propose an option. It cannot assert its own clearances or
 * confer approval. Both strokes must bind to the simulated geometry. */
export function critique(target:string,value:unknown,options:readonly Observation[]) {
    const parsed=proposalSchema.safeParse(value);
    if(!parsed.success)return {status:'invalid' as const,issues:parsed.error.issues.map(i=>`${i.path.join('.')}: ${i.message}`)};
    const p=parsed.data,issues:string[]=[];
    if(p.target!==target)issues.push('Wrong physical occurrence');
    if(p.tool==='pusher')issues.push('No checked pusher entry, handle and return envelope for this proposal');
    for(const [phase,s] of [['release',p.release],['return',p.return]] as const){
        const observed=options.find(o=>o.id===s.optionId && o.piece===target);
        if(!observed){issues.push(`${phase}: option has no two-direction mesh simulation`);continue;}
        if(Math.abs(observed.travel-s.travelMm)>0.01)issues.push(`${phase}: stroke ${s.travelMm} mm differs from measured ${observed.travel.toFixed(3)} mm`);
        for(const id of observed.obstructions)if(!s.requiredClear.includes(id))issues.push(`${phase}: unresolved contact with ${id}`);
        for(const id of s.requiredClear)if(!observed.obstructions.includes(id))issues.push(`${phase}: unsupported obstruction claim for ${id}`);
    }
    if(p.release.optionId!==p.return.optionId)issues.push('Return does not start at the release endpoint');
    return {status:issues.length?'invalid' as const:'pending-review' as const,issues};
}
