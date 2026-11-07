import { useMemo, useState } from 'react';
import { DIFFICULTIES, type Difficulty, toPlayerBoard } from '@sudoku/shared';
import { Board } from '../components/Board';
import { NumberPad } from '../components/NumberPad';
import { formatTime } from '../time';
import { useBoardKeys } from '../useBoardKeys';
import { useSudoku } from '../useSudoku';

export function SoloScreen({ onHome }: { onHome: () => void }) {
  const { game, selected, notesMode, wrongMove, elapsedMs, finishedMs, dispatch } = useSudoku();
  const [difficulty, setDifficulty] = useState<Difficulty>(game.puzzle.difficulty);
  const board = useMemo(() => toPlayerBoard(game), [game]);

  useBoardKeys({
    digit: (digit, asNote) => dispatch({ type: 'digit', digit, asNote }),
    move: (dRow, dCol) => dispatch({ type: 'move', dRow, dCol }),
    erase: () => dispatch({ type: 'erase' }),
    toggleNotes: () => dispatch({ type: 'toggleNotesMode' }),
  });

  return (
    <>
      <header className="bar">
        <button type="button" className="back" onClick={onHome} aria-label="Back to menu">
          ← Sudoku
        </button>
        <div className="new-game">
          <select aria-label="Difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d[0].toUpperCase() + d.slice(1)}
              </option>
            ))}
          </select>
          <button type="button" className="primary" onClick={() => dispatch({ type: 'new', difficulty })}>
            New game
          </button>
        </div>
      </header>

      <div className="stats">
        <span className="badge">{game.puzzle.difficulty}</span>
        <span className={game.mistakes ? 'mistakes has' : 'mistakes'}>Mistakes: {game.mistakes}</span>
        <span className="timer" aria-label="Time">
          {formatTime(elapsedMs)}
        </span>
      </div>

      <div className="board-wrap">
        <Board
          board={board}
          notes={game.notes}
          selected={selected}
          wrongMove={wrongMove}
          onSelect={(cell) => dispatch({ type: 'select', cell })}
        />
        {finishedMs !== null && (
          <div className="overlay" role="status">
            <h2>Solved!</h2>
            <p>
              {formatTime(finishedMs)} · {game.mistakes} {game.mistakes === 1 ? 'mistake' : 'mistakes'}
            </p>
            <button type="button" className="primary" onClick={() => dispatch({ type: 'new', difficulty })}>
              Play again
            </button>
          </div>
        )}
      </div>

      <NumberPad
        board={board}
        notesMode={notesMode}
        onDigit={(digit) => dispatch({ type: 'digit', digit, asNote: false })}
        onErase={() => dispatch({ type: 'erase' })}
        onToggleNotes={() => dispatch({ type: 'toggleNotesMode' })}
      />

      <p className="hint">Arrows to move · 1–9 to fill · Shift+1–9 for a pencil mark</p>
    </>
  );
}
