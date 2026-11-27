import { z } from 'zod';
import { sha256Hex } from '../../src/domain/hash.js';
import type { ImportPackage } from '../import/build-package.js';

const answer=z.object({id:z.string(),rowId:z.string().nullable(),reason:z.string().trim().min(1)});
export const predictionsSchema=z.object({model:z.string().min(1),version:z.string().min(1),revision:z.string(),answers:answer.array()});
export const truthSchema=z.object({reviewer:z.string().min(1),revision:z.string(),labels:answer.array()});

export function makeTrial(input:ImportPackage) {
    const name=(id:string)=>input.catalog.pieces.find(p=>p.id===id)!.name;
    const rows=input.catalog.joints.map(j=>({id:j.id,pieces:j.pieces.map(name),diameters:j.radii,gripMm:j.engagementMm,gapMm:j.contactMm,
        family:j.pieces.map(name).sort().join(' / ')}));
    // Family split: adjacent identical pins never appear as both an example and a holdout.
    const families=[...new Set(rows.map(r=>r.family))].sort((a,b)=>sha256Hex(a).localeCompare(sha256Hex(b)));
    const holdout=new Set(families.slice(0,Math.max(1,Math.ceil(families.length/4))));
    return {revision:input.report.glb.sha256,choices:input.catalog.times.map(t=>({rowId:t.rowId,description:t.connectionType,fit:t.placementFit})),
        examples:rows.filter(r=>!holdout.has(r.family)),holdout:rows.filter(r=>holdout.has(r.family))};
}

export function scoreTrial(trial:ReturnType<typeof makeTrial>,truth:z.infer<typeof truthSchema>,pred:z.infer<typeof predictionsSchema>) {
    if(trial.revision!==truth.revision || pred.revision!==truth.revision) throw new Error('Trial revision mismatch');
    const ids=new Set(trial.holdout.map(r=>r.id)),classes=new Set(trial.choices.map(c=>c.rowId));
    const keyed=(answers:z.infer<typeof answer>[])=>{
        const map=new Map(answers.map(r=>[r.id,r]));
        if(map.size!==answers.length || map.size!==ids.size || answers.some(r=>!ids.has(r.id) || (r.rowId!==null && !classes.has(r.rowId)))) throw new Error('Expected exactly one valid class or abstention for every held-out ID');
        return map;
    };
    const labels=keyed(truth.labels),guesses=keyed(pred.answers);
    const rows=trial.holdout.map(r=>{
        const expected=labels.get(r.id)!.rowId,actual=guesses.get(r.id)!.rowId;
        return {id:r.id,family:r.family,expected,actual,status:actual===null?'abstained':actual===expected?'correct':'wrong',reason:guesses.get(r.id)!.reason};
    });
    return {revision:trial.revision,model:pred.model,version:pred.version,reviewer:truth.reviewer,denominator:rows.length,
        correct:rows.filter(r=>r.status==='correct').length,wrong:rows.filter(r=>r.status==='wrong').length,abstained:rows.filter(r=>r.status==='abstained').length,
        perClass:Object.fromEntries([...new Set(rows.map(r=>r.expected ?? 'unknown'))].map(k=>[k,rows.filter(r=>(r.expected ?? 'unknown')===k).map(r=>r.status)])),rows};
}
