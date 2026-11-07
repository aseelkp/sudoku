import { type PlayerBoard, remaining } from '@sudoku/shared';
import { EraserIcon, PencilIcon } from './icons';

interface Props {
  board: PlayerBoard;
  notesMode: boolean;
  disabled?: boolean;
  onDigit: (digit: number) => void;
  onErase: () => void;
  onToggleNotes: () => void;
}

export function NumberPad({ board, notesMode, disabled, onDigit, onErase, onToggleNotes }: Props) {
  return (
    <div className="pad">
      <div className="digits">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => {
          const left = remaining(board, d);
          return (
            <button
              key={d}
              type="button"
              className="digit"
              aria-label={`${d}, ${left} left`}
              disabled={disabled || left === 0}
              onClick={() => onDigit(d)}
            >
              <span className="digit-value">{d}</span>
              <span className="digit-left">{left || ''}</span>
            </button>
          );
        })}
      </div>
      <div className="tools">
        <button
          type="button"
          className={notesMode ? 'btn on' : 'btn'}
          aria-pressed={notesMode}
          disabled={disabled}
          onClick={onToggleNotes}
        >
          <PencilIcon />
          Notes {notesMode ? 'on' : 'off'} <kbd>N</kbd>
        </button>
        <button type="button" className="btn" disabled={disabled} onClick={onErase}>
          <EraserIcon />
          Erase <kbd>⌫</kbd>
        </button>
      </div>
    </div>
  );
}
