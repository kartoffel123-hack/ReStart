import { expect,it } from 'vitest';
import { chainFixture } from '../fixtures/repairs.js';
import { BUDGET } from '../fixtures/kit.js';
import { planRepair } from '../../src/domain/planner.js';
import { replay } from '../../src/domain/replay.js';

it('rejects a manual whose displayed stop changed even when its discrete trace still restores the assembly',()=>{
    const base=chainFixture(),r=planRepair(base,['T'],BUDGET).repair!;
    expect(replay(base,r).ok).toBe(true);
    r.steps[0]!.stopLandmark='past the original stop';
    expect(replay(base,r).issues).toContain('step 1: operator instruction differs from the modeled action');
});
