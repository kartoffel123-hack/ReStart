import { expect,it } from 'vitest';
import { Triangle, Vector3 } from 'three';
import { contactInterval } from '../../tools/lib/translation-contact.js';

it('catches a thin face strictly between two poses, without blocking a coplanar near miss',()=>{
    const yz=(x:number,y:number)=>new Triangle(new Vector3(x,y,0),new Vector3(x,y+1,0),new Vector3(x,y,1));
    const hit=contactInterval(yz(0,0),yz(0.023,0),new Vector3(1,0,0));
    expect(hit?.[0]).toBeCloseTo(0.023,6);
    expect(contactInterval(yz(0,0),yz(0.023,1.001),new Vector3(1,0,0))).toBeNull();
    expect(contactInterval(yz(0,0),yz(0,1.001),new Vector3(0,0,1))).toBeNull();
});
