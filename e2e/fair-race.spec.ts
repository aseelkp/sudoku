import { expect, test } from '@playwright/test';
import { blanksOf, createRoom, joinByLink, newPlayer, play, readGivens, solve, waitForStart } from './helpers';

test('fair race: each player gets a different board of the same size', async ({ page: ana, browser }) => {
  const ben = await newPlayer(browser);
  const code = await createRoom(ana, 'Ana', 'Different puzzles', 'Hard');
  await expect(ana.locator('.waiting')).toContainText('Different puzzles');
  await joinByLink(ben, code, 'Ben');
  await waitForStart(ana, ben);

  const anaGivens = await readGivens(ana);
  const benGivens = await readGivens(ben);
  expect(benGivens).not.toEqual(anaGivens);
  expect(benGivens.filter(Boolean).length).toBe(anaGivens.filter(Boolean).length);

  const solution = solve(benGivens);
  for (const cell of blanksOf(benGivens)) await play(ben, cell, solution[cell]);
  await expect(ben.getByRole('status')).toContainText('You win!');
  await expect(ana.getByRole('status')).toContainText('They solved theirs');
});
