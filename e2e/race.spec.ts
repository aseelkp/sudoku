import { expect, test } from '@playwright/test';
import {
  blanksOf,
  cells,
  createRoom,
  joinByLink,
  newPlayer,
  play,
  readGivens,
  solve,
  waitForStart,
  wrongDigit,
} from './helpers';

test('race: same puzzle, opponent sees only progress, first to finish wins, rematch', async ({
  page: ana,
  browser,
}) => {
  const ben = await newPlayer(browser);
  const code = await createRoom(ana, 'Ana', 'Same puzzle');
  await joinByLink(ben, code, 'Ben');

  await expect(ana.locator('.countdown')).toHaveText('3');
  await waitForStart(ana, ben);

  const givens = await readGivens(ana);
  expect(await readGivens(ben)).toEqual(givens);
  const solution = solve(givens);
  const [first, second, ...rest] = blanksOf(givens);

  await play(ana, first, solution[first]);
  await play(ana, second, wrongDigit(solution[second]));
  await expect(cells(ana).nth(second)).toHaveClass(/wrong/);

  // Ben sees Ana's progress and mistake, but none of her digits.
  await expect(ben.locator('.racer.opponent')).toContainText('1 mistake');
  await expect(cells(ben).nth(first)).toHaveText('');

  await cells(ana).nth(second).click();
  await ana.keyboard.press('Backspace');
  for (const cell of [second, ...rest]) await play(ana, cell, solution[cell]);

  await expect(ana.getByRole('status')).toContainText('You win!');
  await expect(ben.getByRole('status')).toContainText('Ana wins');

  await ben.getByRole('button', { name: 'Rematch', exact: true }).click();
  await ana.getByRole('button', { name: 'Accept rematch' }).click();
  await waitForStart(ana, ben);
  expect((await readGivens(ana)).filter(Boolean).length).toBeLessThan(81);
});

test('race: leaving mid-race hands the win to the opponent', async ({ page: ana, browser }) => {
  const ben = await newPlayer(browser);
  const code = await createRoom(ana, 'Ana', 'Same puzzle');
  await joinByLink(ben, code, 'Ben');
  await waitForStart(ana, ben);

  await ben.getByRole('button', { name: 'Leave', exact: true }).click();
  await ben.getByRole('button', { name: 'Tap again to leave' }).click();
  await expect(ana.getByRole('status')).toContainText('Your opponent left the race.');
});

test('race: a reload rejoins the same seat with the board intact', async ({ page: ana, browser }) => {
  const ben = await newPlayer(browser);
  const code = await createRoom(ana, 'Ana', 'Same puzzle');
  await joinByLink(ben, code, 'Ben');
  await waitForStart(ana, ben);

  const givens = await readGivens(ana);
  const [first] = blanksOf(givens);
  const digit = solve(givens)[first];
  await play(ana, first, digit);

  await ana.reload();
  await waitForStart(ana);
  await expect(cells(ana).nth(first)).toHaveText(String(digit));
});

test('joining an unknown room shows an error', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Your name').fill('Cy');
  await page.getByLabel('Room code').fill('ZZZZZZ');
  await page.getByRole('button', { name: 'Join', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No room with code ZZZZZZ.' })).toBeVisible();
});
