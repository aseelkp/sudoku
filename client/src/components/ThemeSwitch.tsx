import { THEME_CHOICES, useTheme } from '../useTheme';
import { DrawnCircle } from './icons';

const LABEL = { system: 'System', light: 'Light', dark: 'Dark' } as const;

export function ThemeSwitch() {
  const [choice, setChoice] = useTheme();
  return (
    <div className="theme-switch">
      <span id="theme-label" className="label">
        Appearance
      </span>
      <div className="difficulty" role="radiogroup" aria-labelledby="theme-label">
        {THEME_CHOICES.map((c) => (
          <button key={c} type="button" role="radio" aria-checked={c === choice} onClick={() => setChoice(c)}>
            {c === choice && <DrawnCircle />}
            {LABEL[c]}
          </button>
        ))}
      </div>
    </div>
  );
}
