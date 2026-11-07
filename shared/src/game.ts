import { CELLS, PEERS } from './board';
import type { Puzzle } from './puzzle';

export interface GameState {
  puzzle: Puzzle;
  /** 81 digits, 0 for empty. Includes the givens. */
  values: number[];
  /** 81 bitmasks; bit d is set when d is pencilled into the cell. */
  notes: number[];
  mistakes: number;
}

export type MoveResult = 'correct' | 'wrong' | 'ignored';

export function newGame(puzzle: Puzzle): GameState {
  return { puzzle, values: [...puzzle.givens], notes: new Array(CELLS).fill(0), mistakes: 0 };
}

export const isGiven = (s: GameState, cell: number) => s.puzzle.givens[cell] !== 0;
export const isWrong = (s: GameState, cell: number) =>
  s.values[cell] !== 0 && s.values[cell] !== s.puzzle.solution[cell];
/** Givens and correct entries can no longer be changed. */
export const isLocked = (s: GameState, cell: number) =>
  s.values[cell] !== 0 && s.values[cell] === s.puzzle.solution[cell];
export const hasNote = (s: GameState, cell: number, digit: number) => (s.notes[cell] & (1 << digit)) !== 0;

export function placeDigit(s: GameState, cell: number, digit: number): { state: GameState; result: MoveResult } {
  if (isLocked(s, cell) || s.values[cell] === digit) return { state: s, result: 'ignored' };

  const values = [...s.values];
  const notes = [...s.notes];
  values[cell] = digit;
  notes[cell] = 0;

  if (digit === s.puzzle.solution[cell]) {
    // A correct digit rules itself out of every peer's pencil marks.
    for (const p of PEERS[cell]) notes[p] &= ~(1 << digit);
    return { state: { ...s, values, notes }, result: 'correct' };
  }
  return { state: { ...s, values, notes, mistakes: s.mistakes + 1 }, result: 'wrong' };
}

export function eraseCell(s: GameState, cell: number): GameState {
  if (isLocked(s, cell)) return s;
  if (s.values[cell] !== 0) {
    const values = [...s.values];
    values[cell] = 0;
    return { ...s, values };
  }
  if (s.notes[cell] === 0) return s;
  const notes = [...s.notes];
  notes[cell] = 0;
  return { ...s, notes };
}

export function toggleNote(s: GameState, cell: number, digit: number): GameState {
  if (s.values[cell] !== 0) return s;
  const notes = [...s.notes];
  notes[cell] ^= 1 << digit;
  return { ...s, notes };
}

export const isSolved = (s: GameState) => s.values.every((d, cell) => d === s.puzzle.solution[cell]);

/** Correctly filled blanks as a fraction of all blanks, 0–1. */
export function progress(s: GameState): number {
  let blanks = 0;
  let filled = 0;
  for (let cell = 0; cell < CELLS; cell++) {
    if (isGiven(s, cell)) continue;
    blanks++;
    if (isLocked(s, cell)) filled++;
  }
  return blanks === 0 ? 1 : filled / blanks;
}

/** How many more times `digit` still has to be placed. */
export const remaining = (s: GameState, digit: number) =>
  9 - s.values.filter((d, cell) => d === digit && d === s.puzzle.solution[cell]).length;
