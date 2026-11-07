import type { RoomView } from '@sudoku/shared';
import { formatTime } from '../../time';

export function ResultsOverlay({
  room,
  onRematch,
  onExit,
}: {
  room: RoomView;
  onRematch: () => void;
  onExit: () => void;
}) {
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
