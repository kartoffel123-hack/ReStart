// @vitest-environment jsdom
import { beforeEach,expect,it } from 'vitest';
import { loadCheckpoint,storeCheckpoint } from '../../src/app/checkpoint.js';

const heli={target:'30465/NAUO21',fingerprint:'original-helicopter',confirmed:1,failed:false};
const ct={...heli,target:'4000041/L388',fingerprint:'ct-tile'};
beforeEach(()=>sessionStorage.clear());

it('preserves the helicopter checkpoint while the mechanic finishes a scanner repair',()=>{
    sessionStorage.setItem('restart:mechanic-checkpoint:1',JSON.stringify(heli));
    expect(loadCheckpoint('4000041')).toBeNull();
    storeCheckpoint('4000041',ct);
    expect(loadCheckpoint('30465')).toEqual(heli);
    expect(loadCheckpoint('4000041')).toEqual(ct);
    storeCheckpoint('4000041',null);
    expect(loadCheckpoint('30465')).toEqual(heli);
});

it('a checkpoint manually copied across model keys cannot resume',()=>{
    sessionStorage.setItem('restart:mechanic-checkpoint:2:4000041',JSON.stringify(heli));
    expect(loadCheckpoint('4000041')).toBeNull();
});
