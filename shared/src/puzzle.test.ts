import { describe, expect, it } from 'vitest';
import { DIFFICULTIES, generatePuzzle, scramblePuzzle } from './puzzle';
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

describe('scramblePuzzle', () => {
  it('produces a different, valid, uniquely solvable puzzle with the same number of givens', () => {
    for (let i = 0; i < 50; i++) {
      const base = generatePuzzle('hard');
      const p = scramblePuzzle(base);
      expect(isValidSolution(p.solution)).toBe(true);
      p.givens.forEach((d, cell) => d !== 0 && expect(d).toBe(p.solution[cell]));
      expect(countSolutions(p.givens)).toBe(1);
      expect(p.givens.filter(Boolean)).toHaveLength(base.givens.filter(Boolean).length);
      expect(p.difficulty).toBe(base.difficulty);
    }
  });

  it('gives two players boards that look different', () => {
    const base = generatePuzzle('medium');
    const a = scramblePuzzle(base);
    const b = scramblePuzzle(base);
    const same = a.givens.filter((d, cell) => d === b.givens[cell]).length;
    // Matching empty cells is expected; matching digits everywhere would mean no scramble.
    expect(a.givens).not.toEqual(b.givens);
    expect(same).toBeLessThan(81);
  });
});
