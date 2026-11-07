import { useEffect, useState } from 'react';
import type { PlayerBoard, RoomView } from '@sudoku/shared';
import { Board, EmptyBoard } from '../components/Board';
import { BackIcon } from '../components/icons';
import { NumberPad } from '../components/NumberPad';
import { RaceTrack } from '../components/room/RaceTrack';
import { ResultsOverlay } from '../components/room/ResultsOverlay';
import { TeamBar } from '../components/room/TeamBar';
import { WaitingCard } from '../components/room/WaitingCard';
import { Stats } from '../components/Stats';
import { MODE_LABEL } from '../modeLabels';
import { useBoardKeys } from '../useBoardKeys';
import { useNow } from '../useNow';
import { type RoomIntent, useRoom } from '../useRoom';

interface Props {
  intent: RoomIntent;
  onExit: () => void;
  onRoomCode: (code: string) => void;
}

/** Shown under the countdown so the pad keeps its place before the puzzle arrives. */
const BLANK_BOARD: PlayerBoard = { givens: Array(81).fill(0), values: Array(81).fill(0), wrong: [], mistakes: 0 };

export function RoomScreen({ intent, onExit, onRoomCode }: Props) {
  const game = useRoom(intent);
  const { room, board, receivedAt } = game;
  const now = useNow(250, room?.status === 'countdown' || room?.status === 'playing');

  const code = room?.code;
  useEffect(() => {
    if (code) onRoomCode(code);
  }, [code, onRoomCode]);

  useBoardKeys(
    { digit: game.digit, move: game.move, erase: game.erase, toggleNotes: game.toggleNotes },
    room?.status === 'playing',
  );

  const exit = () => {
    game.leave();
    onExit();
  };

  // Leaving mid-game hands a race to the opponent (or a co-op board to the partner), so ask twice.
  const [confirmLeave, setConfirmLeave] = useState(false);
  useEffect(() => {
    if (!confirmLeave) return;
    const id = setTimeout(() => setConfirmLeave(false), 4000);
    return () => clearTimeout(id);
  }, [confirmLeave]);
  const midGame =
    (room?.status === 'playing' || room?.status === 'countdown') && room.players[room.you]?.finishedMs === null;
  const onLeave = () => (midGame && !confirmLeave ? setConfirmLeave(true) : exit());

  if (!room) {
    return (
      <div className="center-card">
        {game.ended ? (
          <>
            <h2>{game.error ?? 'Could not join'}</h2>
            <button type="button" className="btn primary" onClick={onExit}>
              Back to menu
            </button>
          </>
        ) : (
          <p>{game.connected ? 'Joining…' : 'Connecting…'}</p>
        )}
      </div>
    );
  }

  // Server time now: the last snapshot's clock plus local time since it arrived. `now` is quantized to the
  // tick, so clamp at zero rather than ever running the clock backwards past what the server told us.
  const serverNow = room.serverNow + Math.max(0, now - receivedAt);
  const me = room.players[room.you];
  const opponent = room.players.find((_, i) => i !== room.you) ?? null;
  const elapsed = room.startAt ? serverNow - room.startAt : 0;
  const coop = room.mode === 'coop';

  return (
    <>
      <div className="bar">
        <button type="button" className={confirmLeave ? 'text-btn danger' : 'text-btn'} onClick={onLeave}>
          <BackIcon />
          {confirmLeave ? 'Tap again to leave' : 'Leave'}
        </button>
        <span className="room-code">
          Room <strong translate="no">{room.code}</strong>
        </span>
      </div>

      {!game.connected && (
        <p className="banner" role="alert">
          Connection lost. Reconnecting…
        </p>
      )}
      {game.ended && (
        <p className="banner" role="alert">
          {game.error}{' '}
          <button type="button" className="text-btn" onClick={onExit}>
            Back to menu
          </button>
        </p>
      )}

      {room.status === 'waiting' ? (
        <WaitingCard code={room.code} mode={room.mode} difficulty={room.difficulty} me={me} />
      ) : (
        <>
          <h1 className="sr-only">{MODE_LABEL[room.mode]}</h1>
          {coop ? <TeamBar me={me} partner={opponent} /> : <RaceTrack me={me} opponent={opponent} />}

          <Stats
            difficulty={room.difficulty}
            mode={MODE_LABEL[room.mode]}
            mistakes={board?.mistakes ?? 0}
            timeMs={me.finishedMs ?? (room.status === 'playing' ? elapsed : finishedElapsed(room))}
            idle={room.status === 'countdown'}
          />

          <div className="board-wrap">
            {board ? (
              <div className={room.status === 'finished' ? 'faded' : undefined}>
                <Board
                  board={board}
                  notes={game.notes}
                  selected={room.status === 'playing' ? game.selected : null}
                  wrongMove={game.wrongMove}
                  pending={game.pending}
                  writtenBy={room.writtenBy}
                  partner={
                    coop && opponent && room.status === 'playing'
                      ? { cell: opponent.cursor, name: opponent.name }
                      : null
                  }
                  disabled={!game.canPlay}
                  onSelect={game.select}
                />
              </div>
            ) : (
              <EmptyBoard />
            )}
            {room.status === 'countdown' && (
              <div className="board-overlay" role="status" aria-live="assertive">
                <span className="get-ready">Get ready</span>
                <span className="countdown-mark">
                  <svg aria-hidden="true" viewBox="0 0 170 170" fill="none">
                    <path
                      d="M90 16c40 4 66 34 62 72-4 40-38 66-76 62-38-4-62-38-58-74 4-30 26-54 58-60"
                      stroke="var(--you)"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="countdown">{Math.max(1, Math.ceil(-elapsed / 1000))}</span>
                </span>
              </div>
            )}
            {room.status === 'finished' && <ResultsOverlay room={room} onRematch={game.rematch} onExit={exit} />}
          </div>

          {room.status !== 'finished' && (
            <NumberPad
              board={board ?? BLANK_BOARD}
              notesMode={game.notesMode}
              disabled={!game.canPlay}
              onDigit={(d) => game.digit(d, false)}
              onErase={game.erase}
              onToggleNotes={game.toggleNotes}
            />
          )}
        </>
      )}
    </>
  );
}

/** Once a race ends the clock stops at the winning time. */
function finishedElapsed(room: RoomView) {
  return room.winner !== null ? (room.players[room.winner]?.finishedMs ?? 0) : 0;
}
