import { expect, test } from '@playwright/test';

test('the assembly graph shows layered provisional removal availability separately from a repair route', async ({ page }) => {
    await page.goto('/#/graph?piece=30465/NAUO1/NAUO80');

    const panel = page.getByRole('region', { name: 'Assembly-wide disassembly layers' });
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('Availability snapshots, not a repair route.');
    await expect(panel.getByRole('heading', { name: 'Layer 1' })).toBeVisible();
    await expect(panel).toContainText('Right Angle Beam with Curve (NAUO16)');
    await expect(panel.getByRole('heading', { name: 'Layer 2' })).toBeVisible();
    await expect(panel.getByText(/Still blocked: \d+ exit options/)).toBeVisible();
    await expect(panel).toContainText('70 of 70 components have a modeled option or candidate exit.');
    await expect(panel).toContainText('49 remain blocked, deferred, or not yet peeled; 0 have no assessment.');
});
