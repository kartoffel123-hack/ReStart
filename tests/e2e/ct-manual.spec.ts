import { expect,test } from '@playwright/test';

const target='4000041/L388';
for(const viewport of [{width:1280,height:800},{width:390,height:844}]) {
    test(`replace the particular back-room tile in the CT manual at ${viewport.width}px`,async({page})=>{
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
        await expect(page.locator('.stud-picker__selection code')).toHaveText(target);
        const advanced=page.getByText('Advanced Parameters');await advanced.click();
        const selector=page.getByRole('combobox',{name:'Occurrence'});
        await selector.selectOption('4000041/L389');
        await expect(page.getByRole('alert')).toContainText('No repair procedure');
        await expect(page.getByRole('button',{name:/^replace /i})).toHaveCount(0);
        await selector.selectOption(target);
        await advanced.click();
        await page.getByRole('button',{name:/replace grooved 1 × 4 tile/i}).click();
        const screen=page.locator('[data-screen="manual"]'), confirm=page.getByRole('button',{name:'Confirm this step'});
        for(const phase of ['remove','replace','restore','check']) {
            await expect(screen).toHaveAttribute('data-phase',phase);
            await expect(page.getByLabel('Assembly view').locator('canvas')).toHaveAttribute('data-active-instance',target,{timeout:30000});
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
        await expect(page.getByText('0 healthy pieces disturbed in the modeled route.')).toBeVisible();
        await expect(page.getByText(target,{exact:true})).toBeVisible();
        expect(foreign).toEqual([]);
    });
}

test('CT reviewer and graph stay on the selected scanner piece',async({page})=>{
    await page.goto(`/?dataset=4000041#/review?piece=${encodeURIComponent(target)}`);
    await expect(page.getByRole('combobox',{name:'Occurrence',exact:true})).toHaveValue(target);
    await page.getByRole('link',{name:'Dependency graph',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Dependency Graph · 4000041'})).toBeVisible({timeout:30000});
    await page.goto('/?dataset=4000041#/dof');
    await expect(page.getByText('No reviewed connection and timing catalog for this dataset.')).toBeVisible();
});
