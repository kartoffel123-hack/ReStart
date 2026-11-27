import { expect, test } from '@playwright/test';

for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    test(`the mechanic can see the helicopter before searching at ${viewport.width}px`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto('/');
        const search = page.getByLabel('Search pieces');
        const assembly = page.getByRole('region', { name: 'Assembly view' });
        await expect(search).toBeVisible();
        await expect(assembly).toBeInViewport();
        const field = (await assembly.boundingBox())!;
        const input = (await search.boundingBox())!;
        if (viewport.width === 390) {
            expect(field.y + field.height).toBeLessThanOrEqual(input.y);
        } else {
            expect(input.x + input.width).toBeLessThan(field.x);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    });
}
