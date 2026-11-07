import type { PlayerSummary, RoomView } from '@sudoku/shared';
import { formatTime } from '../../time';

interface Props {
  room: RoomView;
  onRematch: () => void;
  onExit: () => void;
}

const mistakesText = (n: number) => (n === 1 ? '1 mistake' : `${n} mistakes`);

export function ResultsOverlay({ room, onRematch, onExit }: Props) {
  const me = room.players[room.you];
  const opponent = room.players.find((_, i) => i !== room.you) ?? null;
  const coop = room.mode === 'coop';
  const won = room.winner === room.you;
  const winner = room.winner !== null ? room.players[room.winner] : null;

  let title: string;
  let detail: string;
  if (coop) {
    title = opponent ? 'Solved together!' : 'Solved!';
    detail = `${formatTime(me.finishedMs ?? 0)} with ${mistakesText(room.board?.mistakes ?? 0)}.`;
  } else if (room.endReason === 'forfeit') {
    title = 'You win!';
    detail = 'Your opponent left the race.';
  } else if (won) {
    title = 'You win!';
    detail = `Solved in ${formatTime(me.finishedMs ?? 0)} with ${mistakesText(me.mistakes)}.`;
  } else {
    title = `${winner?.name ?? 'Your opponent'} wins`;
    detail = `They solved ${room.mode === 'fair-race' ? 'theirs' : 'it'} in ${formatTime(winner?.finishedMs ?? 0)}. You were ${Math.round(me.progress * 100)}% done.`;
  }

  const rematchLabel = me.wantsRematch
    ? `Waiting for ${opponent?.name}…`
    : coop
      ? 'Play again'
      : opponent?.wantsRematch
        ? 'Accept rematch'
        : 'Rematch';

  return (
    <div className="paper-card tilted result-card" role="status">
      <span className="tape center" aria-hidden="true" />
      <div>
        <h2 className={!coop && !won ? 'lost' : undefined}>{title}</h2>
        <p>{detail}</p>
      </div>

      {room.endReason !== 'forfeit' && (
        <table className="result-table">
          <caption className="sr-only">Results</caption>
          <tbody>
            <ResultRow player={me} label="You" coop={coop} />
            {opponent && <ResultRow player={opponent} label={opponent.name} coop={coop} partner />}
          </tbody>
        </table>
      )}

      <div className="result-actions">
        {opponent ? (
          <button type="button" className="btn primary" disabled={me.wantsRematch} onClick={onRematch}>
            {rematchLabel}
          </button>
        ) : (
          <button type="button" className="btn primary" onClick={onRematch}>
            Invite someone new
          </button>
        )}
        <button type="button" className="btn" onClick={onExit}>
          Leave
        </button>
      </div>

      {opponent?.wantsRematch && !me.wantsRematch && (
        <p className="result-note">
          {opponent.name} wants {coop ? 'to play again' : 'a rematch'}!
        </p>
      )}
    </div>
  );
}

function ResultRow({
  player,
  label,
  coop,
  partner,
}: {
  player: PlayerSummary;
  label: string;
  coop: boolean;
  partner?: boolean;
}) {
  const main = coop
    ? `${player.placed} placed`
    : player.finishedMs !== null
      ? formatTime(player.finishedMs)
      : `${Math.round(player.progress * 100)}% done`;
  return (
    <tr>
      <th scope="row" className={partner ? 'partner' : undefined}>
        {label}
      </th>
      <td>{main}</td>
      <td>{mistakesText(player.mistakes)}</td>
    </tr>
  );
}
