import { expect,it } from 'vitest';
import { exposedTargetFixture } from '../fixtures/repairs.js';
import { planRepair } from '../../src/domain/planner.js';
import { BUDGET } from '../fixtures/kit.js';

it('retains a faster route to the same pose until the complete tie set decides whether timing is comparable',()=>{
    const m=exposedTargetFixture(),pull=m.operations[0]!;
    pull.id='a-slow';
    pull.estimatedSeconds={seconds:11,basis:'fixture',coverage:'timed',rowId:'S'};
    m.operations.push({...pull,id:'b-fast',estimatedSeconds:{...pull.estimatedSeconds,seconds:7}});
    expect(planRepair(m,['T'],BUDGET).repair?.operationIds[0]).toBe('b-fast');
    m.operations.push({...pull,id:'z-unknown',estimatedSeconds:undefined});
    expect(planRepair(m,['T'],BUDGET).repair?.operationIds[0]).toBe('a-slow');
    m.operations.reverse();
    expect(planRepair(m,['T'],BUDGET).repair?.operationIds[0]).toBe('a-slow');
});
