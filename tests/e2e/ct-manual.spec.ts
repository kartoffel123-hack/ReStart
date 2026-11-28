import { expect,test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const target='4000041/L201';
for(const viewport of [{width:1280,height:800},{width:390,height:844}]) {
    test(`replace the buried gantry support in the CT manual at ${viewport.width}px`,async({page})=>{
        test.setTimeout(90000);
        await page.setViewportSize(viewport);
        await page.emulateMedia({reducedMotion:'reduce'});
        const foreign:string[]=[];
        page.on('request',r=>{if(r.url().includes('/models/30465/')) foreign.push(r.url());});
        await page.goto('/?dataset=4000041#/');
        await expect(page.getByText('LEGO CT scanner 4000041',{exact:true})).toBeVisible();
        const canvas=page.locator('canvas[data-target-point]');
        await expect(canvas).toBeVisible({timeout:30000});
        const [u,v]=(await canvas.getAttribute('data-target-point'))!.split(',').map(Number);
        const bounds=(await canvas.boundingBox())!;
        await canvas.click({position:{x:u!*bounds.width,y:v!*bounds.height}});
        // The support is buried; a real pick selects the visible outer occurrence.
        await expect(page.locator('.stud-picker__selection code')).toHaveText(/^4000041\/L\d+$/);
        const advanced=page.getByText('Advanced Parameters');await advanced.click();
        const selector=page.getByRole('combobox',{name:'Occurrence'});
        await selector.selectOption('4000041/L112');
        await expect(page.getByRole('alert')).toContainText('No repair procedure');
        await expect(page.getByRole('button',{name:/^replace /i})).toHaveCount(0);
        await selector.selectOption(target);
        await advanced.click();
        await page.getByRole('button',{name:/replace buried gantry support/i}).click();
        const screen=page.locator('[data-screen="manual"]'), confirm=page.getByRole('button',{name:'Confirm this step'});
        for(const phase of ['remove','remove','remove','replace','restore','restore','restore','check']) {
            await expect(screen).toHaveAttribute('data-phase',phase);
            await expect(page.getByLabel('Assembly view').locator('canvas')).toHaveAttribute('data-active-instance',phase==='replace'?target:/^4000041\/L\d+$/,{timeout:30000});
            await expect(page.getByLabel('Assembly view').locator('canvas')).toHaveAttribute('data-active-visible','true');
            await expect(screen.locator('.rs-manual__instruction')).toBeVisible();
            if(viewport.width===390) {
                const field=(await page.getByLabel('Assembly view').boundingBox())!;
                const card=(await page.getByRole('region',{name:'This step'}).boundingBox())!;
                expect(field.y+field.height).toBeLessThanOrEqual(card.y+1);
            }
            if(phase==='replace') {
                await page.reload();
                await page.getByRole('button',{name:'Kit matches — resume'}).click();
                await expect(screen).toHaveAttribute('data-phase',phase);
            }
            if(phase==='check') {
                await page.getByRole('button',{name:'Fit check failed'}).click();
                await expect(confirm).toBeDisabled();
                await page.getByRole('button',{name:'Recheck after inspection'}).click();
            }
            await page.getByRole('button',{name:'Replay the motion'}).click();
            await expect(screen).toHaveAttribute('data-phase',phase);
            await confirm.click();
        }
        await expect(page.getByRole('heading',{name:'Repair complete'})).toBeVisible();
        await expect(page.getByText('10 healthy pieces disturbed in the modeled route.')).toBeVisible();
        await expect(page.getByText(target,{exact:true})).toBeVisible();
        const downloaded=page.waitForEvent('download');
        await page.getByRole('button',{name:'Export repair report'}).click();
        const report=JSON.parse(await readFile((await (await downloaded).path())!,'utf8'));
        expect(report.targetIds).toEqual([target]);
        expect(report.repair.disturbedIds).toHaveLength(10);
        expect(report.repair.procedureFingerprint).toMatch(/^[a-f0-9]{64}$/);
        expect(report.check).toBe('operator-confirmed');
        expect(foreign).toEqual([]);
    });
}

test('CT reviewer and graph stay on the selected scanner piece',async({page})=>{
    await page.goto(`/?dataset=4000041#/review?piece=${encodeURIComponent(target)}`);
    await expect(page.getByRole('combobox',{name:'Occurrence',exact:true})).toHaveValue(target);
    await page.getByLabel('Reason',{exact:true}).fill('Test: require the seat to be released before lifting.');
    await page.getByRole('button',{name:'Add blocker'}).click();
    await expect(page.getByRole('status')).toContainText('no-feasible-route');
    const download=page.waitForEvent('download');
    await page.getByRole('button',{name:'Export draft'}).click();
    const file=await (await download).path();
    await page.getByRole('button',{name:'Restore baseline'}).click();
    await expect(page.getByRole('status')).toContainText('replay passed');
    await page.getByLabel('Import draft').setInputFiles(file!);
    await expect(page.getByRole('status')).toContainText('no-feasible-route');
    await page.getByRole('link',{name:'Dependency graph',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Dependency Graph · 4000041'})).toBeVisible({timeout:30000});
    await page.goto('/?dataset=4000041#/dof');
    await expect(page.getByText('No reviewed connection and timing catalog for this dataset.')).toBeVisible();
    const row=page.getByRole('row').filter({has:page.getByRole('link',{name:target})});
    await expect(row.first()).toContainText('mm');
    await expect(row.first()).toContainText('Unknown');
});

test('a failed scanner fetch can retry, and a helicopter visit cannot consume its checkpoint',async({page})=>{
    test.setTimeout(90000);
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.route('**/models/4000041/candidates/*/manuals.json',route=>route.fulfill({json:{stale:true}}),{times:1});
    await page.goto('/?dataset=4000041#/');
    await expect(page.getByText('The repair inventory could not be loaded.')).toBeVisible();
    await page.getByRole('button',{name:'Retry loading repair'}).click();
    await page.getByText('Advanced Parameters').click();
    await page.getByRole('combobox',{name:'Occurrence'}).selectOption(target);
    await page.getByRole('button',{name:/replace buried gantry support/i}).click();
    for(let i=0;i<3;i++) await page.getByRole('button',{name:'Confirm this step'}).click();
    await expect(page.locator('[data-screen="manual"]')).toHaveAttribute('data-phase','replace');
    await page.goto('/?dataset=30465#/');
    await expect(page.getByText('LEGO Technic helicopter 30465',{exact:true})).toBeVisible();
    await expect(page.getByText('Advanced Parameters')).toBeVisible();
    await page.goto('/?dataset=4000041#/');
    await page.getByRole('button',{name:'Kit matches — resume'}).click();
    await expect(page.locator('[data-screen="manual"]')).toHaveAttribute('data-phase','replace');
});
