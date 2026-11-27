import { z } from 'zod';
import { poseSchema,motionSchema,operationSchema,functionCheckSchema,type AssemblyModel } from '../../src/domain/schema.js';
import { sha256Hex } from '../../src/domain/hash.js';

export const catalogSchema=z.object({schemaVersion:z.literal(1),baseSourceSha256:z.string(),poses:poseSchema.array(),motions:motionSchema.array(),operations:operationSchema.array(),checks:functionCheckSchema.array(),targetChecks:z.record(z.string(),z.string())});
export function extendCatalog(base:AssemblyModel,data:z.infer<typeof catalogSchema>) {
    if(data.baseSourceSha256!==base.source.stepSha256) throw new Error('Motion catalog source revision mismatch');
    const model=structuredClone(base);
    model.poses.push(...data.poses);model.motions.push(...data.motions);model.operations.push(...data.operations);model.functionChecks.push(...data.checks);
    const index=<T extends {id:string}>(items:T[])=>{
        const map=new Map(items.map(o=>[o.id,o]));
        if(map.size!==items.length) throw new Error('Duplicate catalog ID');
        return map;
    };
    const occ=index(model.occurrences),poses=index(model.poses),motions=index(model.motions),ops=index(model.operations),connections=index(model.connections),tools=index(model.tools),checks=index(model.functionChecks);
    const sameIds=(a:string[],b:string[])=>new Set(a).size===a.length && JSON.stringify([...a].sort())===JSON.stringify([...b].sort());
    for(const [target,check] of Object.entries(data.targetChecks)) if(occ.get(target)?.kind!=='piece' || !checks.has(check)) throw new Error('Unknown target or function check');
    for(const p of poses.values()) if(!occ.has(p.occurrenceId)) throw new Error(`Unknown pose owner: ${p.id}`);
    for(const op of ops.values()) {
        const motion=motions.get(op.motionId);
        if(!motion || !tools.has(op.toolId) || motion.toolId!==op.toolId || op.members.some(id=>occ.get(id)?.kind!=='piece') ||
            [...op.from,...op.to].some(a=>poses.get(a.poseId)?.occurrenceId!==a.occurrenceId) ||
            [...op.establishesConnectionIds,...op.releasesConnectionIds].some(id=>!connections.has(id)) ||
            (op.returnOperationId && !ops.get(op.returnOperationId)?.isReturn)) throw new Error(`Invalid references: ${op.id}`);
        for(const r of op.requires) if(r.subject.kind==='occurrence' ? r.acceptable.some(s=>poses.get(s)?.occurrenceId!==r.subject.id) : !connections.has(r.subject.id)||r.acceptable.some(s=>!['engaged','released'].includes(s))) throw new Error(`Invalid requirement: ${op.id}/${r.id}`);
        if(!sameIds(op.members,op.from.map(a=>a.occurrenceId)) || !sameIds(op.members,op.to.map(a=>a.occurrenceId)) || !sameIds(op.members,motion.members) || op.strokeMm<0 || motion.toleranceMm<0 ||
            motion.frames.some((f,i)=>Math.abs(Math.hypot(...f.frame.rotation)-1)>1e-6 || (i>0 && f.atMm<motion.frames[i-1]!.atMm)) ||
            (op.wholeAssembly && !sameIds(op.members,model.occurrences.filter(p=>p.kind==='piece').map(p=>p.id))) ||
            (op.fitsReplacementOf && (op.phase!=='replace' || !op.members.includes(op.fitsReplacementOf)))) throw new Error(`Inconsistent physical action: ${op.id}`);
    }
    if(data.operations.length || data.poses.length || data.motions.length || data.checks.length || Object.keys(data.targetChecks).length) model.graphRevision=sha256Hex(JSON.stringify([model.graphRevision,data]));
    return model;
}
