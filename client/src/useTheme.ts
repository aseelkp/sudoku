import { useEffect, useState } from 'react';

export type ThemeChoice = 'system' | 'light' | 'dark';
export const THEME_CHOICES: readonly ThemeChoice[] = ['system', 'light', 'dark'];

const KEY = 'sudoku:theme';
const PAPER = { light: '#f7faff', dark: '#121a2b' };

function load(): ThemeChoice {
  try {
    const saved = localStorage.getItem(KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'system';
  } catch {
    return 'system';
  }
}

/** Light, dark, or whatever the device prefers. public/theme.js applies the saved choice before first paint. */
export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>(load);

  useEffect(() => {
    const root = document.documentElement;
    if (choice === 'system') delete root.dataset.theme;
    else root.dataset.theme = choice;

    // Keep the browser's toolbar colour in step with an explicit choice; 'system' falls back to the media queries.
    for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
      const scheme = meta.media.includes('dark') ? 'dark' : 'light';
      meta.content = choice === 'system' ? PAPER[scheme] : PAPER[choice];
    }

    try {
      if (choice === 'system') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, choice);
    } catch {
      // Without storage the choice lasts until reload.
    }
  }, [choice]);

  return [choice, setChoice] as const;
}
