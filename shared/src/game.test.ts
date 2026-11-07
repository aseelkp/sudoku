import { describe, expect, it } from 'vitest';
import {
  eraseCell,
  hasNote,
  isSolved,
  newGame,
  placeDigit,
  progress,
  remaining,
  toPlayerBoard,
  toggleNote,
} from './game';
import { PEERS } from './board';
import { generatePuzzle } from './puzzle';

const setup = () => {
  const game = newGame(generatePuzzle('easy'));
  const blank = game.values.indexOf(0);
  const answer = game.puzzle.solution[blank];
  const wrongDigit = (answer % 9) + 1;
  return { game, blank, answer, wrongDigit };
};

describe('game rules', () => {
  it('ignores moves on givens', () => {
    const { game } = setup();
    const given = game.puzzle.givens.findIndex(Boolean);
    expect(placeDigit(game, given, 1).result).toBe('ignored');
  });

  it('counts a wrong digit as a mistake and lets it be erased', () => {
    const { game, blank, wrongDigit } = setup();
    const { state, result } = placeDigit(game, blank, wrongDigit);
    expect(result).toBe('wrong');
    expect(state.mistakes).toBe(1);
    expect(toPlayerBoard(state).wrong).toEqual([blank]);
    expect(eraseCell(state, blank).values[blank]).toBe(0);
  });

  it('locks a correct digit and clears it from peer notes', () => {
    const { game, blank, answer } = setup();
    const peer = PEERS[blank].find((p) => game.values[p] === 0)!;
    const noted = toggleNote(game, peer, answer);
    expect(hasNote(noted.notes, peer, answer)).toBe(true);

    const { state, result } = placeDigit(noted, blank, answer);
    expect(result).toBe('correct');
    expect(hasNote(state.notes, peer, answer)).toBe(false);
    expect(placeDigit(state, blank, 1).result).toBe('ignored');
    expect(eraseCell(state, blank)).toBe(state);
  });

  it('tracks progress, remaining counts and completion', () => {
    let { game } = setup();
    expect(progress(game)).toBe(0);
    game.values.forEach((d, cell) => {
      if (d === 0) game = placeDigit(game, cell, game.puzzle.solution[cell]).state;
    });
    expect(isSolved(game)).toBe(true);
    expect(progress(game)).toBe(1);
    expect(remaining(toPlayerBoard(game), 5)).toBe(0);
  });
});
