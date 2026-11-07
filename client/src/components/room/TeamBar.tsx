import type { PlayerSummary } from '@sudoku/shared';

/** Shared progress and each player's contribution in co-op. */
export function TeamBar({ me, partner }: { me: PlayerSummary; partner: PlayerSummary | null }) {
  const pct = Math.round(me.progress * 100);
  return (
    <section className="team" aria-label="Team progress">
      <div className="team-head">
        <span>Board {pct}% done</span>
        <span className="hand" aria-hidden="true">
          together
        </span>
      </div>
      <div
        className="meter"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Board progress"
      >
        <div className="meter-fill" style={{ transform: `scaleX(${pct / 100})` }} />
      </div>
      <div className="teammates">
        <Teammate player={me} label="You" />
        {partner ? <Teammate player={partner} label={partner.name} partner /> : <span>Partner left. Keep going!</span>}
      </div>
    </section>
  );
}

function Teammate({ player, label, partner }: { player: PlayerSummary; label: string; partner?: boolean }) {
  const mistakes = player.mistakes === 1 ? ', 1 mistake' : player.mistakes > 1 ? `, ${player.mistakes} mistakes` : '';
  return (
    <span className="teammate">
      <span className={partner ? 'swatch partner' : 'swatch'} aria-hidden="true" />
      <strong className={partner ? 'partner' : 'you'}>{label}</strong>
      {player.placed} placed{mistakes}
      {!player.connected && ', reconnecting'}
    </span>
  );
}
