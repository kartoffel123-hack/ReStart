import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { NodeIO } from '@gltf-transform/core';
import { ctStage } from '../../tools/ct/import.js';
import { checkTile } from '../../tools/ct/tile-clearance.js';
import { readScope } from '../../tools/ct/compile.js';

test('a tile trapped midway cannot be removed or returned, even with clear endpoints',async()=>{
    const reference=JSON.parse(await readFile(`${ctStage}/import.json`,'utf8'));
    const scope=await readScope(),io=new NodeIO();
    const document=await io.readBinary(await readFile(`${ctStage}/${reference.geometry}`));
    const nodes=new Map(document.getRoot().listNodes().map(node=>[node.getExtras().instanceId,node]));
    const [x,y,z]=nodes.get(scope.candidate)!.getTranslation();
    nodes.get('4000041/L389')!.setTranslation([x,y+.007,z]);
    // Mutate only this in-memory consumer; keep the original artifact immutable.
    await assert.rejects(checkTile(await io.writeBinary(document),scope.candidate,scope.support,scope.travelMm),
        /release: 4000041\/L389 at 4\.200 mm; return: 4000041\/L389 at 7\.800 mm/);
});
