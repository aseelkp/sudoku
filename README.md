# Sudoku

Sudoku for one or two players:

- **Solo**
- **Race, same puzzle**: first to finish wins
- **Race, different puzzles**: each player gets their own grid of identical difficulty
- **Co-op**: one shared board, shared pencil marks, and your partner's cursor

## Run it

```bash
npm install
npm run dev     # game server on :8787 + app on http://localhost:5173
npm test
```

To play against yourself locally, open the app in two browser tabs (or a normal and a private window), create a room in one, and join with the code in the other.

## Layout

- `shared/` – game rules, puzzle generation (`sudoku-gen`), and the client/server message protocol. Used by both sides.
- `server/` – Node + `ws`. Owns rooms and puzzles; checks every move. Solutions never leave the server.
- `client/` – React + Vite app. Dev server proxies `/ws` to the game server.

In production, `npm run build && npm start` serves the built app and the WebSocket from one Node process (the server is bundled with esbuild and runs on plain Node).

## Deploy (Render, free plan)

The repo includes a Render Blueprint (`render.yaml`):

1. Push this repo to GitHub.
2. In Render: **New → Blueprint**, pick the repo, and apply. Render runs `npm ci --include=dev && npm run build`, then `npm start`.
3. Open the `*.onrender.com` URL. Room links use that origin automatically.

Things to know about the free plan:

- The service sleeps after ~15 minutes without traffic; the first visit after that takes up to a minute.
- Rooms live in server memory, so a deploy or restart ends games in progress. Players see a clear message and can start a new room.

Optional environment variables: `ALLOWED_ORIGINS` (extra origins allowed to open game sockets, comma-separated), `MAX_ROOMS` (default 2000).

## Checks

`npm run check` runs lint, format check, typecheck and unit tests. CI runs the same on every push, on Node 24 and 26.
