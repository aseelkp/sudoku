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

/** What a player may see of their own board: everything except the solution. */
export interface PlayerBoard {
  givens: number[];
  values: number[];
  /** Cells holding a wrong digit. */
  wrong: number[];
  mistakes: number;
}

export function toPlayerBoard(s: GameState): PlayerBoard {
  const wrong: number[] = [];
  for (let cell = 0; cell < CELLS; cell++) if (isWrong(s, cell)) wrong.push(cell);
  return { givens: s.puzzle.givens, values: s.values, wrong, mistakes: s.mistakes };
}

/** Removes `digit` from the pencil marks of every peer of `cell`. */
export function clearPeerNotes(notes: number[], cell: number, digit: number): number[] {
  const next = [...notes];
  for (const p of PEERS[cell]) next[p] &= ~(1 << digit);
  return next;
}

export function newGame(puzzle: Puzzle): GameState {
  return { puzzle, values: [...puzzle.givens], notes: new Array(CELLS).fill(0), mistakes: 0 };
}

export const isGiven = (s: GameState, cell: number) => s.puzzle.givens[cell] !== 0;
export const isWrong = (s: GameState, cell: number) =>
  s.values[cell] !== 0 && s.values[cell] !== s.puzzle.solution[cell];
/** Givens and correct entries can no longer be changed. */
export const isLocked = (s: GameState, cell: number) =>
  s.values[cell] !== 0 && s.values[cell] === s.puzzle.solution[cell];
export const hasNote = (notes: readonly number[], cell: number, digit: number) => (notes[cell] & (1 << digit)) !== 0;

export function placeDigit(s: GameState, cell: number, digit: number): { state: GameState; result: MoveResult } {
  if (isLocked(s, cell) || s.values[cell] === digit) return { state: s, result: 'ignored' };

  const values = [...s.values];
  let notes = [...s.notes];
  values[cell] = digit;
  notes[cell] = 0;

  if (digit === s.puzzle.solution[cell]) {
    // A correct digit rules itself out of every peer's pencil marks.
    notes = clearPeerNotes(notes, cell, digit);
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
export const remaining = (b: PlayerBoard, digit: number) =>
  9 - b.values.filter((d, cell) => d === digit && !b.wrong.includes(cell)).length;
