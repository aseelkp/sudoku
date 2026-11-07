import type { CSSProperties } from 'react';
import type { PlayerSummary } from '@sudoku/shared';
import { formatTime } from '../../time';
import { FinishFlag } from '../icons';

/** Progress as a doodled race in the margin: you above the dashed line, your opponent below it. */
export function RaceTrack({ me, opponent }: { me: PlayerSummary; opponent: PlayerSummary | null }) {
  const pct = (p: PlayerSummary) => (p.finishedMs !== null ? 100 : Math.round(p.progress * 100));
  const summary = opponent
    ? `Race progress: you ${pct(me)}%, ${opponent.name} ${pct(opponent)}%`
    : `Race progress: you ${pct(me)}%, your opponent left`;

  return (
    <section className="track" aria-label={summary}>
      <div className="track-line" />
      <FinishFlag />
      <Racer player={me} label="You" side="you" />
      {opponent ? (
        <Racer player={opponent} label={opponent.name} side="opponent" />
      ) : (
        <div className="racer opponent start" style={{ '--at': '0%' } as CSSProperties} aria-hidden="true">
          <span className="racer-note">Opponent left</span>
        </div>
      )}
    </section>
  );
}

function Racer({ player, label, side }: { player: PlayerSummary; label: string; side: 'you' | 'opponent' }) {
  const finished = player.finishedMs !== null;
  const pct = finished ? 100 : Math.round(player.progress * 100);
  // The finish flag sits at the right edge, so 100% lands just before it.
  const at = `calc((100% - 44px) * ${pct / 100})`;
  const anchor = pct < 12 ? 'start' : pct > 80 ? 'end' : 'middle';
  const notes = [
    !player.connected && 'reconnecting',
    side === 'opponent' && player.mistakes > 0 && (player.mistakes === 1 ? '1 mistake' : `${player.mistakes} mistakes`),
  ].filter(Boolean);

  return (
    <div className={`racer ${side} ${anchor}`} style={{ '--at': at } as CSSProperties} aria-hidden="true">
      {side === 'you' ? (
        <span className="dot" />
      ) : (
        <svg className="triangle" width="20" height="20" viewBox="0 0 20 20">
          <path
            d="M10 2 18 17H2z"
            fill="var(--partner-mark)"
            stroke="var(--ink)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      )}
      <span className="racer-name">
        {label} {finished ? formatTime(player.finishedMs!) : `${pct}%`}
      </span>
      {notes.length > 0 && <span className="racer-note">{notes.join(', ')}</span>}
    </div>
  );
}
