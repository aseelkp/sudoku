import type { PlayerSummary } from '@sudoku/shared';

/** Shared progress and each player's contribution in co-op. */
export function TeamBar({ me, partner }: { me: PlayerSummary; partner: PlayerSummary | null }) {
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
