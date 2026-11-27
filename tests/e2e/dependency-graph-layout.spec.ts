import { expect, test } from '@playwright/test';

for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    test(`NAUO56 opens on its repair sequence at ${viewport.width}px`, async ({page}) => {
        await page.setViewportSize(viewport);
        await page.goto('/#/graph?piece=30465%2FNAUO17%2FNAUO56');
        const repair = page.getByRole('region', {name:'Reparaturablauf'});
        await expect(repair).toBeVisible();
        await expect(repair.locator('details')).toHaveCount(3);
        await expect(repair).toContainText('NAUO57 bleibt eingebaut');
        await expect(page.getByTestId('dependency-tree-diagram')).toHaveCount(0);
        for (const group of await repair.locator('summary').all()) await group.click();
        const movers = await repair.locator('li code').allTextContents();
        expect(new Set(movers).size).toBe(14);
        expect(movers).not.toContain('NAUO57');
        await page.getByRole('button', {name:'Alle Abhängigkeiten'}).click();
        await expect(page.getByTestId('dependency-tree-diagram')).toBeVisible();
        await page.getByRole('button', {name:'Diese Reparatur'}).click();
        await expect(repair).toBeVisible();
    });
    test(`the graph and helicopter share the viewport at ${viewport.width}px`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto('/#/graph?piece=30465%2FNAUO9');
        const diagram = page.getByTestId('dependency-tree-diagram');
        const scene = page.locator('.rs-graph-visual__scene canvas');
        await expect(diagram).toBeInViewport({ ratio: 0.99 });
        await expect(scene).toBeInViewport({ ratio: 0.99 });
        expect((await scene.boundingBox())!.height).toBeGreaterThan(150);
        await expect(page.locator('.rs-graph-header__sub')).toContainText('NAUO9');
        await expect(page.getByText(/^Indirekt bewegen \([1-9]/)).toBeInViewport();
        await page.getByRole('button', { name: 'Kantenlegende' }).click();
        await expect(page.getByText(/^räumliche Blockade/)).toBeInViewport();
        await page.keyboard.press('Escape');

        if (viewport.width === 390) await page.getByRole('button', { name: 'Teile', exact: true }).click();
        const parts = page.getByRole('list', { name: 'Liste aller Teile' });
        await expect(parts.getByRole('button')).toHaveCount(70);
        const search = page.getByRole('searchbox', { name: 'Teile durchsuchen' });
        await search.fill('no-such-piece');
        await expect(page.getByRole('status')).toContainText('Keine passenden Teile');
        await search.clear();
        await parts.getByRole('button').last().click();
        await expect(scene).toBeInViewport({ ratio: 0.99 });
        await expect(diagram).toBeInViewport({ ratio: 0.99 });
        expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(viewport.height);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
        if (viewport.width === 390) {
            await expect(page.getByRole('button', { name: 'Graph & 3D' })).toBeFocused();
            await page.getByRole('button', { name: 'Details', exact: true }).click();
            await expect(page.getByRole('heading', { name: 'Ausbau & Wiedereinbau' })).toBeInViewport();
        }
    });
}
