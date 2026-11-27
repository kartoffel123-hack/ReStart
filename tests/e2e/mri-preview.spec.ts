import { expect, test } from '@playwright/test';

test('the default route shows the MRI geometry without implying repair support', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'LEGO MRI' })).toBeVisible();
    await expect(page.getByText('Preview only · no repair data')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Single tessellated solid' })).toBeVisible();
    await expect(page.locator('.mri-preview__canvas')).toHaveAttribute('data-model-loaded', 'true', { timeout: 15000 });
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Open the helicopter repair pilot' })).toHaveAttribute('href', '#/helicopter');
});
