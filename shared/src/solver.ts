import { CELLS, PEERS } from './board';

/** Counts solutions of a grid (0 = empty), stopping once `limit` is reached. */
export function countSolutions(grid: readonly number[], limit = 2): number {
  const cells = [...grid];
  let count = 0;

  const candidates = (cell: number) => {
    const used = new Set(PEERS[cell].map((p) => cells[p]));
    return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => !used.has(d));
  };

  const search = (): void => {
    // Branch on the empty cell with the fewest candidates.
    let best = -1;
    let bestCandidates: number[] = [];
    for (let cell = 0; cell < CELLS; cell++) {
      if (cells[cell] !== 0) continue;
      const c = candidates(cell);
      if (best === -1 || c.length < bestCandidates.length) {
        best = cell;
        bestCandidates = c;
        if (c.length <= 1) break;
      }
    }
    if (best === -1) {
      count++;
      return;
    }
    for (const digit of bestCandidates) {
      cells[best] = digit;
      search();
      if (count >= limit) break;
    }
    cells[best] = 0;
  };

  search();
  return count;
}

/** True if every row, column and box of a full grid holds 1–9 exactly once. */
export function isValidSolution(grid: readonly number[]): boolean {
  return grid.every((d, cell) => d >= 1 && d <= 9 && PEERS[cell].every((p) => grid[p] !== d));
}
