import { useEffect, useEffectEvent } from 'react';

export interface BoardKeyHandlers {
  digit: (digit: number, asNote: boolean) => void;
  move: (dRow: number, dCol: number) => void;
  erase: () => void;
  toggleNotes: () => void;
  /** Pause or resume, where the mode allows it. */
  togglePause?: () => void;
}

const ARROWS: Record<string, [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

/** Keyboard play: arrows move, 1–9 fill, Shift+1–9 pencil, Backspace/Delete/0 erase, N toggles notes. */
export function useBoardKeys(handlers: BoardKeyHandlers, enabled = true) {
  // An effect event always sees the latest handlers without re-subscribing on every render.
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
    // e.code keeps Shift+digit working as "pencil mark" on every keyboard layout.
    const digit = /^(Digit|Numpad)([1-9])$/.exec(e.code)?.[2];
    if (digit) handlers.digit(Number(digit), e.shiftKey);
    else if (ARROWS[e.key]) handlers.move(...ARROWS[e.key]);
    else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') handlers.erase();
    else if (e.key === 'n' || e.key === 'N') handlers.toggleNotes();
    else if ((e.key === 'p' || e.key === 'P') && handlers.togglePause) handlers.togglePause();
    else return;
    e.preventDefault();
  });

  useEffect(() => {
    if (!enabled) return;
    const listener = (e: KeyboardEvent) => onKey(e);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [enabled]);
}

/** Moves a selection around the board, wrapping at the edges. Starts in the centre. */
export function stepSelection(selected: number | null, dRow: number, dCol: number): number {
  if (selected === null) return 40;
  const row = (Math.floor(selected / 9) + dRow + 9) % 9;
  const col = ((selected % 9) + dCol + 9) % 9;
  return row * 9 + col;
}
