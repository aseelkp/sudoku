import { useEffect, useRef } from 'react';
import { CELLS, type PlayerBoard, type Writer, boxOf, colOf, hasNote, rowOf } from '@sudoku/shared';

interface Props {
  board: PlayerBoard;
  notes: number[];
  selected: number | null;
  wrongMove: { cell: number; id: number } | null;
  /** A digit sent to the server but not yet confirmed. */
  pending?: { cell: number; digit: number } | null;
  /** Co-op: whose pencil each digit is in. Without it, every written digit is the player's own. */
  writtenBy?: Writer[] | null;
  /** The co-op partner's selected cell, tagged with their name. */
  partner?: { cell: number | null; name: string } | null;
  disabled?: boolean;
  onSelect: (cell: number) => void;
}

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const ROWS = [0, 1, 2, 3, 4, 5, 6, 7, 8];

const edgeClasses = (cell: number) => [
  colOf(cell) === 8 ? 'last-col' : colOf(cell) % 3 === 2 && 'edge-right',
  rowOf(cell) === 8 ? 'last-row' : rowOf(cell) % 3 === 2 && 'edge-bottom',
  cell === 0 && 'corner-tl',
  cell === 8 && 'corner-tr',
  cell === 72 && 'corner-bl',
  cell === 80 && 'corner-br',
];

export function Board({ board, notes, selected, wrongMove, pending, writtenBy, partner, disabled, onSelect }: Props) {
  const valueAt = (cell: number) => (pending?.cell === cell ? pending.digit : board.values[cell]);
  const selectedDigit = selected === null ? 0 : valueAt(selected);
  const gridRef = useRef<HTMLDivElement>(null);

  // One Tab stop for the whole board; arrow keys move the selection, and keyboard focus follows it.
  const focusable = selected ?? 0;
  useEffect(() => {
    const grid = gridRef.current;
    if (selected === null || !grid?.contains(document.activeElement)) return;
    grid.querySelector<HTMLElement>(`[data-cell="${selected}"]`)?.focus();
  }, [selected]);

  const renderCell = (cell: number) => {
    const value = valueAt(cell);
    const given = board.givens[cell] !== 0;
    const isPending = pending?.cell === cell;
    const wrong = !isPending && board.wrong.includes(cell);
    const byPartner = writtenBy?.[cell] === 2;
    const related =
      selected !== null &&
      (rowOf(cell) === rowOf(selected) || colOf(cell) === colOf(selected) || boxOf(cell) === boxOf(selected));
    const classes = [
      'cell',
      ...edgeClasses(cell),
      given ? 'given' : value !== 0 && 'written',
      byPartner && 'by-partner',
      isPending && 'pending',
      wrong && 'wrong',
      wrongMove?.cell === cell && 'shake',
      related && 'related',
      value !== 0 && value === selectedDigit && 'same-digit',
      cell === selected && 'selected',
      partner?.cell === cell && 'partner-cursor',
    ].filter(Boolean);

    const who = given ? '' : byPartner ? `, written by ${partner?.name ?? 'your partner'}` : '';
    const label = `Row ${rowOf(cell) + 1}, column ${colOf(cell) + 1}, ${value ? value + (wrong ? ', wrong' : '') : 'empty'}${who}`;

    return (
      <button
        // Re-mounting on each wrong move replays the shake animation.
        key={wrongMove?.cell === cell ? `${cell}-${wrongMove.id}` : cell}
        type="button"
        role="gridcell"
        className={classes.join(' ')}
        aria-label={label}
        aria-selected={cell === selected}
        tabIndex={cell === focusable ? 0 : -1}
        data-cell={cell}
        data-partner={partner?.cell === cell ? partner.name : undefined}
        disabled={disabled}
        onClick={() => onSelect(cell)}
        onFocus={() => cell !== selected && onSelect(cell)}
      >
        {value !== 0 ? (
          wrong ? (
            <span className="ring">{value}</span>
          ) : (
            value
          )
        ) : notes[cell] !== 0 ? (
          <span className="notes" aria-hidden="true">
            {DIGITS.map((d) => (
              <span key={d} className={d === selectedDigit ? 'note match' : 'note'}>
                {hasNote(notes, cell, d) ? d : ''}
              </span>
            ))}
          </span>
        ) : null}
      </button>
    );
  };

  return (
    <div ref={gridRef} className={disabled ? 'board disabled' : 'board'} role="grid" aria-label="Sudoku board">
      {ROWS.map((row) => (
        <div key={row} role="row" className="board-row">
          {ROWS.map((col) => renderCell(row * 9 + col))}
        </div>
      ))}
    </div>
  );
}

/** The empty grid shown before a round starts. */
export function EmptyBoard() {
  return (
    <div className="board placeholder" aria-hidden="true">
      {Array.from({ length: CELLS }, (_, cell) => (
        <span key={cell} className={['cell', ...edgeClasses(cell)].filter(Boolean).join(' ')} />
      ))}
    </div>
  );
}
