import { useCallback, useState } from 'react';
import { normalizeCode } from '@sudoku/shared';
import { HomeScreen } from './screens/HomeScreen';
import { RoomScreen } from './screens/RoomScreen';
import { SoloScreen } from './screens/SoloScreen';
import { type RoomIntent, loadSession } from './useRoom';

type Screen = { t: 'home' } | { t: 'solo' } | { t: 'race'; intent: RoomIntent };

const roomInUrl = () => normalizeCode(new URLSearchParams(location.search).get('room') ?? '');

function setRoomInUrl(code: string | null) {
  const url = new URL(location.href);
  if (code) url.searchParams.set('room', code);
  else url.searchParams.delete('room');
  history.replaceState(null, '', url);
}

function initialScreen(): Screen {
  // A reload during a race rejoins it, as long as the link still points at the same room.
  const session = loadSession();
  if (session && (!roomInUrl() || roomInUrl() === session.code)) return { t: 'race', intent: { t: 'resume' } };
  return { t: 'home' };
}

export function App() {
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const home = useCallback(() => {
    setRoomInUrl(null);
    setScreen({ t: 'home' });
  }, []);
  const onRoomCode = useCallback((code: string) => setRoomInUrl(code), []);

  return (
    <main className="app">
      {screen.t === 'home' && (
        <HomeScreen
          initialCode={roomInUrl()}
          onSolo={() => {
            setRoomInUrl(null);
            setScreen({ t: 'solo' });
          }}
          onRace={(intent) => setScreen({ t: 'race', intent })}
        />
      )}
      {screen.t === 'solo' && <SoloScreen onHome={home} />}
      {screen.t === 'race' && <RoomScreen intent={screen.intent} onExit={home} onRoomCode={onRoomCode} />}
    </main>
  );
}
