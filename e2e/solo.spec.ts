import { expect, test } from '@playwright/test';
import { blanksOf, cells, readGivens, solve, wrongDigit } from './helpers';

test('solo: mistakes show immediately, notes work, progress survives a reload, and solving ends the game', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Play solo' }).click();

  const givens = await readGivens(page);
  const solution = solve(givens);
  const [first, second, third, ...rest] = blanksOf(givens);

  await cells(page).nth(first).click();
  await page.keyboard.press(`Digit${solution[first]}`);
  await expect(cells(page).nth(first)).toHaveText(String(solution[first]));

  await cells(page).nth(second).click();
  await page.keyboard.press(`Digit${wrongDigit(solution[second])}`);
  await expect(cells(page).nth(second)).toHaveClass(/wrong/);
  await expect(page.locator('.stats .mistakes')).toHaveText('1 mistake');

  await cells(page).nth(third).click();
  await page.keyboard.press('Shift+Digit3');
  await page.keyboard.press('Shift+Digit7');
  await expect(cells(page).nth(third)).toHaveText('37');

  await page.reload();
  await page.getByRole('button', { name: 'Play solo' }).click();
  await expect(page.locator('.stats .mistakes')).toHaveText('1 mistake');
  await expect(cells(page).nth(first)).toHaveText(String(solution[first]));

  for (const cell of [second, third, ...rest]) {
    await cells(page).nth(cell).click();
    await page.keyboard.press(`Digit${solution[cell]}`);
  }
  await expect(page.getByRole('status')).toContainText('Solved!');
});

test('keyboard: the board is one Tab stop and focus follows the arrow keys', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Play solo' }).click();

  await expect(page.locator('.board .cell[tabindex="0"]')).toHaveCount(1);
  await expect(page.getByRole('row')).toHaveCount(9);

  await cells(page).nth(40).focus();
  await expect(cells(page).nth(40)).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await expect(cells(page).nth(50)).toBeFocused();
  await expect(cells(page).nth(50)).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.board .cell[tabindex="0"]')).toHaveCount(1);
});
