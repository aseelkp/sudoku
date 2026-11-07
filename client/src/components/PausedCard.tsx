import { PlayIcon } from './icons';

interface Props {
  title: string;
  /** Who paused, in co-op: their pencil colour on the title. */
  byPartner?: boolean;
  detail: string;
  onResume: () => void;
}

/** Covers the (hidden) board while the game is paused. */
export function PausedCard({ title, byPartner, detail, onResume }: Props) {
  return (
    <div className="board-overlay">
      <div className="paper-card tilted paused-card" role="status">
        <span className="tape center" aria-hidden="true" />
        <h2 className={byPartner ? 'partner' : undefined}>{title}</h2>
        <p>{detail}</p>
        <button type="button" className="btn primary wide" onClick={onResume}>
          <PlayIcon size={16} />
          Resume
        </button>
      </div>
    </div>
  );
}
