import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://www.crm.vighnotech.com/');
  await page.getByRole('textbox', { name: 'Email' }).click();
  await page.getByRole('textbox', { name: 'Email' }).fill('info@vighnotech.com');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('90909090');
  await page.getByRole('button', { name: 'Submit' }).click();
  await page.getByRole('link', { name: 'Add Data' }).click();
  await page.getByRole('textbox', { name: 'Full Name *' }).click();
});
