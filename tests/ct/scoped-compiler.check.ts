import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { compileScanner, importedSchema } from '../../tools/ct/compile.js';
import { demoStage } from '../../tools/ct/import.js';
import { readScannerGeneration } from '../../tools/ct/site.js';

test('the compiler accepts both turntable halves without requiring the back-room tile', async () => {
    const source = JSON.parse(await readFile('.staging/4000041/import.json', 'utf8'));
    const pieces = source.inventory.pieces.filter((p: {group: string; id: string}) =>
        ['MRI', 'Mid section'].includes(p.group) && p.id !== '4000041/L111');
    const scoped = {...source, inventory: {...source.inventory, pieces}};
    const ids = importedSchema.parse(scoped).inventory.pieces.map(p => p.id);
    assert.equal(ids.length, 284);
    assert.ok(ids.includes('4000041/L112') && ids.includes('4000041/L192'));
    assert.ok(!ids.includes('4000041/L388'));
    const substituted = [...pieces.slice(1), source.inventory.pieces.find((p: {id: string}) => p.id === '4000041/L388')];
    assert.equal(importedSchema.safeParse({...scoped, inventory: {...scoped.inventory, pieces: substituted}}).success, false);
});

test('compiling the scoped fallback offers no back-room or unverified gear manual', async () => {
    await compileScanner();
    const generation = (await readFile(`${demoStage}/candidate`,'utf8')).trim();
    const {manuals} = await readScannerGeneration(`${demoStage}/candidates/${generation}`, generation);
    assert.deepEqual(Object.keys(manuals.repairs), ['4000041/L201']);
    assert.equal(manuals.inventory.length, 284);
    assert.equal(manuals.defaultTarget, '4000041/L201');
    assert.ok(!manuals.inventory.some(p => ['4000041/L111','4000041/L388','4000041/L550'].includes(p.id)));
});
