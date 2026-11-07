import { useEffect, useState } from 'react';
import type { Mode, PlayerSummary, RoomView } from '@sudoku/shared';
import { Board } from '../components/Board';
import { NumberPad } from '../components/NumberPad';
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
        <Waiting code={room.code} mode={room.mode} difficulty={room.difficulty} />
      ) : (
        <>
          {room.mode === 'coop' ? (
            <Team me={me} partner={opponent} />
          ) : (
            <div className="racers">
              <Racer player={me} label="You" />
              {opponent ? (
                <Racer player={opponent} label={opponent.name} />
              ) : (
                <div className="racer gone">Opponent left</div>
              )}
            </div>
          )}

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

const MODE_LABEL: Record<Mode, string> = { race: 'Same puzzle', 'fair-race': 'Different puzzles', coop: 'Co-op' };

function Waiting({ code, mode, difficulty }: { code: string; mode: Mode; difficulty: RoomView['difficulty'] }) {
  const [copied, setCopied] = useState(false);
  const link = `${location.origin}/?room=${code}`;

  return (
    <div className="card waiting">
      <h2>Waiting for an opponent</h2>
      <p className="muted">
        <span className="badge">{difficulty}</span> · {MODE_LABEL[mode]}
      </p>
      <p className="muted">
        Send them this code or link. {mode === 'coop' ? 'You’ll start' : 'The race starts'} as soon as they join.
      </p>
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
      <div
        className="track"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} progress`}
      >
        <div className="fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Team({ me, partner }: { me: PlayerSummary; partner: PlayerSummary | null }) {
  const pct = Math.round(me.progress * 100);
  return (
    <div className="team">
      <div className="racer-head">
        <span className="racer-name">Board {pct}% done</span>
      </div>
      <div
        className="track"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Board progress"
      >
        <div className="fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="teammates">
        <Teammate player={me} label="You" />
        {partner ? (
          <Teammate player={partner} label={partner.name} partner />
        ) : (
          <span className="muted">Partner left · keep going</span>
        )}
      </div>
    </div>
  );
}

function Teammate({ player, label, partner }: { player: PlayerSummary; label: string; partner?: boolean }) {
  return (
    <span className="teammate">
      <span className={partner ? 'swatch partner' : 'swatch'} aria-hidden="true" />
      <strong>{label}</strong>
      {!player.connected && <em> · reconnecting</em>}
      <span className="muted">
        {' '}
        {player.placed} placed{player.mistakes > 0 && <span className="mistakes has"> · {player.mistakes}✕</span>}
      </span>
    </span>
  );
}

function Results({ room, onRematch, onExit }: { room: RoomView; onRematch: () => void; onExit: () => void }) {
  const me = room.players[room.you];
  const opponent = room.players.find((_, i) => i !== room.you);
  const won = room.winner === room.you;
  const coop = room.mode === 'coop';
  const mistakes = room.board?.mistakes ?? 0;

  const title = coop
    ? opponent
      ? 'Solved together!'
      : 'Solved!'
    : won
      ? 'You win!'
      : `${room.players[room.winner ?? 0]?.name ?? 'Opponent'} wins`;
  const detail = coop
    ? `${formatTime(me.finishedMs ?? 0)} · ${mistakes} ${mistakes === 1 ? 'mistake' : 'mistakes'}` +
      (opponent ? ` · you placed ${me.placed}, ${opponent.name} placed ${opponent.placed}.` : '.')
    : room.endReason === 'forfeit'
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
            {me.wantsRematch
              ? `Waiting for ${opponent.name}…`
              : opponent.wantsRematch
                ? coop
                  ? 'Play again'
                  : 'Accept rematch'
                : coop
                  ? 'Play again'
                  : 'Rematch'}
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
      {opponent?.wantsRematch && !me.wantsRematch && (
        <p className="muted">
          {opponent.name} wants {coop ? 'to play again' : 'a rematch'}.
        </p>
      )}
    </div>
  );
}
