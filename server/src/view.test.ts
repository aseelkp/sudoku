import { describe, expect, it } from 'vitest';
import { generatePuzzle, newGame, placeDigit, toggleNote } from '@sudoku/shared';
import { type Connection, type Room, newPlayer, newRoom } from './room';
import { toRoomView } from './view';

const conn: Connection = { send: () => {} };
const puzzle = generatePuzzle('easy');
const blank = puzzle.givens.indexOf(0);

function playingRoom(mode: Room['mode']): Room {
  const room = newRoom('ABC234', mode, 'easy');
  room.players = [newPlayer('Ana', conn), newPlayer('Ben', conn)];
  room.status = 'playing';
  if (mode === 'coop') room.shared = newGame(puzzle);
  else for (const p of room.players) p.game = newGame(puzzle);
  return room;
}

describe('toRoomView', () => {
  it('never includes a solution or anyone’s reconnect token', () => {
    for (const mode of ['race', 'fair-race', 'coop'] as const) {
      const room = playingRoom(mode);
      const json = JSON.stringify(toRoomView(room, 0, 0));
      expect(json).not.toContain('solution');
      expect(json).not.toContain(puzzle.solution.join(''));
      for (const p of room.players) expect(json).not.toContain(p.id);
    }
  });

  it('shows a racer their own board and only the opponent’s progress', () => {
    const room = playingRoom('race');
    room.players[1].game = placeDigit(room.players[1].game!, blank, puzzle.solution[blank]).state;

    const anaView = toRoomView(room, 0, 0);
    expect(anaView.board!.values[blank]).toBe(0);
    expect(anaView.players[1].progress).toBeGreaterThan(0);
    expect(toRoomView(room, 1, 0).board!.values[blank]).toBe(puzzle.solution[blank]);
  });

  it('hides cursors and pencil marks in races', () => {
    const room = playingRoom('race');
    room.players[1].cursor = 5;
    room.players[1].game = toggleNote(room.players[1].game!, blank, 3);
    const view = toRoomView(room, 0, 0);
    expect(view.players[1].cursor).toBeNull();
    expect(view.notes).toBeNull();
  });

  it('shares the board, notes and cursors in co-op', () => {
    const room = playingRoom('coop');
    room.shared = toggleNote(room.shared!, blank, 3);
    room.players[1].cursor = 5;
    const view = toRoomView(room, 0, 0);
    expect(view.notes![blank]).toBe(1 << 3);
    expect(view.players[1].cursor).toBe(5);
    expect(view.players[0].progress).toBe(view.players[1].progress);
  });

  it('marks who is connected and which player is receiving the view', () => {
    const room = playingRoom('race');
    room.players[1].conn = null;
    const view = toRoomView(room, 1, 123);
    expect(view.you).toBe(1);
    expect(view.serverNow).toBe(123);
    expect(view.players.map((p) => p.connected)).toEqual([true, false]);
  });
});
