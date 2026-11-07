import { describe, expect, it } from 'vitest';
import { DIFFICULTIES, generatePuzzle } from './puzzle';
import { countSolutions, isValidSolution } from './solver';

describe.each(DIFFICULTIES)('generatePuzzle(%s)', (difficulty) => {
  it('produces puzzles with exactly one solution that matches the given solution', () => {
    for (let i = 0; i < 20; i++) {
      const p = generatePuzzle(difficulty);
      expect(p.givens).toHaveLength(81);
      expect(isValidSolution(p.solution)).toBe(true);
      p.givens.forEach((d, cell) => d !== 0 && expect(d).toBe(p.solution[cell]));
      expect(countSolutions(p.givens)).toBe(1);
    }
  });
});

it('harder puzzles have fewer givens', () => {
  const givens = DIFFICULTIES.map((d) => generatePuzzle(d).givens.filter(Boolean).length);
  expect(givens).toEqual([...givens].sort((a, b) => b - a));
});
