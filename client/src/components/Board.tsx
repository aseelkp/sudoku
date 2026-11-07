import { type PlayerBoard, boxOf, colOf, hasNote, rowOf } from '@sudoku/shared';

interface Props {
  board: PlayerBoard;
  notes: number[];
  selected: number | null;
  wrongMove: { cell: number; id: number } | null;
  /** A digit sent to the server but not yet confirmed. */
  pending?: { cell: number; digit: number } | null;
  /** The co-op partner's selected cell. */
  partnerCursor?: number | null;
  disabled?: boolean;
  onSelect: (cell: number) => void;
}

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function Board({ board, notes, selected, wrongMove, pending, partnerCursor, disabled, onSelect }: Props) {
  const valueAt = (cell: number) => (pending?.cell === cell ? pending.digit : board.values[cell]);
  const selectedDigit = selected === null ? 0 : valueAt(selected);

  return (
    <div className={disabled ? 'board disabled' : 'board'} role="grid" aria-label="Sudoku board">
      {board.values.map((_, cell) => {
        const value = valueAt(cell);
        const related =
          selected !== null &&
          (rowOf(cell) === rowOf(selected) || colOf(cell) === colOf(selected) || boxOf(cell) === boxOf(selected));
        const classes = [
          'cell',
          colOf(cell) % 3 === 2 && colOf(cell) !== 8 && 'edge-right',
          rowOf(cell) % 3 === 2 && rowOf(cell) !== 8 && 'edge-bottom',
          board.givens[cell] ? 'given' : value && 'entered',
          pending?.cell === cell && 'pending',
          pending?.cell !== cell && board.wrong.includes(cell) && 'wrong',
          wrongMove?.cell === cell && 'shake',
          related && 'related',
          value !== 0 && value === selectedDigit && 'same-digit',
          cell === selected && 'selected',
          cell === partnerCursor && 'partner',
        ].filter(Boolean);

        return (
          <button
            // Re-mounting on each wrong move replays the shake animation.
            key={wrongMove?.cell === cell ? `${cell}-${wrongMove.id}` : cell}
            type="button"
            role="gridcell"
            className={classes.join(' ')}
            aria-label={`Row ${rowOf(cell) + 1}, column ${colOf(cell) + 1}${value ? `, ${value}` : ', empty'}`}
            aria-selected={cell === selected}
            disabled={disabled}
            onClick={() => onSelect(cell)}
          >
            {value !== 0 ? (
              value
            ) : notes[cell] !== 0 ? (
              <span className="notes">
                {DIGITS.map((d) => (
                  <span key={d} className={d === selectedDigit ? 'note match' : 'note'}>
                    {hasNote(notes, cell, d) ? d : ''}
                  </span>
                ))}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
