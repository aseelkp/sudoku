export const SIZE = 9;
export const CELLS = 81;

export const rowOf = (cell: number) => Math.floor(cell / SIZE);
export const colOf = (cell: number) => cell % SIZE;
export const boxOf = (cell: number) => Math.floor(rowOf(cell) / 3) * 3 + Math.floor(colOf(cell) / 3);

/** For each cell, the 20 other cells that share its row, column or box. */
export const PEERS: readonly number[][] = Array.from({ length: CELLS }, (_, cell) => {
  const peers: number[] = [];
  for (let other = 0; other < CELLS; other++) {
    if (
      other !== cell &&
      (rowOf(other) === rowOf(cell) || colOf(other) === colOf(cell) || boxOf(other) === boxOf(cell))
    ) {
      peers.push(other);
    }
  }
  return peers;
});
