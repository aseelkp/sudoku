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
