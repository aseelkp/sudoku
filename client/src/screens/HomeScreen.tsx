import { useState } from 'react';
import { DIFFICULTIES, type Difficulty, MAX_NAME_LENGTH, type Mode, ROOM_CODE_LENGTH, normalizeCode, normalizeName } from '@sudoku/shared';
import type { RoomIntent } from '../useRoom';

const NAME_KEY = 'sudoku:name';

const MODE_OPTIONS: { mode: Mode; title: string; detail: string }[] = [
  { mode: 'race', title: 'Same puzzle', detail: 'Both solve the identical grid' },
  { mode: 'fair-race', title: 'Different puzzles', detail: 'Unique grids, equally hard' },
  { mode: 'coop', title: 'Co-op', detail: 'Solve one board together' },
];

function loadName() {
  try {
    return localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

interface Props {
  initialCode: string;
  onSolo: () => void;
  onRace: (intent: RoomIntent) => void;
}

export function HomeScreen({ initialCode, onSolo, onRace }: Props) {
  const [name, setName] = useState(loadName);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [mode, setMode] = useState<Mode>('race');
  const [code, setCode] = useState(initialCode);
  const [nameMissing, setNameMissing] = useState(false);

  const withName = (go: (name: string) => void) => {
    const clean = normalizeName(name);
    if (!clean) {
      setNameMissing(true);
      document.getElementById('name')?.focus();
      return;
    }
    try {
      localStorage.setItem(NAME_KEY, clean);
    } catch {
      // Remembering the name is a convenience.
    }
    go(clean);
  };

  const cleanCode = normalizeCode(code);
  const label = (d: string) => d[0].toUpperCase() + d.slice(1);

  return (
    <div className="home">
      <header className="hero">
        <h1>Sudoku</h1>
        <p>Play alone, race a friend, or solve one together.</p>
      </header>

      <section className="card">
        <h2>Solo</h2>
        <button type="button" className="primary wide" onClick={onSolo}>
          Play solo
        </button>
      </section>

      <section className="card">
        <h2>Play with a friend</h2>
        <label className="field">
          <span>Your name</span>
          <input
            id="name"
            value={name}
            maxLength={MAX_NAME_LENGTH}
            autoComplete="nickname"
            placeholder="e.g. Sam"
            aria-invalid={nameMissing}
            onChange={(e) => {
              setName(e.target.value);
              setNameMissing(false);
            }}
          />
          {nameMissing && <small className="error-text">Enter a name so your friend knows who they’re playing with.</small>}
        </label>

        <div className="split">
          <form
            className="option"
            onSubmit={(e) => {
              e.preventDefault();
              withName((n) => onRace({ t: 'create', mode, difficulty, name: n }));
            }}
          >
            <h3>Start a game</h3>
            <div className="modes" role="radiogroup" aria-label="Race type">
              {MODE_OPTIONS.map((m) => (
                <button
                  key={m.mode}
                  type="button"
                  role="radio"
                  aria-checked={m.mode === mode}
                  className={m.mode === mode ? 'mode on' : 'mode'}
                  onClick={() => setMode(m.mode)}
                >
                  <strong>{m.title}</strong>
                  <span>{m.detail}</span>
                </button>
              ))}
            </div>
            <div className="segmented" role="radiogroup" aria-label="Difficulty">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={d === difficulty}
                  className={d === difficulty ? 'on' : ''}
                  onClick={() => setDifficulty(d)}
                >
                  {label(d)}
                </button>
              ))}
            </div>
            <button type="submit" className="primary wide">
              Create room
            </button>
          </form>

          <form
            className="option"
            onSubmit={(e) => {
              e.preventDefault();
              if (cleanCode.length === ROOM_CODE_LENGTH) withName((n) => onRace({ t: 'join', code: cleanCode, name: n }));
            }}
          >
            <h3>Join a game</h3>
            <input
              className="code-input"
              value={code}
              maxLength={ROOM_CODE_LENGTH}
              placeholder="ROOM CODE"
              aria-label="Room code"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => setCode(normalizeCode(e.target.value))}
            />
            <button type="submit" className="primary wide" disabled={cleanCode.length !== ROOM_CODE_LENGTH}>
              Join
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
