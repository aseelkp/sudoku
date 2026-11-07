import { useEffect } from 'react';
import type { RoomView } from '@sudoku/shared';
import { Board } from '../components/Board';
import { NumberPad } from '../components/NumberPad';
import { RacerBars } from '../components/room/RacerBars';
import { ResultsOverlay } from '../components/room/ResultsOverlay';
import { TeamBar } from '../components/room/TeamBar';
import { WaitingCard } from '../components/room/WaitingCard';
import { MODE_LABEL } from '../modeLabels';
import { formatTime } from '../time';
import { useBoardKeys } from '../useBoardKeys';
import { useNow } from '../useNow';
import { type RoomIntent, useRoom } from '../useRoom';

interface Props {
  intent: RoomIntent;
  onExit: () => void;
  onRoomCode: (code: string) => void;
}

export function RoomScreen({ intent, onExit, onRoomCode }: Props) {
  const race = useRoom(intent);
  const { room, board, receivedAt } = race;
  const now = useNow(250, room?.status === 'countdown' || room?.status === 'playing');

  const code = room?.code;
  useEffect(() => {
    if (code) onRoomCode(code);
  }, [code, onRoomCode]);

  useBoardKeys(
    { digit: race.digit, move: race.move, erase: race.erase, toggleNotes: race.toggleNotes },
    room?.status === 'playing',
  );

  const exit = () => {
    race.leave();
    onExit();
  };

  if (!room) {
    return (
      <div className="center-card card">
        {race.ended ? (
          <>
            <h2>{race.error ?? 'Could not join'}</h2>
            <button type="button" className="primary" onClick={onExit}>
              Back to menu
            </button>
          </>
        ) : (
          <p className="muted">{race.connected ? 'Joining…' : 'Connecting to the server…'}</p>
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

  return (
    <>
      <header className="bar">
        <button type="button" className="back" onClick={exit}>
          ← Leave
        </button>
        <span className="room-code" aria-label="Room code">
          Room <strong>{room.code}</strong>
        </span>
      </header>

      {!race.connected && <p className="banner">Connection lost. Reconnecting…</p>}
      {race.ended && (
        <p className="banner">
          {race.error}{' '}
          <button type="button" className="link" onClick={onExit}>
            Back to menu
          </button>
        </p>
      )}

      {room.status === 'waiting' ? (
        <WaitingCard code={room.code} mode={room.mode} difficulty={room.difficulty} />
      ) : (
        <>
          {room.mode === 'coop' ? <TeamBar me={me} partner={opponent} /> : <RacerBars me={me} opponent={opponent} />}

          <div className="stats">
            <span className="badge">{room.difficulty}</span>
            <span className="mode-tag">{MODE_LABEL[room.mode]}</span>
            <span className={board?.mistakes ? 'mistakes has' : 'mistakes'}>Mistakes: {board?.mistakes ?? 0}</span>
            <span className="timer" aria-label="Time">
              {formatTime(me.finishedMs ?? (room.status === 'playing' ? elapsed : finishedElapsed(room)))}
            </span>
          </div>

          <div className="board-wrap">
            {board ? (
              <Board
                board={board}
                notes={race.notes}
                selected={race.selected}
                wrongMove={race.wrongMove}
                pending={race.pending}
                partnerCursor={room.status === 'playing' ? (opponent?.cursor ?? null) : null}
                disabled={!race.canPlay}
                onSelect={race.select}
              />
            ) : (
              <div className="board placeholder" />
            )}
            {room.status === 'countdown' && (
              <div className="overlay" role="status" aria-live="assertive">
                <p className="muted">Race starts in</p>
                <div className="countdown">{Math.max(1, Math.ceil(-elapsed / 1000))}</div>
              </div>
            )}
            {room.status === 'finished' && <ResultsOverlay room={room} onRematch={race.rematch} onExit={exit} />}
          </div>

          {board && (
            <NumberPad
              board={board}
              notesMode={race.notesMode}
              disabled={!race.canPlay}
              onDigit={(d) => race.digit(d, false)}
              onErase={race.erase}
              onToggleNotes={race.toggleNotes}
            />
          )}
        </>
      )}
    </>
  );
}

/** Once the race ends the clock stops at the winning time. */
function finishedElapsed(room: RoomView) {
  return room.winner !== null ? (room.players[room.winner]?.finishedMs ?? 0) : 0;
}
