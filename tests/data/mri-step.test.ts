import { describe, expect, it } from 'vitest';
import { parseMriStep } from '../../tools/mri/step-tessellation.js';

describe('MRI tessellated STEP preview', () => {
    it('converts one indexed millimetre surface into a validated triangle mesh', () => {
        const source = `ISO-10303-21;
DATA;
#10=( NAMED_UNIT(*) SI_UNIT(.MILLI.,.METRE.) );
#17=COORDINATES_LIST('',3,((0.,0.,0.),(10.,0.,0.),(0.,20.,0.)));
#16=TRIANGULATED_FACE('',#17,3,($),((1,2,3)));
ENDSEC;`;
        const result = parseMriStep(source);
        expect([...result.positionsMm]).toEqual([0, 0, 0, 10, 0, 0, 0, 20, 0]);
        expect([...result.indices]).toEqual([0, 1, 2]);
        expect(result.triangleCount).toBe(1);
        expect(result.boundsMm).toEqual({ min: [0, 0, 0], max: [10, 20, 0] });
    });

    it('rejects triangles that reference absent vertices', () => {
        const source = `SI_UNIT(.MILLI.,.METRE.);
#17=COORDINATES_LIST('',3,((0.,0.,0.),(1.,0.,0.),(0.,1.,0.)));
#16=TRIANGULATED_FACE('',#17,3,($),((1,2,4)));`;
        expect(() => parseMriStep(source)).toThrow('references missing point 4');
    });
});
