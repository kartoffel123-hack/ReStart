import { expect, it } from 'vitest';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { stageAssembly, verifyStage } from '../../tools/compile/stage.js';
import { assemblyModelSchema, repairSchema } from '../../src/domain/schema.js';
import { verifyTranslationJob } from '../../tools/verify/route-geometry.js';
import type { Joint } from '../../tools/lib/joints.js';

it('keeps the stud and buried-pin candidates distinct from unmodeled targets and rejects tampering', async () => {
    const root = await mkdtemp(join(tmpdir(),'restart-stage-'));
    try {
        const dir = await stageAssembly(root);
        const result = await verifyStage(dir);
        const modeled=result.rows.filter(r => r.status === 'pending-review');
        const crossBlock = modeled.find(row => row.target === '30465/NAUO17/NAUO56');
        expect(crossBlock, 'the selected stage-10 cross block can be exchanged and the assembly restored').toBeDefined();
        expect(modeled.map(r=>r.target).sort()).toEqual(['30465/NAUO14/NAUO65','30465/NAUO15','30465/NAUO16','30465/NAUO17/NAUO56','30465/NAUO17/NAUO60','30465/NAUO17/NAUO63','30465/NAUO21','30465/NAUO22','30465/NAUO26','30465/NAUO33/NAUO38','30465/NAUO33/NAUO39','30465/NAUO36','30465/NAUO37']);
        expect(result.rows.find(r=>r.target==='30465/NAUO21')?.disturbed).toEqual(['30465/NAUO22']);
        expect(result.rows.filter(r => r.status === 'missing-motion')).toHaveLength(57);
        expect(result.releaseReady).toBe(false);
        const manifest = JSON.parse(await readFile(join(dir,'manifest.json'),'utf8'));
        const model = assemblyModelSchema.parse(JSON.parse(await readFile(join(dir,manifest.files.graph),'utf8')));
        const repairs = repairSchema.array().parse(JSON.parse(await readFile(join(dir,manifest.files.manuals),'utf8')));
        const job = repairs.find(r => r.targetIds[0] === crossBlock!.target)!;
        expect(job.disturbedIds).not.toContain('30465/NAUO17/NAUO57');
        expect(job.disturbedCount).toBe(14);
        expect(job.operationIds.map(id => model.operations.find(o => o.id === id)?.fitsReplacementOf).filter(Boolean)).toEqual([crossBlock!.target]);

        // An extra 10 mm of shaft travel would still free the block, but would
        // also leave the bevel gear without its shaft. Check the actual meshes.
        const pull = model.operations.find(o => o.id === 'cross-block:NAUO19/NAUO52/remove')!;
        const frames = model.motions.find(m => m.id === pull.motionId)!.frames;
        frames[1]!.frame.translation[1] -= 10;
        model.poses.find(p => p.id === pull.to[0]!.poseId)!.frame.translation[1] -= 10;
        const geometry = await readFile(join(dir, manifest.files.geometry));
        const {joints} = JSON.parse(await readFile(join(dir,manifest.files.inventory),'utf8')) as {joints:Joint[]};
        const prefix = job.operationIds.slice(0, job.operationIds.indexOf(pull.id) + 1);
        expect(await verifyTranslationJob(geometry,model,{operationIds:prefix},joints)).toContainEqual(expect.stringContaining('partial stop at 30465/NAUO20'));
        await writeFile(join(dir,manifest.files.manuals),'[]');
        await expect(verifyStage(dir)).rejects.toThrow(/hash/i);
    } finally { await rm(root,{recursive:true,force:true}); }
},180_000);
