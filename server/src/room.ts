import { randomBytes } from 'node:crypto';
import {
  type Difficulty,
  type GameState,
  type Mode,
  type RoomStatus,
  type RoomView,
  type ServerMessage,
} from '@sudoku/shared';

/** One open socket. A player keeps their seat across reconnects; connections come and go. */
export interface Connection {
  send(msg: ServerMessage): void;
  /** Set once the connection has created, joined or resumed a room. */
  seat?: { code: string; playerId: string };
}

export interface Player {
  /** Secret reconnect token; never shown to other players. */
  id: string;
  name: string;
  conn: Connection | null;
  /** This player's own board in races. Unused in co-op, which plays on `room.shared`. */
  game: GameState | null;
  finishedMs: number | null;
  wantsRematch: boolean;
  placed: number;
  mistakes: number;
  cursor: number | null;
}

export interface Room {
  code: string;
  mode: Mode;
  difficulty: Difficulty;
  status: RoomStatus;
  players: Player[];
  /** The one board everybody fills in co-op. */
  shared: GameState | null;
  startAt: number | null;
  round: number;
  winner: number | null;
  endReason: RoomView['endReason'];
  timer: ReturnType<typeof setTimeout> | null;
  /** When the last player disconnected, for cleanup. */
  emptySince: number | null;
}

export function newRoom(code: string, mode: Mode, difficulty: Difficulty): Room {
  return {
    code,
    mode,
    difficulty,
    status: 'waiting',
    players: [],
    shared: null,
    startAt: null,
    round: 0,
    winner: null,
    endReason: null,
    timer: null,
    emptySince: null,
  };
}

export function newPlayer(name: string, conn: Connection): Player {
  return {
    id: randomBytes(16).toString('base64url'),
    name,
    conn,
    game: null,
    finishedMs: null,
    wantsRematch: false,
    placed: 0,
    mistakes: 0,
    cursor: null,
  };
}

/** The board a player's moves apply to: their own in races, the shared one in co-op. */
export const boardOf = (room: Room, player: Player) => (room.mode === 'coop' ? room.shared : player.game);
