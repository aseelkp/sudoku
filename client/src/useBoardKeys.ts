import { useEffect, useRef } from 'react';

export interface BoardKeyHandlers {
  digit: (digit: number, asNote: boolean) => void;
  move: (dRow: number, dCol: number) => void;
  erase: () => void;
  toggleNotes: () => void;
}

const ARROWS: Record<string, [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

/** Keyboard play: arrows move, 1–9 fill, Shift+1–9 pencil, Backspace/Delete/0 erase, N toggles notes. */
export function useBoardKeys(handlers: BoardKeyHandlers, enabled = true) {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      const h = ref.current;
      // e.code keeps Shift+digit working as "pencil mark" on every keyboard layout.
      const digit = /^(Digit|Numpad)([1-9])$/.exec(e.code)?.[2];
      if (digit) h.digit(Number(digit), e.shiftKey);
      else if (ARROWS[e.key]) h.move(...ARROWS[e.key]);
      else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') h.erase();
      else if (e.key === 'n' || e.key === 'N') h.toggleNotes();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);
}

/** Moves a selection around the board, wrapping at the edges. Starts in the centre. */
export function stepSelection(selected: number | null, dRow: number, dCol: number): number {
  if (selected === null) return 40;
  const row = (Math.floor(selected / 9) + dRow + 9) % 9;
  const col = ((selected % 9) + dCol + 9) % 9;
  return row * 9 + col;
}
