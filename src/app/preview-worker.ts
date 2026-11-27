import { planRepair } from '../domain/planner.js';
import { applyReview } from '../domain/review.js';
import type { AssemblyModel, ReviewPatch } from '../domain/schema.js';

self.onmessage = (e: MessageEvent<{seq:number; model:AssemblyModel; patch:ReviewPatch; target:string;check:string|null}>) => {
    const { seq, model, patch, target } = e.data;
    const resolved = applyReview(model,patch);
    if (!resolved.model) { self.postMessage({seq,error:resolved.issues.join('; ')}); return; }
    self.postMessage({seq,revision:model.graphRevision,outcome:planRepair(resolved.model,[target],{maxExpandedStates:100000,allowIncumbent:true},{functionCheckId:e.data.check})});
};
