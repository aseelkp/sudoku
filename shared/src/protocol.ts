import { CELLS } from './board';
import type { PlayerBoard } from './game';
import { DIFFICULTIES, type Difficulty } from './puzzle';

/**
 * `race`: both players get the same puzzle. `fair-race`: different puzzles of identical difficulty.
 * `coop`: both players fill one shared board, pencil marks included.
 */
export type Mode = 'race' | 'fair-race' | 'coop';
export const MODES: readonly Mode[] = ['race', 'fair-race', 'coop'];

export const MAX_PLAYERS = 2;
export const MAX_NAME_LENGTH = 20;
export const ROOM_CODE_LENGTH = 6;
/** No 0/O, 1/I/L: codes get read out loud and typed on phones. */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export type RoomStatus = 'waiting' | 'countdown' | 'playing' | 'finished';

export interface PlayerSummary {
  name: string;
  connected: boolean;
  /** Correctly filled blanks, 0–1. In co-op this is the shared board's progress. */
  progress: number;
  /** Wrong digits this player entered. */
  mistakes: number;
  /** Correct digits this player entered. */
  placed: number;
  /** The cell this player has selected; only shared in co-op. */
  cursor: number | null;
  /** Solve time in ms, once finished. */
  finishedMs: number | null;
  wantsRematch: boolean;
}

/** One player's view of a room. Never contains a solution or the opponent's digits. */
export interface RoomView {
  code: string;
  mode: Mode;
  difficulty: Difficulty;
  status: RoomStatus;
  /** Index of the receiving player in `players`. */
  you: number;
  players: PlayerSummary[];
  /** Server time the round starts (countdown) or started (playing/finished). */
  startAt: number | null;
  /** Server clock at send time, so clients can correct for clock skew. */
  serverNow: number;
  /** Increments with every rematch; clients reset local state (notes) when it changes. */
  round: number;
  /** The receiving player's own board (the shared board in co-op), from the start of play. */
  board: PlayerBoard | null;
  /** Shared pencil marks in co-op; null in races, where notes stay on each device. */
  notes: number[] | null;
  /** Null in co-op, where everyone wins together. */
  winner: number | null;
  endReason: 'solved' | 'forfeit' | null;
}

export type ClientMessage =
  | { t: 'create'; mode: Mode; difficulty: Difficulty; name: string }
  | { t: 'join'; code: string; name: string }
  | { t: 'resume'; code: string; playerId: string }
  | { t: 'move'; cell: number; digit: number }
  | { t: 'erase'; cell: number }
  | { t: 'note'; cell: number; digit: number }
  | { t: 'cursor'; cell: number | null }
  | { t: 'rematch' }
  | { t: 'leave' };

export type ServerMessage =
  | { t: 'welcome'; code: string; playerId: string }
  | { t: 'room'; room: RoomView }
  /** `fatal` errors mean the client's room/session is gone. */
  | { t: 'error'; message: string; fatal?: boolean };

const isInt = (v: unknown, min: number, max: number): v is number =>
  Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
const isString = (v: unknown, maxLength: number): v is string => typeof v === 'string' && v.length <= maxLength;

export const normalizeCode = (code: string) => code.trim().toUpperCase();
export const normalizeName = (name: string) => name.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME_LENGTH);

/** Validates untrusted input from a socket. Returns null for anything malformed. */
export function parseClientMessage(raw: string): ClientMessage | null {
  let m: Record<string, unknown>;
  try {
    m = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof m !== 'object' || m === null) return null;

  switch (m.t) {
    case 'create':
      return MODES.includes(m.mode as Mode) &&
        DIFFICULTIES.includes(m.difficulty as Difficulty) &&
        isString(m.name, 200) &&
        normalizeName(m.name)
        ? { t: 'create', mode: m.mode as Mode, difficulty: m.difficulty as Difficulty, name: normalizeName(m.name) }
        : null;
    case 'join':
      return isString(m.code, 20) && isString(m.name, 200) && normalizeName(m.name)
        ? { t: 'join', code: normalizeCode(m.code), name: normalizeName(m.name) }
        : null;
    case 'resume':
      return isString(m.code, 20) && isString(m.playerId, 100)
        ? { t: 'resume', code: normalizeCode(m.code), playerId: m.playerId }
        : null;
    case 'move':
      return isInt(m.cell, 0, CELLS - 1) && isInt(m.digit, 1, 9) ? { t: 'move', cell: m.cell, digit: m.digit } : null;
    case 'erase':
      return isInt(m.cell, 0, CELLS - 1) ? { t: 'erase', cell: m.cell } : null;
    case 'note':
      return isInt(m.cell, 0, CELLS - 1) && isInt(m.digit, 1, 9) ? { t: 'note', cell: m.cell, digit: m.digit } : null;
    case 'cursor':
      return m.cell === null || isInt(m.cell, 0, CELLS - 1) ? { t: 'cursor', cell: m.cell } : null;
    case 'rematch':
    case 'leave':
      return { t: m.t };
    default:
      return null;
  }
}
