import { randomInt } from 'node:crypto';
import {
  type ClientMessage,
  type Difficulty,
  MAX_PLAYERS,
  type Mode,
  type Puzzle,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  type RoomStatus,
  eraseCell,
  generatePuzzle,
  isSolved,
  newGame,
  placeDigit,
  scramblePuzzle,
  toggleNote,
} from '@sudoku/shared';
import { type Connection, type Player, type Room, boardOf, newPlayer, newRoom } from './room';
import { toRoomView } from './view';

export type { Connection } from './room';

export interface LobbyOptions {
  countdownMs?: number;
  /** Rooms with nobody connected are removed after this long. */
  abandonedRoomMs?: number;
  /** New rooms are refused beyond this many, to bound memory. */
  maxRooms?: number;
  generate?: (difficulty: Difficulty) => Puzzle;
}

export class Lobby {
  private rooms = new Map<string, Room>();
  private readonly countdownMs: number;
  private readonly abandonedRoomMs: number;
  private readonly maxRooms: number;
  private readonly generate: (difficulty: Difficulty) => Puzzle;

  constructor(opts: LobbyOptions = {}) {
    this.countdownMs = opts.countdownMs ?? 3000;
    this.abandonedRoomMs = opts.abandonedRoomMs ?? 10 * 60_000;
    this.maxRooms = opts.maxRooms ?? Infinity;
    this.generate = opts.generate ?? generatePuzzle;
  }

  get roomCount() {
    return this.rooms.size;
  }

  handle(conn: Connection, msg: ClientMessage): void {
    switch (msg.t) {
      case 'create':
        return this.create(conn, msg.mode, msg.difficulty, msg.name);
      case 'join':
        return this.join(conn, msg.code, msg.name);
      case 'resume':
        return this.resume(conn, msg.code, msg.playerId);
    }

    const found = this.seatOf(conn);
    if (!found) return conn.send({ t: 'error', message: 'You are not in a room.', fatal: true });
    const { room, player, index } = found;

    switch (msg.t) {
      case 'move':
      case 'erase':
      case 'note':
        return this.play(room, player, index, msg);
      case 'cursor':
        if (room.mode !== 'coop' || player.cursor === msg.cell) return;
        player.cursor = msg.cell;
        return this.broadcast(room);
      case 'rematch':
        return this.rematch(room, player);
      case 'leave':
        conn.seat = undefined;
        return this.leave(room, index);
    }
  }

  disconnect(conn: Connection): void {
    const found = this.seatOf(conn);
    if (!found) return;
    found.player.conn = null;
    if (found.room.players.every((p) => !p.conn)) found.room.emptySince = Date.now();
    this.broadcast(found.room);
  }

  /** Removes rooms nobody has been connected to for a while. Call periodically. */
  sweep(): void {
    const cutoff = Date.now() - this.abandonedRoomMs;
    for (const room of this.rooms.values()) {
      if (room.emptySince !== null && room.emptySince <= cutoff) this.close(room);
    }
  }

  private create(conn: Connection, mode: Mode, difficulty: Difficulty, name: string) {
    if (this.rooms.size >= this.maxRooms) {
      return conn.send({ t: 'error', message: 'The server is full right now. Try again in a few minutes.' });
    }
    this.unseat(conn);
    const room = newRoom(this.newCode(), mode, difficulty);
    this.rooms.set(room.code, room);
    this.seat(conn, room, name);
  }

  private join(conn: Connection, code: string, name: string) {
    const room = this.rooms.get(code);
    if (!room) return conn.send({ t: 'error', message: `No room with code ${code}.` });
    if (room.players.length >= MAX_PLAYERS) return conn.send({ t: 'error', message: 'That room is full.' });
    this.unseat(conn);
    this.seat(conn, room, name);
    if (room.players.length === MAX_PLAYERS) this.startCountdown(room);
  }

  private resume(conn: Connection, code: string, playerId: string) {
    const room = this.rooms.get(code);
    const player = room?.players.find((p) => p.id === playerId);
    if (!room || !player) {
      return conn.send({ t: 'error', message: 'That game has ended.', fatal: true });
    }
    if (player.conn && player.conn !== conn) {
      // The same player opened a second tab or reconnected before the old socket closed.
      player.conn.seat = undefined;
      player.conn.send({ t: 'error', message: 'This game was opened somewhere else.', fatal: true });
    }
    player.conn = conn;
    conn.seat = { code, playerId };
    room.emptySince = null;
    this.broadcast(room);
  }

  private seat(conn: Connection, room: Room, name: string) {
    const player = newPlayer(name, conn);
    room.players.push(player);
    room.emptySince = null;
    conn.seat = { code: room.code, playerId: player.id };
    conn.send({ t: 'welcome', code: room.code, playerId: player.id });
    this.broadcast(room);
  }

  /** A connection that creates or joins a new room gives up any seat it held. */
  private unseat(conn: Connection) {
    const found = this.seatOf(conn);
    conn.seat = undefined;
    if (found) this.leave(found.room, found.index);
  }

  private play(
    room: Room,
    player: Player,
    index: number,
    msg: Extract<ClientMessage, { t: 'move' | 'erase' | 'note' }>,
  ) {
    const coop = room.mode === 'coop';
    let game = boardOf(room, player);
    if (room.status !== 'playing' || !game || player.finishedMs !== null) return;

    if (msg.t === 'erase') {
      game = eraseCell(game, msg.cell);
    } else if (msg.t === 'note') {
      // In races pencil marks never leave the device.
      if (!coop) return;
      game = toggleNote(game, msg.cell, msg.digit);
    } else {
      const { state, result } = placeDigit(game, msg.cell, msg.digit);
      game = state;
      if (result === 'correct') player.placed++;
      if (result === 'wrong') player.mistakes++;
    }

    if (coop) room.shared = game;
    else player.game = game;

    if (msg.t === 'move' && isSolved(game)) {
      const ms = Date.now() - room.startAt!;
      if (coop) {
        for (const p of room.players) p.finishedMs = ms;
      } else {
        player.finishedMs = ms;
        room.winner ??= index;
      }
      room.endReason ??= 'solved';
      room.status = 'finished';
    }
    // Broadcast even when nothing changed, so the sender's pending digit always clears.
    this.broadcast(room);
  }

  private rematch(room: Room, player: Player) {
    if (room.status !== 'finished') return;
    if (room.players.length < MAX_PLAYERS) {
      // The opponent left; wait for someone new to join with the same code.
      this.reset(room, 'waiting');
      return this.broadcast(room);
    }
    player.wantsRematch = true;
    if (room.players.every((p) => p.wantsRematch)) return this.startCountdown(room);
    this.broadcast(room);
  }

  private leave(room: Room, index: number) {
    const [gone] = room.players.splice(index, 1);
    gone.conn = null;
    if (room.players.length === 0) return this.close(room);

    if (room.status === 'countdown') {
      this.reset(room, 'waiting');
    } else if (room.status === 'playing' && room.mode !== 'coop') {
      room.status = 'finished';
      room.winner = 0; // the player who stayed
      room.endReason = 'forfeit';
    } else if (room.status === 'finished') {
      // Indexes shifted, so the old result no longer lines up; offer a fresh start.
      this.reset(room, 'waiting');
    }
    this.broadcast(room);
  }

  private startCountdown(room: Room) {
    this.reset(room, 'countdown');
    room.round++;
    room.startAt = Date.now() + this.countdownMs;
    room.timer = setTimeout(() => this.start(room), this.countdownMs);
    this.broadcast(room);
  }

  private start(room: Room) {
    room.timer = null;
    const puzzle = this.generate(room.difficulty);
    if (room.mode === 'coop') {
      room.shared = newGame(puzzle);
    } else {
      for (const p of room.players) p.game = newGame(room.mode === 'fair-race' ? scramblePuzzle(puzzle) : puzzle);
    }
    room.status = 'playing';
    this.broadcast(room);
  }

  private reset(room: Room, status: RoomStatus) {
    if (room.timer) clearTimeout(room.timer);
    room.timer = null;
    room.status = status;
    room.shared = null;
    room.startAt = null;
    room.winner = null;
    room.endReason = null;
    for (const p of room.players) {
      p.game = null;
      p.finishedMs = null;
      p.wantsRematch = false;
      p.placed = 0;
      p.mistakes = 0;
      p.cursor = null;
    }
  }

  private close(room: Room) {
    if (room.timer) clearTimeout(room.timer);
    for (const p of room.players) {
      if (p.conn) p.conn.seat = undefined;
    }
    this.rooms.delete(room.code);
  }

  private broadcast(room: Room) {
    const serverNow = Date.now();
    room.players.forEach((p, you) => p.conn?.send({ t: 'room', room: toRoomView(room, you, serverNow) }));
  }

  private seatOf(conn: Connection) {
    if (!conn.seat) return null;
    const room = this.rooms.get(conn.seat.code);
    const index = room?.players.findIndex((p) => p.id === conn.seat!.playerId) ?? -1;
    if (!room || index === -1) return null;
    return { room, player: room.players[index], index };
  }

  private newCode(): string {
    for (;;) {
      let code = '';
      for (let i = 0; i < ROOM_CODE_LENGTH; i++) code += ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)];
      if (!this.rooms.has(code)) return code;
    }
  }
}
