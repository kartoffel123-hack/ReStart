import { expect, it } from 'vitest';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { stageAssembly, verifyStage } from '../../tools/compile/stage.js';

it('keeps the stud and buried-pin candidates distinct from unmodeled targets and rejects tampering', async () => {
    const root = await mkdtemp(join(tmpdir(),'restart-stage-'));
    try {
        const dir = await stageAssembly(root);
        const result = await verifyStage(dir);
        const modeled=result.rows.filter(r => r.status === 'pending-review');
        expect(modeled.map(r=>r.target).sort()).toEqual(['30465/NAUO14/NAUO65','30465/NAUO15','30465/NAUO16','30465/NAUO17/NAUO60','30465/NAUO17/NAUO63','30465/NAUO21','30465/NAUO22','30465/NAUO26','30465/NAUO33/NAUO38','30465/NAUO33/NAUO39','30465/NAUO36','30465/NAUO37']);
        expect(result.rows.find(r=>r.target==='30465/NAUO21')?.disturbed).toEqual(['30465/NAUO22']);
        expect(result.rows.filter(r => r.status === 'missing-motion')).toHaveLength(58);
        expect(result.releaseReady).toBe(false);
        const manifest = JSON.parse(await readFile(join(dir,'manifest.json'),'utf8'));
        await writeFile(join(dir,manifest.files.manuals),'[]');
        await expect(verifyStage(dir)).rejects.toThrow(/hash/i);
    } finally { await rm(root,{recursive:true,force:true}); }
},180_000);
