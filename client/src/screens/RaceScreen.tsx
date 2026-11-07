import { useEffect, useState } from 'react';
import type { Mode, PlayerSummary, RoomView } from '@sudoku/shared';
import { Board } from '../components/Board';
import { NumberPad } from '../components/NumberPad';
import { formatTime } from '../time';
import { useBoardKeys } from '../useBoardKeys';
import { type RaceIntent, useRace } from '../useRace';

interface Props {
  intent: RaceIntent;
  onExit: () => void;
  onRoomCode: (code: string) => void;
}

export function RaceScreen({ intent, onExit, onRoomCode }: Props) {
  const race = useRace(intent);
  const { room, board, clockOffset } = race;
  const [, tick] = useState(0);

  // Re-render a few times a second while the clock is running.
  const live = room?.status === 'countdown' || room?.status === 'playing';
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => tick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [live]);

  useEffect(() => {
    if (room) onRoomCode(room.code);
  }, [room?.code, onRoomCode]);

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

  const serverNow = Date.now() + clockOffset;
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
        <Waiting code={room.code} mode={room.mode} difficulty={room.difficulty} />
      ) : (
        <>
          <div className="racers">
            <Racer player={me} label="You" />
            {opponent ? <Racer player={opponent} label={opponent.name} /> : <div className="racer gone">Opponent left</div>}
          </div>

          <div className="stats">
            <span className="badge">{room.difficulty}</span>
            <span className="mode-tag">{MODE_LABEL[room.mode]}</span>
            <span className={me.mistakes ? 'mistakes has' : 'mistakes'}>Mistakes: {me.mistakes}</span>
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
            {room.status === 'finished' && <Results room={room} onRematch={race.rematch} onExit={exit} />}
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

const MODE_LABEL: Record<Mode, string> = { race: 'Same puzzle', 'fair-race': 'Different puzzles' };

function Waiting({ code, mode, difficulty }: { code: string; mode: Mode; difficulty: RoomView['difficulty'] }) {
  const [copied, setCopied] = useState(false);
  const link = `${location.origin}/?room=${code}`;

  return (
    <div className="card waiting">
      <h2>Waiting for an opponent</h2>
      <p className="muted">
        <span className="badge">{difficulty}</span> · {MODE_LABEL[mode]}
      </p>
      <p className="muted">Send them this code or link. The race starts as soon as they join.</p>
      <div className="big-code">{code}</div>
      <div className="share">
        <input readOnly value={link} aria-label="Invite link" onFocus={(e) => e.target.select()} />
        <button
          type="button"
          className="primary"
          onClick={() => {
            navigator.clipboard?.writeText(link).then(
              () => setCopied(true),
              () => setCopied(false),
            );
          }}
        >
          {copied ? 'Copied' : 'Copy link'}
        </button>
      </div>
      <div className="dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function Racer({ player, label }: { player: PlayerSummary; label: string }) {
  const pct = Math.round(player.progress * 100);
  return (
    <div className="racer">
      <div className="racer-head">
        <span className="racer-name">
          {label}
          {!player.connected && <em> · reconnecting</em>}
        </span>
        <span className="racer-stat">
          {player.finishedMs !== null ? formatTime(player.finishedMs) : `${pct}%`}
          {player.mistakes > 0 && <span className="mistakes has"> · {player.mistakes}✕</span>}
        </span>
      </div>
      <div className="track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${label} progress`}>
        <div className="fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Results({ room, onRematch, onExit }: { room: RoomView; onRematch: () => void; onExit: () => void }) {
  const me = room.players[room.you];
  const opponent = room.players.find((_, i) => i !== room.you);
  const won = room.winner === room.you;

  const title = won ? 'You win!' : `${room.players[room.winner ?? 0]?.name ?? 'Opponent'} wins`;
  const detail =
    room.endReason === 'forfeit'
      ? 'Your opponent left the race.'
      : won
        ? `Solved in ${formatTime(me.finishedMs ?? 0)} with ${me.mistakes} ${me.mistakes === 1 ? 'mistake' : 'mistakes'}.`
        : `They solved ${room.mode === 'fair-race' ? 'theirs' : 'it'} in ${formatTime(room.players[room.winner ?? 0]?.finishedMs ?? 0)}. You were ${Math.round(me.progress * 100)}% done.`;

  return (
    <div className="overlay" role="status">
      <h2>{title}</h2>
      <p>{detail}</p>
      <div className="row">
        {opponent ? (
          <button type="button" className="primary" disabled={me.wantsRematch} onClick={onRematch}>
            {me.wantsRematch ? `Waiting for ${opponent.name}…` : opponent.wantsRematch ? 'Accept rematch' : 'Rematch'}
          </button>
        ) : (
          <button type="button" className="primary" onClick={onRematch}>
            Invite someone new
          </button>
        )}
        <button type="button" className="tool" onClick={onExit}>
          Leave
        </button>
      </div>
      {opponent?.wantsRematch && !me.wantsRematch && <p className="muted">{opponent.name} wants a rematch.</p>}
    </div>
  );
}
