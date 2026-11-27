import { expect, test } from '@playwright/test';

test('a mechanic exchanges the light stud, reseats it and checks the fit', async ({ page }) => {
    await page.goto('/');
    // The raycast selects the same instance that appears in the scene.
    const canvas = page.locator('canvas[data-target-point]');
    await expect(canvas).toBeVisible();
    const dragTarget = async () => {
        const [u,v] = (await canvas.getAttribute('data-target-point'))!.split(',').map(Number);
        const bounds = (await canvas.boundingBox())!;
        return { x: bounds.x+u!*bounds.width, y: bounds.y+v!*bounds.height };
    };
    const start = await dragTarget();
    await page.mouse.move(start.x,start.y);
    await page.mouse.down();
    await page.mouse.move(start.x+24,start.y+10,{steps:4});
    await page.mouse.up();
    await expect(page.getByText('[Please select a piece in the 3D view]')).toBeVisible();
    const clickTarget = await dragTarget();
    const bounds = (await canvas.boundingBox())!;
    await canvas.click({ position: { x: clickTarget.x-bounds.x, y: clickTarget.y-bounds.y } });
    await page.getByRole('button', { name: /replace light stud/i }).click();
    await expect(page.getByLabel('Assembly view').locator('canvas')).toBeVisible();
    await expect(page.getByRole('img', { name: 'Full helicopter overview' })).toBeVisible();
    const replay = page.getByRole('button', { name: 'Replay the motion' });
    await replay.hover();
    await expect.poll(() => replay.evaluate((button) => getComputedStyle(button, '::after').visibility)).toBe('visible');
    const viewBounds = (await page.locator('.rs-manual__field').boundingBox())!;
    const cardBounds = (await page.getByRole('region', { name: 'This step' }).boundingBox())!;
    expect(viewBounds.x).toBe(0);
    expect(viewBounds.y).toBe(0);
    expect(viewBounds.width).toBe(page.viewportSize()!.width);
    expect(viewBounds.height).toBe(page.viewportSize()!.height);
    expect(cardBounds.x).toBeGreaterThan(viewBounds.x);
    expect(cardBounds.y).toBeGreaterThan(viewBounds.y);
    expect(cardBounds.x).toBeLessThan(viewBounds.x+viewBounds.width);
    expect(cardBounds.y).toBeLessThan(viewBounds.y+viewBounds.height);
    for (const phase of ['remove', 'replace', 'restore', 'check']) {
        await expect(page.locator('[data-screen="manual"]')).toHaveAttribute('data-phase', phase);
        if (phase === 'replace') {
            await expect(page.getByRole('img', { name: 'Full helicopter overview' })).toHaveCount(0);
        } else {
            await expect(page.getByRole('img', { name: 'Full helicopter overview' })).toBeVisible();
        }
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
    await expect(page.locator('.stud-complete__confetti')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.getByText(/0 healthy pieces disturbed/i)).toBeVisible();
    await expect(page.getByRole('region', { name: 'Restored helicopter' }).locator('canvas')).toBeVisible();
    await page.getByText('Repair details', { exact: true }).click();
    await expect(page.getByText(/Procedure:/)).toBeVisible();
});
