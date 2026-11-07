import { useState } from 'react';
import {
  DIFFICULTIES,
  type Difficulty,
  MAX_NAME_LENGTH,
  type Mode,
  ROOM_CODE_LENGTH,
  normalizeCode,
  normalizeName,
} from '@sudoku/shared';
import { DrawnCheckbox, DrawnCircle, PencilIcon } from '../components/icons';
import type { RoomIntent } from '../useRoom';

const NAME_KEY = 'sudoku:name';

const MODE_OPTIONS: { mode: Mode; title: string; detail: string; tilt: number }[] = [
  { mode: 'race', title: 'Same puzzle', detail: 'Race on one grid. First to finish wins.', tilt: -3 },
  { mode: 'fair-race', title: 'Different puzzles', detail: 'Your own grids, exactly as hard.', tilt: 2 },
  { mode: 'coop', title: 'Co-op', detail: 'One board, two pencils.', tilt: -1.5 },
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
      <header>
        <h1>Sudoku</h1>
        <p className="tagline hand">on your own, or with a friend</p>
      </header>

      <button type="button" className="btn wide solo-btn" onClick={onSolo}>
        <PencilIcon />
        Play solo
      </button>

      <h2 className="friend-heading">Play with a friend</h2>

      <div className="field">
        <label htmlFor="name">Your name</label>
        <input
          id="name"
          className="line-input name-input"
          value={name}
          maxLength={MAX_NAME_LENGTH}
          autoComplete="nickname"
          placeholder="Write it here"
          aria-invalid={nameMissing}
          aria-describedby={nameMissing ? 'name-error' : undefined}
          onChange={(e) => {
            setName(e.target.value);
            setNameMissing(false);
          }}
        />
        {nameMissing && (
          <span id="name-error" className="error-text">
            Add your name so your friend knows who they’re playing with.
          </span>
        )}
      </div>

      <form
        className="field"
        style={{ gap: 14 }}
        onSubmit={(e) => {
          e.preventDefault();
          withName((n) => onRace({ t: 'create', mode, difficulty, name: n }));
        }}
      >
        <section className="choices">
          <h3 id="mode-heading">How do you want to play?</h3>
          <div className="choices" role="radiogroup" aria-labelledby="mode-heading">
            {MODE_OPTIONS.map((m) => (
              <button
                key={m.mode}
                type="button"
                role="radio"
                aria-checked={m.mode === mode}
                className="choice"
                onClick={() => setMode(m.mode)}
              >
                <DrawnCheckbox checked={m.mode === mode} tilt={m.tilt} />
                <span className="choice-text">
                  <span className="choice-title">{m.title}</span>
                  <span className="choice-detail">{m.detail}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <div className="difficulty" role="radiogroup" aria-label="Difficulty">
          {DIFFICULTIES.map((d) => (
            <button key={d} type="button" role="radio" aria-checked={d === difficulty} onClick={() => setDifficulty(d)}>
              {d === difficulty && <DrawnCircle />}
              {label(d)}
            </button>
          ))}
        </div>

        <button type="submit" className="btn primary wide" style={{ minHeight: 54, fontSize: 17 }}>
          Create room
        </button>
      </form>

      <form
        className="field"
        onSubmit={(e) => {
          e.preventDefault();
          if (cleanCode.length === ROOM_CODE_LENGTH) withName((n) => onRace({ t: 'join', code: cleanCode, name: n }));
        }}
      >
        <label htmlFor="room-code">Got a room code?</label>
        <div className="join-row">
          <input
            id="room-code"
            className="line-input code-input"
            value={code}
            maxLength={ROOM_CODE_LENGTH}
            placeholder="e.g. K7QM2D"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setCode(normalizeCode(e.target.value))}
          />
          <button type="submit" className="btn" disabled={cleanCode.length !== ROOM_CODE_LENGTH}>
            Join
          </button>
        </div>
      </form>
    </div>
  );
}
