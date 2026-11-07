/** Stroke icons drawn to match the pencil-on-paper look. All decorative: label the control, not the icon. */

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

export function BackIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" {...stroke} strokeWidth={2.2}>
      <path d="M12.5 4.5 7 10l5.5 5.5" />
    </svg>
  );
}

export function PencilIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" {...stroke}>
      <path d="M13.5 3.5 16.5 6.5 7 16H4v-3z" />
      <path d="M11.5 5.5l3 3" />
    </svg>
  );
}

export function EraserIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" {...stroke}>
      <path d="M8 16.5h8.5" />
      <path d="M3.5 12.5 11 5l4.5 4.5L9 16H6.5z" />
      <path d="M7.5 8.5l4.5 4.5" />
    </svg>
  );
}

/** A hand-drawn check mark. */
export function CheckMark({ size = 26 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 26 26" fill="none">
      <path
        d="M5 13.5c2.2 1.6 3.6 3.6 4.6 5.6C12 12.5 16 7.5 22.5 3.5"
        stroke="var(--you)"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A slightly wonky drawn checkbox, ticked or empty. */
export function DrawnCheckbox({ checked, tilt }: { checked: boolean; tilt: number }) {
  return (
    <svg aria-hidden="true" className="drawn-box" width="26" height="26" viewBox="0 0 26 26" fill="none">
      <rect
        x="2.5"
        y="3"
        width="20"
        height="20"
        rx="3"
        stroke="var(--ink)"
        strokeWidth="2"
        transform={`rotate(${tilt} 12.5 13)`}
      />
      {checked && (
        <path
          d="M6 13.5c2.2 1.6 3.6 3.6 4.6 5.6C13 12.5 17 7.5 23.5 3.5"
          stroke="var(--you)"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

/** A loose pencil loop drawn around the selected option. */
export function DrawnCircle() {
  return (
    <svg aria-hidden="true" className="drawn-circle" viewBox="0 0 100 44" preserveAspectRatio="none" fill="none">
      <path
        d="M8 24C6 10 40 4 70 6c22 2 30 10 26 20-4 11-40 14-66 11C12 35 6 30 9 20"
        stroke="var(--you)"
        strokeWidth="2.2"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function FinishFlag() {
  return (
    <svg aria-hidden="true" className="finish-flag" width="26" height="34" viewBox="0 0 26 34" fill="none">
      <path d="M3 33V3" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
      <path d="M3 4h20v14H3" fill="#fff" stroke="var(--ink)" strokeWidth="1.6" />
      <path d="M3 4h5v5H3zM13 4h5v5h-5zM8 9h5v4H8zM18 9h5v4h-5zM3 13h5v5H3zM13 13h5v5h-5z" fill="var(--ink)" />
    </svg>
  );
}
