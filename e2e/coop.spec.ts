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

test('co-op: one shared board with shared notes and cursors, solved together', async ({ page: ana, browser }) => {
  const ben = await newPlayer(browser);
  const code = await createRoom(ana, 'Ana', 'Co-op');
  await joinByLink(ben, code, 'Ben');
  await waitForStart(ana, ben);

  const givens = await readGivens(ana);
  const solution = solve(givens);
  const blanks = blanksOf(givens);
  const [first, second, third] = blanks;

  // Partner's cursor
  await cells(ana).nth(first).click();
  await expect(cells(ben).nth(first)).toHaveClass(/partner-cursor/);
  await expect(cells(ben).nth(first)).toHaveAttribute('data-partner', 'Ana');

  // Shared pencil marks
  await ana.keyboard.press(`Shift+Digit${solution[first]}`);
  await expect(cells(ben).nth(first)).toHaveText(String(solution[first]));

  // Ben's moves land on Ana's board, mistakes included; Ana can erase them
  await play(ben, second, solution[second]);
  await expect(cells(ana).nth(second)).toHaveText(String(solution[second]));
  await play(ben, third, wrongDigit(solution[third]));
  await expect(cells(ana).nth(third)).toHaveClass(/wrong/);
  await cells(ana).nth(third).click();
  await ana.keyboard.press('Backspace');
  await expect(cells(ben).nth(third)).toHaveText('');

  const rest = blanks.filter((c) => c !== second);
  for (const [i, cell] of rest.entries()) await play(i % 2 ? ben : ana, cell, solution[cell]);

  await expect(ana.getByRole('status')).toContainText('Solved together!');
  await expect(ben.getByRole('status')).toContainText('Solved together!');
  await expect(ana.getByRole('row', { name: /Ben/ })).toContainText('placed');
});
