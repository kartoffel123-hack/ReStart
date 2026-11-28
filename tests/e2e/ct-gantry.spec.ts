import { expect,test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const target='4000041/L201';
test('exchange the buried gantry brick while keeping the two five-piece crown sections intact',async({page})=>{
    test.setTimeout(120000);
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.goto('/?dataset=4000041#/');
    await page.getByRole('button',{name:/Buried gantry support brick.*10 healthy pieces moved/i}).click();
    await expect(page.locator('.stud-picker__selection code')).toHaveText(target);
    await page.getByRole('button',{name:'Reveal buried piece'}).click();
    await expect(page.getByRole('button',{name:'Show assembled scanner'})).toHaveAttribute('aria-pressed','true');
    await page.getByRole('button',{name:'Show assembled scanner'}).click();
    await page.getByRole('button',{name:/Replace buried gantry support/i}).click();
    const screen=page.locator('[data-screen="manual"]'),canvas=screen.locator('canvas');
    const phaseAndMembers=[['remove',5],['remove',5],['remove',1],['replace',1],['restore',1],['restore',5],['restore',5],['check',1]] as const;
    for (const [i,[phase,count]] of phaseAndMembers.entries()) {
        await expect(screen).toHaveAttribute('data-phase',phase);
        await expect.poll(async()=> (await canvas.getAttribute('data-moving-members'))?.split(',').length,{timeout:30000}).toBe(count);
        if(i===0) {
            await expect(screen.locator('.rs-manual__instruction')).toContainText('nearer the control room');
            await expect(canvas).toHaveAttribute('data-motion-offset-mm','0.00,-92.80,150.00');
        }
        if(i===2) {
            await expect(screen.locator('.rs-manual__instruction')).toContainText('middle two studs');
            await expect(canvas).toHaveAttribute('data-active-instance',target);
            await expect(canvas).toHaveAttribute('data-tool-instance','4000041/L550');
            await page.getByRole('button',{name:'Show starting pose'}).click();
            await expect(canvas).toHaveAttribute('data-motion-offset-mm','0.00,0.00,0.00');
        }
        if(phase==='restore') await expect(canvas).toHaveAttribute('data-motion-offset-mm','0.00,0.00,0.00');
        await page.getByRole('button',{name:'Confirm this step'}).click();
    }
    await expect(page.getByRole('heading',{name:'Repair complete'})).toBeVisible();
    await expect(page.getByText('10 healthy pieces disturbed in the modeled route.')).toBeVisible();
    const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export repair report'}).click();
    const report=JSON.parse(await readFile((await (await download).path())!,'utf8'));
    expect(report.targetIds).toEqual([target]);
    expect(report.repair.preservedUnits.map((u:{outcome:string})=>u.outcome)).toEqual(['preserved-intact','preserved-intact']);
});

test('the intact lid clears the crown before travelling sideways to the bench',async({page})=>{
    test.setTimeout(60000);
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.goto('/?dataset=4000041#/?piece=4000041%2FL201');
    await page.getByRole('button',{name:/Replace buried gantry support/i}).click();
    const canvas=page.locator('canvas[data-moving-members]');await expect(canvas).toBeVisible({timeout:30000});
    await page.getByRole('button',{name:'Replay the motion'}).click();
    await page.waitForFunction(()=>{
        const values=document.querySelector<HTMLCanvasElement>('canvas[data-motion-offset-mm]')?.dataset.motionOffsetMm?.split(',').map(Number);
        return values && Math.abs(values[1]!-45)<.01 && values[2]!>1 && values[2]!<149;
    });
    await expect(page.locator('[data-screen="manual"]')).toHaveAttribute('data-phase','remove');
});
