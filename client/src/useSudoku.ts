import { useEffect, useReducer, useState } from 'react';
import {
  CELLS,
  type Difficulty,
  type GameState,
  colOf,
  eraseCell,
  generatePuzzle,
  isSolved,
  newGame,
  placeDigit,
  rowOf,
  toggleNote,
} from '@sudoku/shared';

interface State {
  game: GameState;
  selected: number | null;
  notesMode: boolean;
  /** Bumped on every wrong move so the cell can replay its shake animation. */
  wrongMove: { cell: number; id: number } | null;
  /** Elapsed play time banked before `resumedAt`. */
  elapsedMs: number;
  resumedAt: number;
  finishedMs: number | null;
}

type Action =
  | { type: 'new'; difficulty: Difficulty }
  | { type: 'select'; cell: number }
  | { type: 'move'; dRow: number; dCol: number }
  | { type: 'digit'; digit: number; asNote?: boolean }
  | { type: 'erase' }
  | { type: 'toggleNotesMode' };

const STORAGE_KEY = 'sudoku:single-player';

function fresh(difficulty: Difficulty): State {
  return {
    game: newGame(generatePuzzle(difficulty)),
    selected: null,
    notesMode: false,
    wrongMove: null,
    elapsedMs: 0,
    resumedAt: Date.now(),
    finishedMs: null,
  };
}

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

  switch (action.type) {
    case 'new':
      return fresh(action.difficulty);

    case 'select':
      return { ...state, selected: action.cell };

    case 'move': {
      const from = selected ?? 40;
      const row = (rowOf(from) + action.dRow + 9) % 9;
      const col = (colOf(from) + action.dCol + 9) % 9;
      return { ...state, selected: selected === null ? from : row * 9 + col };
    }

    case 'toggleNotesMode':
      return { ...state, notesMode: !state.notesMode };

    case 'erase':
      if (selected === null || done) return state;
      return { ...state, game: eraseCell(game, selected) };

    case 'digit': {
      if (selected === null || done) return state;
      if (action.asNote ?? state.notesMode) {
        return { ...state, game: toggleNote(game, selected, action.digit) };
      }
      const { state: next, result } = placeDigit(game, selected, action.digit);
      if (result === 'ignored') return state;
      const wrongMove = result === 'wrong' ? { cell: selected, id: (state.wrongMove?.id ?? 0) + 1 } : state.wrongMove;
      const finishedMs = isSolved(next) ? state.elapsedMs + Date.now() - state.resumedAt : null;
      return { ...state, game: next, wrongMove, finishedMs };
    }
  }
}

export function useSudoku() {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    if (state.finishedMs !== null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state.finishedMs]);

  useEffect(() => {
    try {
      const elapsedMs = state.finishedMs ?? state.elapsedMs + Date.now() - state.resumedAt;
      const { game, notesMode, finishedMs } = state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ game, notesMode, finishedMs, elapsedMs }));
    } catch {
      // Saving is a convenience; ignore failures.
    }
  }, [state, now]);

  const elapsedMs = state.finishedMs ?? state.elapsedMs + now - state.resumedAt;
  return { ...state, elapsedMs: Math.max(0, elapsedMs), dispatch };
}
