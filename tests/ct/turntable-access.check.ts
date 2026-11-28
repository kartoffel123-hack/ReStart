import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BoxGeometry } from 'three';
import { sweepPair } from '../../tools/ct/turntable-access.js';
import { parkForTrial } from '../../tools/ct/turntable-blockers.js';
import { wallThenBridge } from '../../tools/ct/side-wall.js';

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

test('a blocker stays in the kit at its tray offset, where it can obstruct the transfer back', () => {
    const gear=piece('gear',0,0), tile=piece('tile',0,5), support=piece('support',2,5);
    const installed=[gear,tile,support];
    const parked=parkForTrial(installed,[tile.id,support.id],[8,5,0]);
    assert.deepEqual(parked.map(p=>p.id),installed.map(p=>p.id));
    assert.deepEqual(sweepPair([gear],parked,[0,0,0],[0,10,0]),[]);
    const back=sweepPair([gear],parked,[16,10,0],[0,10,0]);
    assert.deepEqual(back.map(h=>h.fixed),['tile','support']);
    assert.throws(()=>parkForTrial(installed,['missing'],[8,5,0]),/missing/);
    assert.ok(sweepPair([gear],installed,[0,0,0],[0,10,0]).length>0);
});

test('a shifted wall can clear the bridge even when a mounting plate blocks getting it there and back', () => {
    const bridge=piece('bridge',0,0), wall=piece('wall',0,5), plate=piece('plate',4,5);
    const result=wallThenBridge([bridge,wall,plate],[wall],[[0,0,0],[8,0,0]],
        [bridge],[[0,0,0],[0,10,0]]);
    assert.deepEqual(result.wall.outward[0]!.map(h=>h.fixed),['plate']);
    assert.deepEqual(result.wall.back[0]!.map(h=>h.fixed),['plate']);
    assert.deepEqual(result.bridge.contacts,[]);
    assert.equal(result.contactFreeRoundTrip,false);
});
