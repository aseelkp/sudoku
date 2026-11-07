import { useEffect, useReducer } from 'react';
import {
  CELLS,
  type Difficulty,
  type GameState,
  eraseCell,
  generatePuzzle,
  isSolved,
  newGame,
  placeDigit,
  toggleNote,
} from '@sudoku/shared';
import { stepSelection } from './useBoardKeys';
import { useNow } from './useNow';

interface State {
  game: GameState;
  selected: number | null;
  notesMode: boolean;
  /** Bumped on every wrong move so the cell can replay its shake animation. */
  wrongMove: { cell: number; id: number } | null;
  /** Play time banked before `resumedAt` (or before the pause). */
  elapsedMs: number;
  resumedAt: number;
  /** The clock is stopped and the board hidden. */
  paused: boolean;
  finishedMs: number | null;
}

type Action =
  | { type: 'new'; difficulty: Difficulty }
  | { type: 'select'; cell: number }
  | { type: 'move'; dRow: number; dCol: number }
  | { type: 'digit'; digit: number; asNote: boolean }
  | { type: 'erase' }
  | { type: 'toggleNotesMode' }
  | { type: 'pause' }
  | { type: 'resume' };

const STORAGE_KEY = 'sudoku:single-player';

function fresh(difficulty: Difficulty): State {
  return {
    game: newGame(generatePuzzle(difficulty)),
    selected: null,
    notesMode: false,
    wrongMove: null,
    elapsedMs: 0,
    resumedAt: Date.now(),
    paused: false,
    finishedMs: null,
  };
}

/** Play time so far, not counting pauses. */
const played = (s: State, now: number) => s.elapsedMs + (s.paused ? 0 : now - s.resumedAt);

function load(): State {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (saved?.game?.values?.length === CELLS) {
      return { ...fresh('easy'), ...saved, selected: null, wrongMove: null, resumedAt: Date.now() };
    }
  } catch {
    // Storage unavailable or corrupt: start a new game.
  }
  return fresh('easy');
}

function reducer(state: State, action: Action): State {
  const { game, selected } = state;
  const done = state.finishedMs !== null;
  // While paused the board is hidden, so nothing on it can change either.
  const locked = done || state.paused;

  switch (action.type) {
    case 'new':
      return fresh(action.difficulty);

    case 'pause':
      if (locked) return state;
      return { ...state, elapsedMs: played(state, Date.now()), paused: true };

    case 'resume':
      if (!state.paused) return state;
      return { ...state, paused: false, resumedAt: Date.now() };

    case 'select':
      if (state.paused) return state;
      return { ...state, selected: action.cell };

    case 'move':
      return { ...state, selected: stepSelection(selected, action.dRow, action.dCol) };

    case 'toggleNotesMode':
      return { ...state, notesMode: !state.notesMode };

    case 'erase':
      if (selected === null || locked) return state;
      return { ...state, game: eraseCell(game, selected) };

    case 'digit': {
      if (selected === null || locked) return state;
      if (action.asNote || state.notesMode) {
        return { ...state, game: toggleNote(game, selected, action.digit) };
      }
      const { state: next, result } = placeDigit(game, selected, action.digit);
      if (result === 'ignored') return state;
      const wrongMove = result === 'wrong' ? { cell: selected, id: (state.wrongMove?.id ?? 0) + 1 } : state.wrongMove;
      const finishedMs = isSolved(next) ? played(state, Date.now()) : null;
      return { ...state, game: next, wrongMove, finishedMs };
    }
  }
}

export function useSudoku() {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  const now = useNow(1000, state.finishedMs === null && !state.paused);

  // Switching tabs or locking the phone pauses the game rather than running the clock.
  useEffect(() => {
    const onVisibility = () => document.hidden && dispatch({ type: 'pause' });
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    try {
      const elapsedMs = state.finishedMs ?? played(state, Date.now());
      const { game, notesMode, finishedMs, paused } = state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ game, notesMode, finishedMs, elapsedMs, paused }));
    } catch {
      // Saving is a convenience; ignore failures.
    }
  }, [state, now]);

  const elapsedMs = state.finishedMs ?? played(state, now);
  return { ...state, elapsedMs: Math.max(0, elapsedMs), dispatch };
}
