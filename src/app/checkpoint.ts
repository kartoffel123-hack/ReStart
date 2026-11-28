import { z } from 'zod';
import type { Repair } from '../domain/schema.js';
import { confirmStep, createManualSession } from './manual-session.js';

import type { DatasetId } from './dataset.js';

const legacyKey='restart:mechanic-checkpoint:1';
const scopedKey=(id:DatasetId)=>`restart:mechanic-checkpoint:2:${id}`;
const schema=z.object({ target:z.string(),fingerprint:z.string(),confirmed:z.number().int().nonnegative(), failed:z.boolean() });
export type Checkpoint=z.infer<typeof schema>;
export function loadCheckpoint(id:DatasetId):Checkpoint|null {
    try {
        const text=sessionStorage.getItem(scopedKey(id)) ?? (id==='30465' ? sessionStorage.getItem(legacyKey) : null);
        const saved=schema.safeParse(JSON.parse(text ?? 'null')).data;
        return saved?.target.split('+').every(target=>target.startsWith(`${id}/`)) ? saved : null;
    }
    catch { return null; }
}
export function storeCheckpoint(id:DatasetId,value:Checkpoint|null) {
    try {
        if(value) sessionStorage.setItem(scopedKey(id),JSON.stringify(value)); else sessionStorage.removeItem(scopedKey(id));
        if(id==='30465') sessionStorage.removeItem(legacyKey);
    } catch { /* tab may disallow storage */ }
}
export function restoreSession(repair:Repair,entry:Checkpoint) {
    if(entry.target!==repair.targetIds.join('+') || entry.fingerprint!==repair.procedureFingerprint || entry.confirmed>=repair.steps.length) return null;
    let state=createManualSession(repair);
    for(const step of repair.steps.slice(0,entry.confirmed)) state=confirmStep(state,step.stepId);
    return state;
}
