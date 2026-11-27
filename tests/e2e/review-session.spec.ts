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
    await page.getByText('Advanced Parameters').click();
    await page.getByRole('combobox',{name:'Occurrence'}).selectOption('30465/NAUO33/NAUO39');
    await page.getByRole('button',{name:/replace light stud/i}).click();
    await expect(page.locator('[data-phase="remove"]')).toBeVisible();
});

test('refresh asks about the kit before resuming a confirmed operation',async ({page})=>{
    await page.goto('/');
    await page.getByText('Advanced Parameters').click();
    await page.getByRole('combobox',{name:'Occurrence'}).selectOption('30465/NAUO33/NAUO39');
    await page.getByRole('button',{name:/replace light stud/i}).click();
    await page.getByRole('button',{name:'Confirm this step'}).click();
    await page.reload();
    await expect(page.getByText(/one confirmed step|1 confirmed step/i)).toBeVisible();
    await page.getByRole('button',{name:'Kit matches — resume'}).click();
    await expect(page.locator('[data-phase="replace"]')).toBeVisible();
});

test('previous step unconfirms the active repair step',async ({page})=>{
    await page.goto('/');
    await page.getByText('Advanced Parameters').click();
    await page.getByRole('combobox',{name:'Occurrence'}).selectOption('30465/NAUO33/NAUO39');
    await page.getByRole('button',{name:/replace light stud/i}).click();
    await expect(page.getByRole('button',{name:'Back to this step'})).toHaveCount(0);
    const step = page.getByRole('region',{name:'This step'});
    const firstInstruction = await step.locator('.rs-manual__instruction').textContent();
    await page.getByRole('button',{name:'Confirm this step'}).click();
    await page.getByRole('button',{name:'Previous step'}).click();
    await expect(step.locator('.rs-manual__instruction')).toHaveText(firstInstruction!);
    await expect(page.getByRole('button',{name:'Confirm this step'})).toBeEnabled();
    await expect(page.getByRole('button',{name:'Previous step'})).toBeDisabled();
});
