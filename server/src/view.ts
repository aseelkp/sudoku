import { type RoomView, progress, toPlayerBoard } from '@sudoku/shared';
import { type Room, boardOf } from './room';

/**
 * What player `you` is allowed to see of a room. This is the only path room state takes to a client,
 * so it is where secrets stay behind: solutions, reconnect tokens, opponents' digits in races, and
 * (in races) cursors and pencil marks.
 */
export function toRoomView(room: Room, you: number, serverNow: number): RoomView {
  const coop = room.mode === 'coop';
  const myBoard = boardOf(room, room.players[you]);

  return {
    code: room.code,
    mode: room.mode,
    difficulty: room.difficulty,
    status: room.status,
    you,
    players: room.players.map((p) => {
      const board = boardOf(room, p);
      return {
        name: p.name,
        connected: p.conn !== null,
        progress: board ? progress(board) : 0,
        mistakes: p.mistakes,
        placed: p.placed,
        cursor: coop ? p.cursor : null,
        finishedMs: p.finishedMs,
        wantsRematch: p.wantsRematch,
      };
    }),
    startAt: room.startAt,
    serverNow,
    round: room.round,
    board: myBoard ? toPlayerBoard(myBoard) : null,
    notes: coop && room.shared ? room.shared.notes : null,
    winner: room.winner,
    endReason: room.endReason,
  };
}
