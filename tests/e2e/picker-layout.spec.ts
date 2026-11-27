import { expect, test } from '@playwright/test';

for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    test(`the mechanic can select a piece from the helicopter at ${viewport.width}px`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto('/');
        const search = page.getByLabel('Search pieces');
        const assembly = page.getByRole('region', { name: 'Assembly view' });
        await expect(assembly).toBeInViewport();
        await expect(page.getByText('Advanced Parameters')).toBeVisible();
        await expect(search).toBeHidden();
        await expect(page.getByText('[Please select a piece in the 3D view]')).toBeVisible();
        await expect(page.getByRole('button', { name: /^Replace / })).toHaveCount(0);
        await page.getByText('Advanced Parameters').click();
        await expect(search).toBeVisible();
        const occurrence = page.getByLabel('Occurrence');
        const lightStud = occurrence.locator('option').filter({ hasText: 'Light Stud' }).first();
        await occurrence.selectOption((await lightStud.getAttribute('value'))!);
        await expect(page.getByRole('button', { name: 'Replace Light Stud' })).toBeVisible();
        await expect(page.getByText('Isolate selected piece')).toHaveCount(0);
        await expect(page.getByText('Exploded view')).toHaveCount(0);
        await expect(page.locator('.stud-picker__header a')).toHaveCount(0);
        const field = (await assembly.boundingBox())!;
        const input = (await search.boundingBox())!;
        if (viewport.width === 390) {
            expect(input.y + input.height).toBeLessThanOrEqual(field.y);
        } else {
            expect(field.x + field.width).toBeLessThan(input.x);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    });
}
