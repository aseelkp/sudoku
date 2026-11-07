import type { Difficulty } from '@sudoku/shared';
import { formatTime } from '../time';
import { PauseIcon, PlayIcon } from './icons';

interface Props {
  difficulty: Difficulty;
  /** e.g. "Same puzzle"; omitted in solo play. */
  mode?: string;
  mistakes: number;
  timeMs: number;
  /** The clock isn't running: before the start, or while paused. */
  idle?: boolean;
  /** Shows a pause/resume button next to the clock. */
  pause?: { paused: boolean; onToggle: () => void };
}

export function Stats({ difficulty, mode, mistakes, timeMs, idle, pause }: Props) {
  return (
    <div className="stats">
      <span className="difficulty-name">{difficulty}</span>
      {mode && <span>{mode}</span>}
      <span className={mistakes ? 'mistakes has' : 'mistakes'}>
        {mistakes === 0 ? 'No mistakes yet' : mistakes === 1 ? '1 mistake' : `${mistakes} mistakes`}
      </span>
      <span className={idle ? 'timer idle' : 'timer'} aria-label={idle ? 'Time, stopped' : 'Time'}>
        {formatTime(timeMs)}
      </span>
      {pause && (
        <button
          type="button"
          className={pause.paused ? 'icon-btn on' : 'icon-btn'}
          aria-label={pause.paused ? 'Resume' : 'Pause'}
          title={pause.paused ? 'Resume (P)' : 'Pause (P)'}
          onClick={pause.onToggle}
        >
          {pause.paused ? <PlayIcon /> : <PauseIcon />}
        </button>
      )}
    </div>
  );
}
