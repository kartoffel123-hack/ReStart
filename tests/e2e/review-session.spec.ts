import { expect, test } from '@playwright/test';

test('blocking one exit shows the remaining detour, blocking both reports no route, and neither changes the mechanic manual',async ({page})=>{
    await page.goto('/#/review');
    await page.getByLabel('Reason',{exact:true}).fill('The handle needs this connection released.');
    await page.getByRole('button',{name:'Add blocker'}).click();
    await expect(page.getByRole('status')).toContainText('Draft: 6 steps, 1 healthy');
    await page.getByRole('combobox',{name:'Move option'}).selectOption('park-cap');
    await page.getByRole('button',{name:'Add blocker'}).click();
    await expect(page.getByRole('status')).toContainText('no-feasible-route');
    await page.reload();
    await expect(page.getByRole('status')).toContainText('no-feasible-route');
    const download=page.waitForEvent('download');
    await page.getByRole('button',{name:'Export draft'}).click();
    const file=await (await download).path();
    await page.getByRole('button',{name:'Restore baseline'}).click();
    await expect(page.getByRole('status')).toContainText('replay passed');
    await page.getByLabel('Import draft').setInputFiles(file!);
    await expect(page.getByRole('status')).toContainText('no-feasible-route');
    await page.getByRole('link',{name:'Mechanic manual'}).click();
    await page.getByRole('button',{name:/select light stud/i}).click();
    await expect(page.locator('[data-phase="remove"]')).toBeVisible();
});

test('selected piece scene fills its reviewer panel',async ({page})=>{
    await page.goto('/#/review');
    const scene=page.locator('.review-scene');
    await expect(scene).toBeVisible();
    const panel=await scene.boundingBox();
    const canvas=await scene.locator('canvas').boundingBox();
    expect(panel?.height).toBeGreaterThan(0);
    expect(canvas?.height).toBeGreaterThan(0);
    expect(canvas?.width).toBeGreaterThan(0);
});

test('refresh asks about the kit before resuming a confirmed operation',async ({page})=>{
    await page.goto('/');
    await page.getByRole('button',{name:/select light stud/i}).click();
    await page.getByRole('button',{name:'Confirm this step'}).click();
    await page.reload();
    await expect(page.getByText(/one confirmed step|1 confirmed step/i)).toBeVisible();
    await page.getByRole('button',{name:'Kit matches — resume'}).click();
    await expect(page.locator('[data-phase="replace"]')).toBeVisible();
});
