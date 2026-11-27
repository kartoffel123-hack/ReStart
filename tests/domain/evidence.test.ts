import { expect,it } from 'vitest';
import { exposedTargetFixture } from '../fixtures/repairs.js';
import { planRepair } from '../../src/domain/planner.js';
import { BUDGET } from '../fixtures/kit.js';
import { ledgerSchema,evaluateEvidence } from '../../src/domain/evidence.js';

it('carries an uncoached trial across an unrelated graph edit but not a changed motion or self-authored trial',()=>{
    const m=exposedTargetFixture(),r=planRepair(m,['T'],BUDGET).repair!;
    const binding={datasetRevision:r.datasetRevision,procedureFingerprint:r.procedureFingerprint,targetId:'T'};
    const ledger=ledgerSchema.parse({schemaVersion:1,approvals:[{...binding,author:'writer',reviewer:'reviewer',note:'Both paths inspected',checks:{tools:true,stops:true,contacts:true,support:true,return:true,functionCheck:true}}],
        trials:[{...binding,id:'trial',author:'writer',operator:'mechanic',observer:'observer',uncoached:true,tools:['fingers'],substituteSpare:false,disturbedIds:[],preservedUnits:[],estimatedDisassemblySeconds:null,disassemblySeconds:5,swapSeconds:2,restorationSeconds:6,checkId:r.functionCheckId,passed:true,deviations:[]}]});
    expect(evaluateEvidence(r,ledger,true).physicallyVerified).toBe(true);
    expect(evaluateEvidence(r,ledger,false).physicallyVerified).toBe(false);
    m.graphRevision='unrelated-edit';
    expect(evaluateEvidence(planRepair(m,['T'],BUDGET).repair!,ledger,true).physicallyVerified).toBe(true);
    m.motions[1]!.frames[1]!.frame.translation[0]+=1;
    expect(evaluateEvidence(planRepair(m,['T'],BUDGET).repair!,ledger,true).physicallyVerified).toBe(false);
    ledger.trials[0]!.operator='writer';
    expect(evaluateEvidence(r,ledger,true).physicallyVerified).toBe(false);
});
