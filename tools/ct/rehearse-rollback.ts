/** Local CT-V09 rehearsal. Serve the frozen ZIP; never change a real channel or selector. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium, expect, type Page } from '@playwright/test';
import { preview } from 'vite';

const pins=JSON.parse(await readFile('data/review/4000041/l201-trial-freeze.json','utf8'));
const archive=resolve(process.argv[2] ?? `.staging/4000041/bench-site-${pins.ctGeneration.slice(0,12)}.zip`);
const sha256=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
assert.equal(sha256(await readFile(archive)),pins.archiveSha256,'Not the frozen trial ZIP');
const root=await mkdtemp(join(tmpdir(),'restart-rollback-'));
let ctLanding=true;

async function complete(page:Page, phases:string[], target:string, fingerprint:string) {
    for (const phase of phases) {
        await expect(page.locator('[data-screen="manual"]')).toHaveAttribute('data-phase',phase);
        await page.getByRole('button',{name:'Confirm this step'}).click();
    }
    await expect(page.getByRole('heading',{name:'Repair complete'})).toBeVisible();
    const pending=page.waitForEvent('download');
    await page.getByRole('button',{name:'Export repair report'}).click();
    const report=JSON.parse(await readFile((await (await pending).path())!,'utf8'));
    assert.deepEqual(report.targetIds,[target]);
    assert.equal(report.repair.procedureFingerprint,fingerprint);
    assert.equal(report.check,'operator-confirmed');
    return report;
}

try {
    // The archive is pinned before extraction; do not serve a mutable dist/.
    execFileSync(process.env.CT_CAD_PYTHON ?? 'python3',['-m','zipfile','-e',archive,join(root,'site')]);
    const server=await preview({configFile:false,root,build:{outDir:'site'},preview:{host:'127.0.0.1',port:0},
        plugins:[{name:'rehearsal-landing',configurePreviewServer(s){
            s.middlewares.use((req,res,next)=>{
                if (!ctLanding || req.url!=='/') return next();
                res.writeHead(302,{Location:'/?dataset=4000041','Cache-Control':'no-store'});res.end();
            });
        }}]});
    try {
        const origin=server.resolvedUrls!.local[0]!;
        const browser=await chromium.launch();
        try {
            const warm=await browser.newPage({reducedMotion:'reduce'});
            for(const [path,digest] of [
                [`models/4000041/candidates/${pins.ctGeneration}/index.json`,pins.ctGeneration],
                ['models/30465/pilot/index.json',pins.helicopterIndexSha256]
            ]) {
                const response=await warm.request.get(origin+path);
                assert.equal(response.status(),200);assert.equal(sha256(await response.body()),digest);
            }
            await warm.goto(origin);
            await warm.getByRole('button',{name:/Buried gantry support brick.*healthy pieces moved/i}).click();
            await warm.getByRole('button',{name:/Replace buried gantry support/i}).click();
            for(let i=0;i<3;i++) await warm.getByRole('button',{name:'Confirm this step'}).click();
            await expect(warm.locator('[data-screen="manual"]')).toHaveAttribute('data-phase','replace');
            const checkpoint=()=>warm.evaluate(()=>sessionStorage.getItem('restart:mechanic-checkpoint:2:4000041'));
            const saved=await checkpoint();
            assert.equal(JSON.parse(saved!).confirmed,3);
            assert.equal(JSON.parse(saved!).fingerprint,pins.fingerprint);

            // Withdraw the CT redirect. The unqualified URL now uses the real
            // helicopter default compiled into the same, untouched index bundle.
            ctLanding=false;
            await warm.reload();
            await warm.getByRole('button',{name:'Kit matches — resume'}).click();
            await expect(warm.locator('[data-screen="manual"]')).toHaveAttribute('data-phase','replace');
            await warm.goto(origin);
            await expect(warm.getByText('LEGO Technic helicopter 30465',{exact:true})).toBeVisible();
            assert.equal(await checkpoint(),saved);
            const fresh=await browser.newPage({reducedMotion:'reduce'});
            await fresh.goto(origin);
            await expect(fresh.getByText('LEGO Technic helicopter 30465',{exact:true})).toBeVisible();
            await fresh.getByText('Advanced Parameters').click();
            await fresh.getByRole('combobox',{name:'Occurrence'}).selectOption(pins.helicopterTarget);
            await fresh.getByRole('button',{name:/Replace light stud/i}).click();
            await complete(fresh,['remove','replace','restore','check'],pins.helicopterTarget,pins.helicopterFingerprint);
            await fresh.goto(origin+'#/review');
            await expect(fresh.getByRole('combobox',{name:'Occurrence'})).toBeVisible();
            await fresh.getByRole('combobox',{name:'Occurrence'}).selectOption(pins.helicopterTarget);
            console.log('Rollback: fresh / completed the helicopter light stud and opened review; warm CT checkpoint preserved at step 4.');

            ctLanding=true;
            await warm.goto(origin);
            await warm.getByRole('button',{name:'Kit matches — resume'}).click();
            const report=await complete(warm,['replace','restore','restore','restore','check'],pins.target,pins.fingerprint);
            assert.equal(report.repair.datasetRevision,pins.datasetRevision);
            assert.equal(report.repair.graphRevision,pins.graphRevision);
            assert.equal(report.evidence.physicallyVerified,false);
            console.log(`Restored CT: ${report.targetIds[0]} completed from saved exchange; fingerprint ${pins.fingerprint}.`);
            console.log(`ZIP ${pins.archiveSha256}; local Chromium ${browser.version()}. No physical or hosted sign-off.`);
        } finally { await browser.close(); }
    } finally { await server.close(); }
} finally { await rm(root,{recursive:true,force:true}); }
