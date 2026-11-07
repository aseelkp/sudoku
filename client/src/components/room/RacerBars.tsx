import type { PlayerSummary } from '@sudoku/shared';
import { formatTime } from '../../time';

/** Side-by-side progress for a race. */
export function RacerBars({ me, opponent }: { me: PlayerSummary; opponent: PlayerSummary | null }) {
  return (
    <div className="racers">
      <Racer player={me} label="You" />
      {opponent ? <Racer player={opponent} label={opponent.name} /> : <div className="racer gone">Opponent left</div>}
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
