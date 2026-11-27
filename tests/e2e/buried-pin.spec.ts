import { expect,test } from '@playwright/test';

test('the cap is parked and restored around the blue pin exchange',async ({page})=>{
    await page.goto('/#/helicopter');
    await page.getByRole('combobox',{name:'Occurrence'}).selectOption('30465/NAUO33/NAUO38');
    await page.getByRole('button',{name:/select friction pin with stud/i}).click();
    for(const instruction of [/slide the red cap off/i,/pull the blue pin/i,/exchange the blue friction pin/i,/press the spare split end/i,/slide the red cap back/i,/gently check the red cap/i]) {
        await expect(page.getByRole('region',{name:'This step'})).toContainText(instruction);
        await page.getByRole('button',{name:'Confirm this step'}).click();
    }
    await expect(page.getByText(/1 healthy piece disturbed/)).toBeVisible();
});
