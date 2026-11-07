import { type Page, expect, test } from '@playwright/test';

const paper = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test('follows the system theme by default', async ({ browser }) => {
  const dark = await (await browser.newContext({ colorScheme: 'dark' })).newPage();
  await dark.goto('/');
  expect(await paper(dark)).toBe('rgb(18, 26, 43)');
  const light = await (await browser.newContext({ colorScheme: 'light' })).newPage();
  await light.goto('/');
  expect(await paper(light)).toBe('rgb(247, 250, 255)');
});

test('an explicit choice overrides the system and survives a reload', async ({ browser }) => {
  const page = await (await browser.newContext({ colorScheme: 'light' })).newPage();
  await page.goto('/');
  await page.getByRole('radio', { name: 'Dark' }).click();
  expect(await paper(page)).toBe('rgb(18, 26, 43)');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await paper(page)).toBe('rgb(18, 26, 43)');

  await page.getByRole('radio', { name: 'System' }).click();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.*/);
  expect(await paper(page)).toBe('rgb(247, 250, 255)');
});
