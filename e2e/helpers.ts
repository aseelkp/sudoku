import { type Browser, type Page, expect } from '@playwright/test';

export const cells = (page: Page) => page.locator('.board .cell');

/** The puzzle as the player sees it: givens only, 0 for blanks. */
export async function readGivens(page: Page): Promise<number[]> {
  const raw = await cells(page).evaluateAll((els) =>
    els.map((el) => (el.classList.contains('given') ? Number(el.textContent) : 0)),
  );
  return raw;
}

/** Backtracking solver, so tests only use what a player can see. */
export function solve(givens: number[]): number[] {
  const g = [...givens];
  const ok = (i: number, d: number) => {
    const r = Math.floor(i / 9);
    const c = i % 9;
    const br = r - (r % 3);
    const bc = c - (c % 3);
    for (let k = 0; k < 9; k++) {
      if (g[r * 9 + k] === d || g[k * 9 + c] === d || g[(br + Math.floor(k / 3)) * 9 + bc + (k % 3)] === d) {
        return false;
      }
    }
    return true;
  };
  const go = (): boolean => {
    const i = g.indexOf(0);
    if (i < 0) return true;
    for (let d = 1; d <= 9; d++) {
      if (ok(i, d)) {
        g[i] = d;
        if (go()) return true;
      }
    }
    g[i] = 0;
    return false;
  };
  go();
  return g;
}

export const blanksOf = (givens: number[]) => givens.flatMap((d, i) => (d ? [] : [i]));
export const wrongDigit = (correct: number) => (correct % 9) + 1;

/** Selects a cell, types a digit, and waits for the server to confirm it. */
export async function play(page: Page, cell: number, digit: number) {
  await cells(page).nth(cell).click();
  await page.keyboard.press(`Digit${digit}`);
  await expect(cells(page).nth(cell)).not.toHaveClass(/pending/);
}

export async function newPlayer(browser: Browser) {
  const context = await browser.newContext();
  return context.newPage();
}

type Mode = 'Same puzzle' | 'Different puzzles' | 'Co-op';

export async function createRoom(page: Page, name: string, mode: Mode, difficulty = 'Easy'): Promise<string> {
  await page.goto('/');
  await page.getByLabel('Your name').fill(name);
  await page.getByRole('radio', { name: new RegExp(`^${mode}`) }).click();
  await page.getByRole('radio', { name: difficulty, exact: true }).click();
  await page.getByRole('button', { name: 'Create room' }).click();
  const code = (await page.locator('.big-code').textContent())!.trim();
  expect(code).toMatch(/^[A-Z2-9]{6}$/);
  return code;
}

export async function joinByLink(page: Page, code: string, name: string) {
  await page.goto(`/?room=${code}`);
  await expect(page.getByLabel('Room code')).toHaveValue(code);
  await page.getByLabel('Your name').fill(name);
  await page.getByRole('button', { name: 'Join', exact: true }).click();
}

/** Waits out the countdown until the board accepts input. */
export async function waitForStart(...pages: Page[]) {
  for (const page of pages) {
    await expect(page.locator('.board:not(.disabled):not(.placeholder)')).toBeVisible({ timeout: 10_000 });
  }
}
