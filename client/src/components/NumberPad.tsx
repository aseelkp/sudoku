import { type GameState, remaining } from '@sudoku/shared';

interface Props {
  game: GameState;
  notesMode: boolean;
  onDigit: (digit: number) => void;
  onErase: () => void;
  onToggleNotes: () => void;
}

export function NumberPad({ game, notesMode, onDigit, onErase, onToggleNotes }: Props) {
  return (
    <div className="pad">
      <div className="digits">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => {
          const left = remaining(game, d);
          return (
            <button key={d} type="button" className="digit" disabled={left === 0} onClick={() => onDigit(d)}>
              {d}
              <small>{left || ''}</small>
            </button>
          );
        })}
      </div>
      <div className="tools">
        <button type="button" className={notesMode ? 'tool on' : 'tool'} aria-pressed={notesMode} onClick={onToggleNotes}>
          Notes {notesMode ? 'on' : 'off'} <kbd>N</kbd>
        </button>
        <button type="button" className="tool" onClick={onErase}>
          Erase <kbd>⌫</kbd>
        </button>
      </div>
    </div>
  );
}
