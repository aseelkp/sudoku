import { type PlayerBoard, remaining } from '@sudoku/shared';

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
            <button key={d} type="button" className="digit" disabled={disabled || left === 0} onClick={() => onDigit(d)}>
              {d}
              <small>{left || ''}</small>
            </button>
          );
        })}
      </div>
      <div className="tools">
        <button
          type="button"
          className={notesMode ? 'tool on' : 'tool'}
          aria-pressed={notesMode}
          disabled={disabled}
          onClick={onToggleNotes}
        >
          Notes {notesMode ? 'on' : 'off'} <kbd>N</kbd>
        </button>
        <button type="button" className="tool" disabled={disabled} onClick={onErase}>
          Erase <kbd>⌫</kbd>
        </button>
      </div>
    </div>
  );
}
