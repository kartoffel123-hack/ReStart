import { expect,test } from '@playwright/test';

test('both targets share one open path and are checked together on a narrow screen',async({page})=>{
    await page.setViewportSize({width:390,height:844});
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.goto('/');
    await page.getByRole('button',{name:'Replace pin and light stud together'}).click();
    for(const phase of ['remove','remove','replace','replace','restore','restore','check']) {
        await expect(page.locator('[data-screen="manual"]')).toHaveAttribute('data-phase',phase);
        expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
        await page.getByRole('button',{name:'Confirm this step'}).click();
    }
    await expect(page.getByText(/0 healthy pieces disturbed/)).toBeVisible();
});
