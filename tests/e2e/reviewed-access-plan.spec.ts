import { expect, test } from '@playwright/test';

test('the mechanic can read reviewed access sequences before their motions are modeled', async ({ page }) => {
    await page.goto('/#/helicopter');
    const occurrence = page.getByRole('combobox', { name: 'Occurrence' });
    await occurrence.selectOption('30465/NAUO9');
    const plan = page.getByRole('region', { name: 'Reviewed access plan' });
    await expect(plan).toContainText('has not been replayed or physically verified');
    await expect(plan.getByRole('list', { name: 'Disassembly' }).getByRole('listitem')).toHaveText([
        /Remove .*NAUO3\b/, /Remove .*NAUO5\b/, /Remove .*NAUO80.*−X/,
        /Slide .*NAUO70.*−Z/, /Remove .*NAUO9\b/
    ]);
    await expect(plan.getByRole('list', { name: 'Restoration' }).getByRole('listitem')).toHaveText([
        /Fit replacement .*NAUO9\b/, /Slide .*NAUO70.*\+Z/, /Refit .*NAUO80.*\+X/,
        /Refit .*NAUO5\b/, /Refit .*NAUO3\b/
    ]);
    await expect(page.getByRole('button', { name: /^(select |confirm this step|replay the motion)/i })).toHaveCount(0);
    await occurrence.selectOption('30465/NAUO3');
    await expect(plan).toHaveCount(0);
    await occurrence.selectOption('30465/NAUO1/NAUO80');
    await expect(page.getByText('No modeled repair available for this occurrence.')).toBeVisible();
    await expect(plan).toContainText('This proposed order has not been replayed or physically verified.');
    await expect(plan.getByRole('list', { name: 'Disassembly' }).getByRole('listitem')).toHaveText([
        /Remove .*NAUO34.*direction of flight/,
        /Remove .*NAUO30\b/,
        /Remove .*NAUO3\b/,
        /Remove .*NAUO41\b/,
        /Remove .*NAUO40\b/,
        /Remove .*NAUO5\b/,
        /Remove .*NAUO80\b/
    ]);
});
