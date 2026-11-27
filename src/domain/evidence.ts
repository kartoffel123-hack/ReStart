import { z } from 'zod';
import type { EvidenceStatus, Repair } from './schema.js';

const id=z.string().trim().min(1);
const binding=z.object({datasetRevision:id,procedureFingerprint:z.string().regex(/^[a-f0-9]{64}$/),targetId:id});
export const approvalSchema=binding.extend({author:id,reviewer:id,note:id,checks:z.object({tools:z.literal(true),stops:z.literal(true),contacts:z.literal(true),support:z.literal(true),return:z.literal(true),functionCheck:z.literal(true)})});
export const benchSchema=binding.extend({id,author:id,operator:id,observer:id,uncoached:z.literal(true),tools:z.array(id).min(1),substituteSpare:z.boolean(),
    disturbedIds:z.array(id),preservedUnits:z.array(id),estimatedDisassemblySeconds:z.number().nonnegative().nullable(),disassemblySeconds:z.number().nonnegative(),swapSeconds:z.number().nonnegative(),restorationSeconds:z.number().nonnegative(),checkId:id,passed:z.boolean(),deviations:z.array(id)});
export const ledgerSchema=z.object({schemaVersion:z.literal(1),approvals:approvalSchema.array(),trials:benchSchema.array()});
const setKey=(ids:readonly string[])=>JSON.stringify([...new Set(ids)].sort());

/** Only the build reads the team-maintained ledger. A browser draft is not a ledger. */
export function evaluateEvidence(repair:Repair,ledger:z.infer<typeof ledgerSchema>,freshReplay:boolean):EvidenceStatus {
    const matches=(r:z.infer<typeof binding>)=>r.procedureFingerprint===repair.procedureFingerprint && r.datasetRevision===repair.datasetRevision && repair.targetIds.length===1 && r.targetId===repair.targetIds[0];
    const accepted=ledger.approvals.find(matches);
    const verified=accepted && freshReplay ? ledger.trials.find(b=>matches(b) && b.passed && b.author===accepted.author && b.operator!==b.author && b.checkId===repair.functionCheckId && !b.deviations.length && setKey(b.disturbedIds)===setKey(repair.disturbedIds) && setKey(b.preservedUnits)===setKey(repair.preservedUnits.filter(u=>u.outcome==='preserved-intact').map(u=>u.unitId))) : undefined;
    return {generated:true,reviewed:!!accepted,replayedAgainstModel:freshReplay,minimumUnderReviewedModel:!!accepted && freshReplay && repair.search.status==='proved-minimum',physicallyVerified:!!verified,benchRecordId:verified?.id ?? null,invalidations:[]};
}
