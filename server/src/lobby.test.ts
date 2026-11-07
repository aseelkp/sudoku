import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type Puzzle, type RoomView, type ServerMessage, generatePuzzle } from '@sudoku/shared';
import { type Connection, Lobby } from './lobby';

const puzzle: Puzzle = generatePuzzle('easy');

class TestConn implements Connection {
  seat?: Connection['seat'];
  messages: ServerMessage[] = [];
  send(msg: ServerMessage) {
    // Round-trip through JSON so tests see exactly what goes over the wire.
    this.messages.push(JSON.parse(JSON.stringify(msg)));
  }
  get room(): RoomView {
    const last = this.messages.findLast((m) => m.t === 'room');
    if (!last || last.t !== 'room') throw new Error('no room message yet');
    return last.room;
  }
  get lastError() {
    return this.messages.findLast((m) => m.t === 'error');
  }
  get welcome() {
    const w = this.messages.find((m) => m.t === 'welcome');
    if (!w || w.t !== 'welcome') throw new Error('not welcomed');
    return w;
  }
}

const blanks = puzzle.givens.flatMap((d, cell) => (d === 0 ? [cell] : []));
const wrongDigit = (cell: number) => (puzzle.solution[cell] % 9) + 1;

let lobby: Lobby;

beforeEach(() => {
  vi.useFakeTimers();
  lobby = new Lobby({ countdownMs: 3000, generate: () => puzzle });
});
afterEach(() => vi.useRealTimers());

function startRace() {
  const a = new TestConn();
  const b = new TestConn();
  lobby.handle(a, { t: 'create', mode: 'race', difficulty: 'easy', name: 'Ana' });
  lobby.handle(b, { t: 'join', code: a.welcome.code, name: 'Ben' });
  vi.advanceTimersByTime(3000);
  return { a, b };
}

function solve(conn: TestConn, except: number[] = []) {
  for (const cell of blanks) {
    if (!except.includes(cell)) lobby.handle(conn, { t: 'move', cell, digit: puzzle.solution[cell] });
  }
}

describe('race lifecycle', () => {
  it('waits for a second player, counts down, then deals the same puzzle to both', () => {
    const a = new TestConn();
    lobby.handle(a, { t: 'create', mode: 'race', difficulty: 'easy', name: 'Ana' });
    expect(a.welcome.code).toMatch(/^[A-Z2-9]{6}$/);
    expect(a.room.status).toBe('waiting');

    const b = new TestConn();
    lobby.handle(b, { t: 'join', code: a.welcome.code, name: 'Ben' });
    expect(a.room.status).toBe('countdown');
    expect(a.room.board).toBeNull();
    expect(a.room.players.map((p) => p.name)).toEqual(['Ana', 'Ben']);
    expect(b.room.you).toBe(1);

    vi.advanceTimersByTime(3000);
    expect(a.room.status).toBe('playing');
    expect(a.room.board!.givens).toEqual(puzzle.givens);
    expect(b.room.board!.givens).toEqual(puzzle.givens);
  });

  it('rejects joining a full room or an unknown code', () => {
    const { a } = startRace();
    const c = new TestConn();
    lobby.handle(c, { t: 'join', code: a.welcome.code, name: 'Cy' });
    expect(c.lastError).toMatchObject({ message: 'That room is full.' });
    lobby.handle(c, { t: 'join', code: 'ZZZZZZ', name: 'Cy' });
    expect(c.lastError).toMatchObject({ message: 'No room with code ZZZZZZ.' });
  });

  it('ignores moves before the countdown ends', () => {
    const a = new TestConn();
    const b = new TestConn();
    lobby.handle(a, { t: 'create', mode: 'race', difficulty: 'easy', name: 'Ana' });
    lobby.handle(b, { t: 'join', code: a.welcome.code, name: 'Ben' });
    const sent = a.messages.length;
    lobby.handle(a, { t: 'move', cell: blanks[0], digit: puzzle.solution[blanks[0]] });
    expect(a.messages).toHaveLength(sent);
  });

  it('shows mistakes immediately and shares only progress with the opponent', () => {
    const { a, b } = startRace();
    const [first, second] = blanks;
    lobby.handle(a, { t: 'move', cell: first, digit: puzzle.solution[first] });
    lobby.handle(a, { t: 'move', cell: second, digit: wrongDigit(second) });

    expect(a.room.board!.wrong).toEqual([second]);
    expect(a.room.board!.mistakes).toBe(1);
    expect(b.room.players[0]).toMatchObject({ mistakes: 1, progress: 1 / blanks.length });
    // Ben's own board is untouched by Ana's moves.
    expect(b.room.board!.values).toEqual(puzzle.givens);

    lobby.handle(a, { t: 'erase', cell: second });
    expect(a.room.board!.wrong).toEqual([]);
    expect(a.room.board!.mistakes).toBe(1);
  });

  it('never sends the solution or the opponent’s digits over the wire', () => {
    const { a, b } = startRace();
    solve(a, [blanks[0]]);
    const solution = puzzle.solution.join('');
    for (const conn of [a, b]) {
      for (const msg of conn.messages) {
        const json = JSON.stringify(msg);
        expect(json).not.toContain('solution');
        expect(json).not.toContain(solution);
      }
    }
    // Ben sees nothing of Ana's nearly-complete grid.
    expect(b.room.board!.values.filter(Boolean)).toHaveLength(81 - blanks.length);
  });

  it('declares the first player to solve the winner and stops play', () => {
    const { a, b } = startRace();
    vi.advanceTimersByTime(65_000);
    solve(b);
    expect(a.room).toMatchObject({ status: 'finished', winner: 1, endReason: 'solved' });
    expect(a.room.players[1].finishedMs).toBe(65_000);

    const sent = a.messages.length;
    solve(a);
    expect(a.messages).toHaveLength(sent);
  });

  it('starts a new round only when both players want a rematch', () => {
    const { a, b } = startRace();
    solve(a);
    lobby.handle(a, { t: 'rematch' });
    expect(b.room.players[0].wantsRematch).toBe(true);
    expect(b.room.status).toBe('finished');

    lobby.handle(b, { t: 'rematch' });
    expect(a.room).toMatchObject({ status: 'countdown', round: 2, winner: null });
    vi.advanceTimersByTime(3000);
    expect(a.room.status).toBe('playing');
    expect(a.room.board!.values).toEqual(puzzle.givens);
  });
});

describe('connections', () => {
  it('lets a player reconnect to their seat and keeps their board', () => {
    const { a, b } = startRace();
    lobby.handle(a, { t: 'move', cell: blanks[0], digit: puzzle.solution[blanks[0]] });
    lobby.disconnect(a);
    expect(b.room.players[0].connected).toBe(false);

    const a2 = new TestConn();
    lobby.handle(a2, { t: 'resume', code: a.welcome.code, playerId: a.welcome.playerId });
    expect(a2.room.board!.values[blanks[0]]).toBe(puzzle.solution[blanks[0]]);
    expect(b.room.players[0].connected).toBe(true);
  });

  it('rejects resuming with a wrong player id', () => {
    const { a } = startRace();
    const intruder = new TestConn();
    lobby.handle(intruder, { t: 'resume', code: a.welcome.code, playerId: 'guess' });
    expect(intruder.lastError).toMatchObject({ fatal: true });
    lobby.handle(intruder, { t: 'move', cell: blanks[0], digit: 1 });
    expect(intruder.lastError).toMatchObject({ message: 'You are not in a room.' });
  });

  it('kicks the older connection when a player resumes from a second tab', () => {
    const { a } = startRace();
    const tab2 = new TestConn();
    lobby.handle(tab2, { t: 'resume', code: a.welcome.code, playerId: a.welcome.playerId });
    expect(a.lastError).toMatchObject({ fatal: true });
    expect(a.seat).toBeUndefined();
  });

  it('awards the game to the player who stays when the other leaves mid-race', () => {
    const { a, b } = startRace();
    lobby.handle(b, { t: 'leave' });
    expect(a.room).toMatchObject({ status: 'finished', winner: 0, endReason: 'forfeit' });
    expect(a.room.players).toHaveLength(1);

    // A rematch with nobody left reopens the room for a new opponent.
    lobby.handle(a, { t: 'rematch' });
    expect(a.room.status).toBe('waiting');
    const c = new TestConn();
    lobby.handle(c, { t: 'join', code: a.welcome.code, name: 'Cy' });
    expect(a.room.status).toBe('countdown');
  });

  it('cleans up rooms nobody is connected to', () => {
    const { a, b } = startRace();
    lobby.disconnect(a);
    lobby.disconnect(b);
    vi.advanceTimersByTime(10 * 60_000);
    lobby.sweep();
    expect(lobby.roomCount).toBe(0);
  });
});

describe('fair race', () => {
  function startFairRace() {
    const a = new TestConn();
    const b = new TestConn();
    lobby.handle(a, { t: 'create', mode: 'fair-race', difficulty: 'easy', name: 'Ana' });
    lobby.handle(b, { t: 'join', code: a.welcome.code, name: 'Ben' });
    vi.advanceTimersByTime(3000);
    return { a, b };
  }

  it('deals each player a different board with the same number of clues', () => {
    const { a, b } = startFairRace();
    expect(a.room.mode).toBe('fair-race');
    const ga = a.room.board!.givens;
    const gb = b.room.board!.givens;
    expect(ga).not.toEqual(gb);
    expect(ga.filter(Boolean)).toHaveLength(puzzle.givens.filter(Boolean).length);
    expect(gb.filter(Boolean)).toHaveLength(puzzle.givens.filter(Boolean).length);
  });

  it('checks each player against their own solution', () => {
    const { a, b } = startFairRace();
    // Ana's board is valid only against her own solution; solve it by brute force from what she was sent.
    const solved = solveGrid(a.room.board!.givens);
    for (let cell = 0; cell < 81; cell++) {
      if (a.room.board!.givens[cell] === 0) lobby.handle(a, { t: 'move', cell, digit: solved[cell] });
    }
    expect(a.room).toMatchObject({ status: 'finished', winner: 0, endReason: 'solved' });
    expect(a.room.board!.mistakes).toBe(0);
    expect(b.room.players[0].progress).toBe(1);
  });

  it('gives fresh, different boards again after a rematch', () => {
    const { a, b } = startFairRace();
    const first = a.room.board!.givens;
    solveAll(a);
    lobby.handle(a, { t: 'rematch' });
    lobby.handle(b, { t: 'rematch' });
    vi.advanceTimersByTime(3000);
    expect(a.room.board!.givens).not.toEqual(first);
    expect(a.room.board!.givens).not.toEqual(b.room.board!.givens);
  });

  function solveAll(conn: TestConn) {
    const solved = solveGrid(conn.room.board!.givens);
    for (let cell = 0; cell < 81; cell++) {
      if (conn.room.board!.givens[cell] === 0) lobby.handle(conn, { t: 'move', cell, digit: solved[cell] });
    }
  }
});

/** Minimal backtracking solver, so tests only use what a client could see. */
function solveGrid(givens: number[]): number[] {
  const g = [...givens];
  const ok = (i: number, d: number) => {
    const r = Math.floor(i / 9);
    const c = i % 9;
    const br = r - (r % 3);
    const bc = c - (c % 3);
    for (let k = 0; k < 9; k++) {
      if (g[r * 9 + k] === d || g[k * 9 + c] === d || g[(br + Math.floor(k / 3)) * 9 + bc + (k % 3)] === d)
        return false;
    }
    return true;
  };
  const go = (): boolean => {
    const i = g.indexOf(0);
    if (i < 0) return true;
    for (let d = 1; d <= 9; d++) {
      if (ok(i, d)) {
        g[i] = d;
        if (go()) return true;
      }
    }
    g[i] = 0;
    return false;
  };
  go();
  return g;
}

describe('co-op', () => {
  function startCoop() {
    const a = new TestConn();
    const b = new TestConn();
    lobby.handle(a, { t: 'create', mode: 'coop', difficulty: 'easy', name: 'Ana' });
    lobby.handle(b, { t: 'join', code: a.welcome.code, name: 'Ben' });
    vi.advanceTimersByTime(3000);
    return { a, b };
  }

  it('applies both players’ moves to one shared board', () => {
    const { a, b } = startCoop();
    const [first, second, third] = blanks;
    lobby.handle(a, { t: 'move', cell: first, digit: puzzle.solution[first] });
    lobby.handle(b, { t: 'move', cell: second, digit: puzzle.solution[second] });
    lobby.handle(b, { t: 'move', cell: third, digit: wrongDigit(third) });

    for (const conn of [a, b]) {
      expect(conn.room.board!.values[first]).toBe(puzzle.solution[first]);
      expect(conn.room.board!.values[second]).toBe(puzzle.solution[second]);
      expect(conn.room.board!.wrong).toEqual([third]);
      expect(conn.room.board!.mistakes).toBe(1);
    }
    expect(a.room.players.map((p) => [p.placed, p.mistakes])).toEqual([
      [1, 0],
      [1, 1],
    ]);
    expect(a.room.players[0].progress).toBe(2 / blanks.length);
    expect(a.room.players[1].progress).toBe(2 / blanks.length);
  });

  it('shares pencil marks and cursors, and erases for both', () => {
    const { a, b } = startCoop();
    const [cell] = blanks;
    lobby.handle(a, { t: 'note', cell, digit: 4 });
    expect(b.room.notes![cell]).toBe(1 << 4);
    lobby.handle(b, { t: 'erase', cell });
    expect(a.room.notes![cell]).toBe(0);

    lobby.handle(a, { t: 'cursor', cell: 17 });
    expect(b.room.players[0].cursor).toBe(17);
  });

  it('keeps cursors and notes private in races', () => {
    const { a, b } = startRace();
    lobby.handle(a, { t: 'cursor', cell: 17 });
    lobby.handle(a, { t: 'note', cell: blanks[0], digit: 4 });
    expect(b.room.players[0].cursor).toBeNull();
    expect(a.room.notes).toBeNull();
    expect(b.room.notes).toBeNull();
  });

  it('finishes for everyone together when the board is solved', () => {
    const { a, b } = startCoop();
    vi.advanceTimersByTime(42_000);
    blanks.forEach((cell, i) => lobby.handle(i % 2 ? b : a, { t: 'move', cell, digit: puzzle.solution[cell] }));
    expect(b.room).toMatchObject({ status: 'finished', winner: null, endReason: 'solved' });
    expect(b.room.players.map((p) => p.finishedMs)).toEqual([42_000, 42_000]);
    expect(b.room.players[0].placed + b.room.players[1].placed).toBe(blanks.length);
  });

  it('lets the remaining player carry on when a partner leaves', () => {
    const { a, b } = startCoop();
    lobby.handle(b, { t: 'leave' });
    expect(a.room.status).toBe('playing');
    solve(a);
    expect(a.room).toMatchObject({ status: 'finished', endReason: 'solved' });
  });
});
