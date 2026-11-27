import { z } from 'zod';
import type { Repair } from '../domain/schema.js';
import { confirmStep, createManualSession } from './manual-session.js';

const key='restart:mechanic-checkpoint:1';
const schema=z.object({ target:z.string(),fingerprint:z.string(),confirmed:z.number().int().nonnegative(), failed:z.boolean() });
export type Checkpoint=z.infer<typeof schema>;
export function loadCheckpoint():Checkpoint|null {
    try { return schema.safeParse(JSON.parse(sessionStorage.getItem(key) ?? 'null')).data ?? null; }
    catch { return null; }
}
export function storeCheckpoint(value:Checkpoint|null) {
    try { if(value) sessionStorage.setItem(key,JSON.stringify(value)); else sessionStorage.removeItem(key); } catch { /* tab may disallow storage */ }
}
export function restoreSession(repair:Repair,entry:Checkpoint) {
    if(entry.target!==repair.targetIds.join('+') || entry.fingerprint!==repair.procedureFingerprint || entry.confirmed>=repair.steps.length) return null;
    let state=createManualSession(repair);
    for(const step of repair.steps.slice(0,entry.confirmed)) state=confirmStep(state,step.stepId);
    return state;
}
