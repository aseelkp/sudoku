# Sudoku

Solo sudoku, plus multiplayer races against a friend: on the same puzzle, or on different puzzles of identical difficulty ("fair race").

## Run it

```bash
npm install
npm run dev     # game server on :8787 + app on http://localhost:5173
npm test
```

To race yourself locally, open the app in two browser tabs (or a normal and a private window), create a room in one, and join with the code in the other.

## Layout

- `shared/` – game rules, puzzle generation (`sudoku-gen`), and the client/server message protocol. Used by both sides.
- `server/` – Node + `ws`. Owns rooms and puzzles; checks every move. Solutions never leave the server.
- `client/` – React + Vite app. Dev server proxies `/ws` to the game server.

In production, `npm run build && npm start` serves the built app and the WebSocket from one Node process.
