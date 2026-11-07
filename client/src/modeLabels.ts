import type { Mode } from '@sudoku/shared';

export const MODE_LABEL: Record<Mode, string> = {
  race: 'Same puzzle',
  'fair-race': 'Different puzzles',
  coop: 'Co-op',
};
