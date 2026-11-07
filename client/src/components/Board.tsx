import { type GameState, boxOf, colOf, hasNote, isGiven, isWrong, rowOf } from '@sudoku/shared';

interface Props {
  game: GameState;
  selected: number | null;
  wrongMove: { cell: number; id: number } | null;
  onSelect: (cell: number) => void;
}

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function Board({ game, selected, wrongMove, onSelect }: Props) {
  const selectedDigit = selected === null ? 0 : game.values[selected];

  return (
    <div className="board" role="grid" aria-label="Sudoku board">
      {game.values.map((value, cell) => {
        const related =
          selected !== null &&
          (rowOf(cell) === rowOf(selected) || colOf(cell) === colOf(selected) || boxOf(cell) === boxOf(selected));
        const classes = [
          'cell',
          colOf(cell) % 3 === 2 && colOf(cell) !== 8 && 'edge-right',
          rowOf(cell) % 3 === 2 && rowOf(cell) !== 8 && 'edge-bottom',
          isGiven(game, cell) ? 'given' : value && 'entered',
          isWrong(game, cell) && 'wrong',
          wrongMove?.cell === cell && 'shake',
          related && 'related',
          value !== 0 && value === selectedDigit && 'same-digit',
          cell === selected && 'selected',
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
            onClick={() => onSelect(cell)}
          >
            {value !== 0 ? (
              value
            ) : game.notes[cell] !== 0 ? (
              <span className="notes">
                {DIGITS.map((d) => (
                  <span key={d} className={d === selectedDigit ? 'note match' : 'note'}>
                    {hasNote(game, cell, d) ? d : ''}
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
