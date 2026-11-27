import { expect,it } from 'vitest';
import { critique } from '../../tools/classification/proposal.js';

it('returns the obstacle and phase to the proposer without promoting its correction',()=>{
    const options=[{id:'exit',piece:'T',travel:12,obstructions:['C']}];
    const stroke={optionId:'exit',travelMm:12,requiredClear:['C'],stop:'pin tip clears the wall'};
    const proposal={target:'T',release:stroke,return:{...stroke,requiredClear:[]},support:'steady the beam',tool:'fingers'};
    expect(critique('T',proposal,options).issues).toContain('return: unresolved contact with C');
    expect(critique('T',{...proposal,return:stroke},options).status).toBe('pending-review');
    expect(critique('T',{...proposal,tool:'pusher'},options).status).toBe('invalid');
    expect(critique('T',{...proposal,physicallyVerified:true},options).status).toBe('invalid');
});
