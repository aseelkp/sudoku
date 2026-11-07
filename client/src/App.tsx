import { useEffect, useState } from 'react';
import { DIFFICULTIES, type Difficulty } from '@sudoku/shared';
import { Board } from './components/Board';
import { NumberPad } from './components/NumberPad';
import { useSudoku } from './useSudoku';

const ARROWS: Record<string, [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(h ? 2 : 1, '0');
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function App() {
  const { game, selected, notesMode, wrongMove, elapsedMs, finishedMs, dispatch } = useSudoku();
  const [difficulty, setDifficulty] = useState<Difficulty>(game.puzzle.difficulty);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // e.code keeps Shift+digit working as "pencil mark" on every keyboard layout.
      const digit = /^(Digit|Numpad)([1-9])$/.exec(e.code)?.[2];
      if (digit) {
        dispatch({ type: 'digit', digit: Number(digit), asNote: e.shiftKey || undefined });
      } else if (ARROWS[e.key]) {
        const [dRow, dCol] = ARROWS[e.key];
        dispatch({ type: 'move', dRow, dCol });
      } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        dispatch({ type: 'erase' });
      } else if (e.key === 'n' || e.key === 'N') {
        dispatch({ type: 'toggleNotesMode' });
      } else {
        return;
      }
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch]);

  return (
    <main className="app">
      <header className="bar">
        <h1>Sudoku</h1>
        <div className="new-game">
          <select
            aria-label="Difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
          >
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
        <span className={game.mistakes ? 'mistakes has' : 'mistakes'}>
          Mistakes: {game.mistakes}
        </span>
        <span className="timer" aria-label="Time">
          {formatTime(elapsedMs)}
        </span>
      </div>

      <div className="board-wrap">
        <Board
          game={game}
          selected={selected}
          wrongMove={wrongMove}
          onSelect={(cell) => dispatch({ type: 'select', cell })}
        />
        {finishedMs !== null && (
          <div className="solved" role="status">
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
        game={game}
        notesMode={notesMode}
        onDigit={(digit) => dispatch({ type: 'digit', digit })}
        onErase={() => dispatch({ type: 'erase' })}
        onToggleNotes={() => dispatch({ type: 'toggleNotesMode' })}
      />

      <p className="hint">Arrows to move · 1–9 to fill · Shift+1–9 for a pencil mark</p>
    </main>
  );
}
