import { expect, test } from '@playwright/test';

test('a mechanic exchanges the light stud, reseats it and checks the fit', async ({ page }) => {
    await page.goto('/#/helicopter');
    // The list and raycast must identify the same instance; drive the harder input.
    await expect(page.getByRole('button', { name: /select light stud/i })).toBeVisible();
    const canvas = page.locator('canvas[data-target-point]');
    await expect(canvas).toBeVisible();
    const [u,v] = (await canvas.getAttribute('data-target-point'))!.split(',').map(Number);
    const bounds = (await canvas.boundingBox())!;
    await canvas.click({ position: { x: u!*bounds.width, y: v!*bounds.height } });
    await expect(page.getByLabel('Assembly view').locator('canvas')).toBeVisible();
    for (const phase of ['remove', 'replace', 'restore', 'check']) {
        await expect(page.locator('[data-screen="manual"]')).toHaveAttribute('data-phase', phase);
        if (phase === 'check') {
            await page.getByRole('button', { name: 'Fit check failed' }).click();
            await expect(page.getByRole('button', { name: /confirm this step/i })).toBeDisabled();
            await page.getByRole('button', { name: 'Recheck after inspection' }).click();
        }
        await page.getByRole('button', { name: /replay the motion/i }).click();
        await expect(page.locator('[data-screen="manual"]')).toHaveAttribute('data-phase', phase);
        await page.getByRole('button', { name: /confirm this step/i }).click();
    }
    await expect(page.getByRole('heading', { name: /repair complete/i })).toBeVisible();
    await expect(page.getByText(/0 healthy pieces disturbed/i)).toBeVisible();
});
