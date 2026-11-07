import { useMemo, useState } from 'react';
import { DIFFICULTIES, type Difficulty, toPlayerBoard } from '@sudoku/shared';
import { Board, EmptyBoard } from '../components/Board';
import { BackIcon } from '../components/icons';
import { NumberPad } from '../components/NumberPad';
import { PausedCard } from '../components/PausedCard';
import { Stats } from '../components/Stats';
import { formatTime } from '../time';
import { useBoardKeys } from '../useBoardKeys';
import { useSudoku } from '../useSudoku';

export function SoloScreen({ onHome }: { onHome: () => void }) {
  const { game, selected, notesMode, wrongMove, elapsedMs, finishedMs, paused, dispatch } = useSudoku();
  const [difficulty, setDifficulty] = useState<Difficulty>(game.puzzle.difficulty);
  const board = useMemo(() => toPlayerBoard(game), [game]);
  const solved = finishedMs !== null;

  useBoardKeys({
    digit: (digit, asNote) => dispatch({ type: 'digit', digit, asNote }),
    move: (dRow, dCol) => dispatch({ type: 'move', dRow, dCol }),
    erase: () => dispatch({ type: 'erase' }),
    toggleNotes: () => dispatch({ type: 'toggleNotesMode' }),
    togglePause: () => !solved && dispatch({ type: paused ? 'resume' : 'pause' }),
  });

  const newGame = () => dispatch({ type: 'new', difficulty });

  return (
    <>
      <div className="bar">
        <button type="button" className="text-btn title-btn" onClick={onHome} aria-label="Back to menu">
          <BackIcon />
          Sudoku
        </button>
        <div className="solo-actions">
          <label htmlFor="solo-difficulty" className="sr-only">
            Difficulty
          </label>
          <select
            id="solo-difficulty"
            className="line-select"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d[0].toUpperCase() + d.slice(1)}
              </option>
            ))}
          </select>
          <button type="button" className="btn primary" onClick={newGame}>
            New game
          </button>
        </div>
      </div>

      <h1 className="sr-only">Solo game</h1>
      <Stats
        difficulty={game.puzzle.difficulty}
        mistakes={game.mistakes}
        timeMs={elapsedMs}
        idle={paused}
        pause={solved ? undefined : { paused, onToggle: () => dispatch({ type: paused ? 'resume' : 'pause' }) }}
      />

      <div className="board-wrap">
        {paused ? (
          <>
            <EmptyBoard />
            <PausedCard
              title="Paused"
              detail={`The clock is stopped at ${formatTime(elapsedMs)}.`}
              onResume={() => dispatch({ type: 'resume' })}
            />
          </>
        ) : (
          <div className={solved ? 'faded' : undefined}>
            <Board
              board={board}
              notes={game.notes}
              selected={solved ? null : selected}
              wrongMove={wrongMove}
              onSelect={(cell) => dispatch({ type: 'select', cell })}
            />
          </div>
        )}
        {solved && (
          <div className="paper-card tilted result-card" role="status">
            <span className="tape center" aria-hidden="true" />
            <div>
              <h2>Solved!</h2>
              <p>
                {formatTime(finishedMs)} with {game.mistakes === 1 ? '1 mistake' : `${game.mistakes} mistakes`}.
              </p>
            </div>
            <button type="button" className="btn primary wide" onClick={newGame}>
              Play again
            </button>
          </div>
        )}
      </div>

      {!solved && (
        <NumberPad
          board={board}
          notesMode={notesMode}
          disabled={paused}
          onDigit={(digit) => dispatch({ type: 'digit', digit, asNote: false })}
          onErase={() => dispatch({ type: 'erase' })}
          onToggleNotes={() => dispatch({ type: 'toggleNotesMode' })}
        />
      )}

      <p className="hint">Arrows to move, 1–9 to fill, Shift+1–9 for a pencil mark, P to pause</p>
    </>
  );
}
