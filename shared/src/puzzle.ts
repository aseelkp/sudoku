import { getSudoku } from 'sudoku-gen';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';
export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

export interface Puzzle {
  /** 81 digits, 0 for an empty cell. */
  givens: number[];
  /** 81 digits, the unique solution. */
  solution: number[];
  difficulty: Difficulty;
}

const parse = (s: string) => Array.from(s, (ch) => (ch === '-' ? 0 : Number(ch)));

export function generatePuzzle(difficulty: Difficulty): Puzzle {
  const { puzzle, solution } = getSudoku(difficulty);
  return { givens: parse(puzzle), solution: parse(solution), difficulty };
}

const shuffle = <T>(items: T[], random: () => number): T[] => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/** A random order of 0–8 that keeps each group of three together (rows within bands, bands among bands). */
const lineOrder = (random: () => number) =>
  shuffle([0, 1, 2], random).flatMap((band) => shuffle([0, 1, 2], random).map((line) => band * 3 + line));

/**
 * Returns a different-looking puzzle that is exactly as hard as `p`.
 *
 * Relabelling digits, permuting rows/columns within a band, permuting bands and transposing are symmetries
 * of sudoku: every solving step in one puzzle maps onto the same step in the other.
 */
export function scramblePuzzle(p: Puzzle, random: () => number = Math.random): Puzzle {
  const digits = [0, ...shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], random)];
  const rows = lineOrder(random);
  const cols = lineOrder(random);
  const transpose = random() < 0.5;

  const map = (grid: number[]) =>
    grid.map((_, cell) => {
      let r = rows[Math.floor(cell / 9)];
      let c = cols[cell % 9];
      if (transpose) [r, c] = [c, r];
      return digits[grid[r * 9 + c]];
    });

  return { givens: map(p.givens), solution: map(p.solution), difficulty: p.difficulty };
}
