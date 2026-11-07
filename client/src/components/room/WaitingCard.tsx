import { useState } from 'react';
import type { Mode, RoomView } from '@sudoku/shared';
import { MODE_LABEL } from '../../modeLabels';

export function WaitingCard({
  code,
  mode,
  difficulty,
}: {
  code: string;
  mode: Mode;
  difficulty: RoomView['difficulty'];
}) {
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
