import type { Difficulty } from '@sudoku/shared';
import { formatTime } from '../time';

interface Props {
  difficulty: Difficulty;
  /** e.g. "Same puzzle"; omitted in solo play. */
  mode?: string;
  mistakes: number;
  timeMs: number;
  /** The clock hasn't started yet. */
  idle?: boolean;
}

export function Stats({ difficulty, mode, mistakes, timeMs, idle }: Props) {
  return (
    <div className="stats">
      <span className="difficulty-name">{difficulty}</span>
      {mode && <span>{mode}</span>}
      <span className={mistakes ? 'mistakes has' : 'mistakes'}>
        {mistakes === 0 ? 'No mistakes yet' : mistakes === 1 ? '1 mistake' : `${mistakes} mistakes`}
      </span>
      <span className={idle ? 'timer idle' : 'timer'} aria-label="Time">
        {formatTime(timeMs)}
      </span>
    </div>
  );
}
