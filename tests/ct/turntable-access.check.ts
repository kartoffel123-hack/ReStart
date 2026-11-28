import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BoxGeometry } from 'three';
import { sweepPair } from '../../tools/ct/turntable-access.js';

function piece(id:string, x:number, y:number) {
    const mesh=new BoxGeometry(2,2,2).toNonIndexed().translate(x,y,0);
    return {id,positions:Array.from(mesh.getAttribute('position').array)};
}

test('a plate blocks the grey half midway out and midway back even though the toothed half clears it', () => {
    const pair=[piece('top',0,0),piece('bottom',2,0)];
    const plate=piece('plate',3,6);
    for (const [start,end] of [[[0,0,0],[0,12,0]],[[0,12,0],[0,0,0]]] as const) {
        const hits=sweepPair(pair,[...pair,plate],start,end);
        assert.deepEqual(hits.map(hit=>[hit.mover,hit.fixed]),[['bottom','plate']]);
        assert.ok(hits[0]!.fromMm>=3.99 && hits[0]!.toMm<=8.01);
        assert.deepEqual(sweepPair(pair,pair,start,end),[]);
    }
});

test('a pin carried with the turntable can hit a crown section parked too early on return', () => {
    const pair = [piece('top',0,0),piece('bottom',2,0)];
    const carrier = [...pair,piece('pin',4,0)];
    const pathStart = [0,12,0] as const, home = [0,0,0] as const;
    const clear = [...carrier,piece('crown',12,6)];
    assert.deepEqual(sweepPair(carrier,clear,home,pathStart),[]);
    const obstructed = [...carrier,piece('crown',5,6)];
    assert.deepEqual(sweepPair(carrier,obstructed,pathStart,home).map(h=>[h.mover,h.fixed]),[['pin','crown']]);
});
