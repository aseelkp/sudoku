import { expect, test } from '@playwright/test';
import { blanksOf, cells, createRoom, joinByLink, newPlayer, play, readGivens, solve, waitForStart } from './helpers';

test('solo: pausing hides the board and stops the clock; resuming brings both back', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Play solo' }).click();
  const givens = await readGivens(page);
  const [first] = blanksOf(givens);
  await cells(page).nth(first).click();
  await page.keyboard.press(`Digit${solve(givens)[first]}`);

  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByRole('status')).toContainText('Paused');
  // Nothing of the puzzle is on screen while paused.
  await expect(page.locator('.board .cell.given')).toHaveCount(0);
  await expect(page.locator('.digit').first()).toBeDisabled();
  const frozen = await page.getByLabel('Time, stopped').textContent();
  await page.waitForTimeout(1500);
  await expect(page.getByLabel('Time, stopped')).toHaveText(frozen!);

  await page.getByRole('button', { name: 'Resume' }).first().click();
  await expect(cells(page).nth(first)).toHaveText(String(solve(givens)[first]));
  await expect(page.getByLabel('Time', { exact: true })).toBeVisible();
});

test('solo: P toggles pause from the keyboard', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Play solo' }).click();
  await page.keyboard.press('p');
  await expect(page.getByRole('status')).toContainText('Paused');
  await page.keyboard.press('p');
  await expect(page.locator('.board .cell.given').first()).toBeVisible();
});

test('co-op: either player can pause; the board hides for both and moves are blocked', async ({
  page: ana,
  browser,
}) => {
  const ben = await newPlayer(browser);
  const code = await createRoom(ana, 'Ana', 'Co-op');
  await joinByLink(ben, code, 'Ben');
  await waitForStart(ana, ben);
  const givens = await readGivens(ana);
  const solution = solve(givens);
  const [first, second] = blanksOf(givens);
  await play(ana, first, solution[first]);

  await ben.getByRole('button', { name: 'Pause' }).click();
  await expect(ana.getByRole('status')).toContainText('Ben paused');
  await expect(ben.getByRole('status')).toContainText('Paused');
  await expect(ana.locator('.board .cell.given')).toHaveCount(0);

  await ana.getByRole('button', { name: 'Resume' }).first().click();
  await expect(ben.locator('.board .cell.given').first()).toBeVisible();
  await play(ben, second, solution[second]);
  await expect(cells(ana).nth(second)).toHaveText(String(solution[second]));
});

test('race: there is no pause button', async ({ page: ana, browser }) => {
  const ben = await newPlayer(browser);
  const code = await createRoom(ana, 'Ana', 'Same puzzle');
  await joinByLink(ben, code, 'Ben');
  await waitForStart(ana, ben);
  await expect(ana.getByRole('button', { name: 'Pause' })).toHaveCount(0);
});
