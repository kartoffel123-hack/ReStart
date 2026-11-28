import { readFile } from 'node:fs/promises';
import { evaluateEvidence, ledgerSchema } from '../../src/domain/evidence.js';
import type { Repair } from '../../src/domain/schema.js';

export async function scannerEvidence(repair:Repair,freshReplay:boolean) {
    const ledger=ledgerSchema.parse(JSON.parse(await readFile('data/review/4000041/evidence.json','utf8')));
    // CT demonstration requires an actual matching spare; a stand-in remains a recorded rehearsal.
    return evaluateEvidence(repair,{
        ...ledger,approvals:ledger.approvals.filter(a=>a.author!==a.reviewer),trials:ledger.trials.filter(b=>!b.substituteSpare)
    },freshReplay);
}
