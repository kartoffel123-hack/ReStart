import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

test('inspect the turntable without offering a gear repair, then complete the scoped fallback', async ({page}) => {
    test.setTimeout(120000);
    const root = '.staging/4000041/demo';
    const generation = (await readFile(join(root,'candidate'),'utf8')).trim();
    expect(generation).toMatch(/^[a-f0-9]{64}$/);
    // Load the real compiled package through the production loader without
    // changing the channel used by the existing CT demo or any other browser.
    await page.route('**/models/4000041/channel.json', route => route.fulfill({json:{schemaVersion:1,stage:'candidate',path:`candidates/${generation}/`}}));
    await page.route(`**/models/4000041/candidates/${generation}/*`, route => {
        const name = new URL(route.request().url()).pathname.split('/').pop()!;
        return route.fulfill({path:join(root,'candidates',generation,name)});
    });
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.goto('/?dataset=4000041#/?piece=4000041%2FL112');
    await expect(page.locator('.stud-picker__selection code')).toHaveText('4000041/L112');
    await expect(page.getByRole('alert')).toContainText('No repair procedure');
    await page.locator('summary').filter({hasText:'Advanced Parameters'}).click();
    await expect(page.getByText('Generated model routes · 1 of 284 targets available.')).toBeVisible();
    const picker = page.getByRole('combobox', {name:'Occurrence'});
    await expect(picker.locator('option[value="4000041/L111"], option[value="4000041/L388"]')).toHaveCount(0);
    await picker.selectOption('4000041/L201');
    await page.getByRole('button',{name:/Replace buried gantry support/i}).click();
    const manual = page.locator('[data-screen="manual"]');
    for (const phase of ['remove','remove','remove','replace','restore','restore','restore','check']) {
        await expect(manual).toHaveAttribute('data-phase',phase);
        await page.getByRole('button',{name:'Confirm this step'}).click();
    }
    await expect(page.getByRole('heading',{name:'Repair complete'})).toBeVisible();
    await expect(page.getByText('10 healthy pieces disturbed in the modeled route.')).toBeVisible();
});
