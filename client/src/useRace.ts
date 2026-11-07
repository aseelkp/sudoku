import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CELLS,
  type ClientMessage,
  type RoomView,
  type ServerMessage,
  clearPeerNotes,
} from '@sudoku/shared';
import { stepSelection } from './useBoardKeys';

/** What the race screen should do once connected. */
export type RaceIntent =
  | { t: 'create'; difficulty: RoomView['difficulty']; name: string }
  | { t: 'join'; code: string; name: string }
  | { t: 'resume' };

interface Session {
  code: string;
  playerId: string;
}

// Per tab, so two tabs on one machine can be two players, and a reload rejoins the same seat.
const SESSION_KEY = 'sudoku:race-session';

export function loadSession(): Session | null {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null');
  } catch {
    return null;
  }
}

function saveSession(session: Session | null) {
  try {
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Without storage a reload just loses the seat.
  }
}

const socketUrl = () => `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
const emptyNotes = () => new Array<number>(CELLS).fill(0);
const PENDING_TIMEOUT_MS = 3000;

export function useRace(intent: RaceIntent) {
  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState<RoomView | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Fatal: the seat is gone and the screen should offer a way home. */
  const [ended, setEnded] = useState(false);
  const [clockOffset, setClockOffset] = useState(0);

  const [selected, setSelected] = useState<number | null>(null);
  const [notesMode, setNotesMode] = useState(false);
  const [notes, setNotes] = useState(emptyNotes);
  const [pending, setPending] = useState<{ cell: number; digit: number } | null>(null);
  const [wrongMove, setWrongMove] = useState<{ cell: number; id: number } | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const roomRef = useRef<RoomView | null>(null);
  const pendingRef = useRef(pending);
  pendingRef.current = pending;

  const send = useCallback((msg: ClientMessage) => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(msg));
  }, []);

  const onRoom = useCallback((next: RoomView) => {
    const prev = roomRef.current;
    roomRef.current = next;
    setClockOffset(next.serverNow - Date.now());
    setRoom(next);

    if (prev?.round !== next.round) {
      setNotes(emptyNotes());
      setSelected(null);
      setWrongMove(null);
    } else if (prev?.board && next.board) {
      const before = prev.board;
      const after = next.board;
      if (after.mistakes > before.mistakes) {
        const cell = after.wrong.find((c) => !before.wrong.includes(c)) ?? pendingRef.current?.cell;
        if (cell !== undefined) setWrongMove((w) => ({ cell, id: (w?.id ?? 0) + 1 }));
      }
      // A newly confirmed digit rules itself out of the peers' pencil marks, as in solo play.
      setNotes((n) => {
        let out = n;
        for (let cell = 0; cell < CELLS; cell++) {
          const digit = after.values[cell];
          if (digit && digit !== before.values[cell] && !after.wrong.includes(cell)) {
            out = clearPeerNotes(out, cell, digit);
            out[cell] = 0;
          }
        }
        return out;
      });
    }
    setPending(null);
  }, []);

  // Connect, and keep reconnecting with backoff until the screen unmounts or the seat is gone.
  useEffect(() => {
    let stopped = false;
    let attempt = 0;
    let retry: ReturnType<typeof setTimeout>;
    let firstIntent: RaceIntent | null = intent;

    const connect = () => {
      const socket = new WebSocket(socketUrl());
      socketRef.current = socket;

      socket.onopen = () => {
        attempt = 0;
        setConnected(true);
        const session = loadSession();
        if (firstIntent && firstIntent.t !== 'resume') {
          socket.send(
            JSON.stringify(
              firstIntent.t === 'create'
                ? { t: 'create', mode: 'race', difficulty: firstIntent.difficulty, name: firstIntent.name }
                : firstIntent,
            ),
          );
        } else if (session) {
          socket.send(JSON.stringify({ t: 'resume', ...session }));
        } else {
          setError('That game has ended.');
          setEnded(true);
        }
        firstIntent = null;
      };

      socket.onmessage = (event) => {
        const msg: ServerMessage = JSON.parse(event.data);
        if (msg.t === 'welcome') {
          saveSession({ code: msg.code, playerId: msg.playerId });
          setError(null);
        } else if (msg.t === 'room') {
          onRoom(msg.room);
        } else if (msg.fatal) {
          saveSession(null);
          setError(msg.message);
          setEnded(true);
          stopped = true;
          socket.close();
        } else {
          setError(msg.message);
          // A failed create/join leaves this tab without a seat.
          if (!roomRef.current) setEnded(true);
        }
      };

      socket.onclose = () => {
        setConnected(false);
        if (stopped) return;
        retry = setTimeout(connect, Math.min(1000 * 2 ** attempt++, 10_000));
      };
    };

    connect();
    return () => {
      stopped = true;
      clearTimeout(retry);
      socketRef.current?.close();
    };
    // The intent only matters for the first connection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onRoom]);

  // Never leave a guessed digit on screen if the server didn't answer.
  useEffect(() => {
    if (!pending) return;
    const id = setTimeout(() => setPending(null), PENDING_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [pending]);

  const board = room?.board ?? null;
  const me = room ? room.players[room.you] : null;
  const canPlay = room?.status === 'playing' && board !== null && me?.finishedMs === null && connected;
  const isLocked = (cell: number) =>
    !board || board.givens[cell] !== 0 || (board.values[cell] !== 0 && !board.wrong.includes(cell));

  const digit = (d: number, asNote: boolean) => {
    if (!canPlay || selected === null || pending || isLocked(selected)) return;
    if (asNote || notesMode) {
      if (board!.values[selected] !== 0) return;
      setNotes((n) => {
        const out = [...n];
        out[selected] ^= 1 << d;
        return out;
      });
      return;
    }
    if (board!.values[selected] === d) return;
    setPending({ cell: selected, digit: d });
    send({ t: 'move', cell: selected, digit: d });
  };

  const erase = () => {
    if (!canPlay || selected === null || pending || isLocked(selected)) return;
    if (board!.values[selected] !== 0) {
      send({ t: 'erase', cell: selected });
    } else if (notes[selected]) {
      setNotes((n) => {
        const out = [...n];
        out[selected] = 0;
        return out;
      });
    }
  };

  const leave = () => {
    send({ t: 'leave' });
    saveSession(null);
  };

  return {
    connected,
    room,
    error,
    ended,
    clockOffset,
    board,
    canPlay,
    selected,
    notesMode,
    notes,
    pending,
    wrongMove,
    select: setSelected,
    move: (dRow: number, dCol: number) => setSelected((s) => stepSelection(s, dRow, dCol)),
    toggleNotes: () => setNotesMode((m) => !m),
    digit,
    erase,
    rematch: () => send({ t: 'rematch' }),
    leave,
  };
}
