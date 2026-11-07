import { useState } from 'react';
import type { Mode, PlayerSummary, RoomView } from '@sudoku/shared';
import { MODE_LABEL } from '../../modeLabels';
import { CheckMark } from '../icons';

interface Props {
  code: string;
  mode: Mode;
  difficulty: RoomView['difficulty'];
  me: PlayerSummary;
}

export function WaitingCard({ code, mode, difficulty, me }: Props) {
  const [copied, setCopied] = useState(false);
  const link = `${location.origin}/?room=${code}`;

  return (
    <div className="waiting">
      <header>
        <h1>Waiting for a friend</h1>
        <p>
          Send them the code or the link. {mode === 'coop' ? 'You’ll start' : 'The race starts'} as soon as they join.
        </p>
      </header>

      <div className="paper-card tilted code-card">
        <span className="tape left" aria-hidden="true" />
        <span className="tape right" aria-hidden="true" />
        <span className="soft">Room code</span>
        <span className="big-code" translate="no">
          {code}
        </span>
        <span className="soft">
          <strong style={{ color: 'var(--ink)', textTransform: 'capitalize' }}>{difficulty}</strong>,{' '}
          {MODE_LABEL[mode].toLowerCase()}
        </span>
      </div>

      <div className="share">
        <label htmlFor="invite-link" className="sr-only">
          Invite link
        </label>
        <input id="invite-link" readOnly value={link} onFocus={(e) => e.target.select()} />
        <button
          type="button"
          className="btn primary"
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

      <section aria-label="Players">
        <h2 className="label" style={{ margin: '0 0 6px' }}>
          Players
        </h2>
        <ul className="roster">
          <li>
            <CheckMark size={22} />
            <span className="hand who you">{me.name}</span>
            <span className="soft">you</span>
          </li>
          <li className="empty">
            <span className="empty-dot" aria-hidden="true" />
            <span className="hand who missing">waiting for them to join…</span>
          </li>
        </ul>
      </section>
    </div>
  );
}
