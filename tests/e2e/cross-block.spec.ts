import { expect, test } from '@playwright/test';

test('exchange only NAUO56, return the rotor shaft and finish the fit check', async ({page}) => {
    await page.goto('/?dataset=30465');
    await page.getByText('Advanced Parameters').click();
    await page.getByRole('combobox', {name:'Occurrence'}).selectOption('30465/NAUO17/NAUO56');
    await page.getByRole('button', {name:/replace cross block/i}).click();
    const manual = page.locator('[data-screen="manual"]');
    const step = page.getByRole('region', {name:'This step'});
    const confirm = page.getByRole('button', {name:'Confirm this step'});
    for (let index = 0; index < 15; index++) {
        await expect(manual).toHaveAttribute('data-phase','remove');
        if (index === 5) await expect(step).toContainText('24.4 mm');
        if (index === 14) await expect(step).toContainText('Slide the cross block sideways');
        await confirm.click();
    }
    await expect(manual).toHaveAttribute('data-phase','replace');
    await expect(step).toContainText('matching spare');
    await confirm.click();
    for (let index = 14; index >= 0; index--) {
        await expect(manual).toHaveAttribute('data-phase','restore');
        if (index === 5) await expect(step).toContainText('Raise the shaft through the replacement block');
        await confirm.click();
    }
    await expect(step).toContainText('turn the main rotor');
    await confirm.click();
    await expect(page.getByRole('heading', {name:'Repair complete'})).toBeVisible();
    await expect(page.getByText('14 healthy pieces disturbed in the modeled route.')).toBeVisible();
});
