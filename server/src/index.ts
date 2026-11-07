import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocket, WebSocketServer } from 'ws';
import { parseClientMessage } from '@sudoku/shared';
import { type Connection, Lobby } from './lobby';

const PORT = Number(process.env.PORT ?? 8787);
const HEARTBEAT_MS = 25_000;
const MAX_MESSAGE_BYTES = 1024;

/** In production the server also serves the built client, so one service hosts everything. */
const CLIENT_DIST = resolve(fileURLToPath(import.meta.url), '../../../client/dist');
const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

const lobby = new Lobby();

const http = createServer((req, res) => {
  const path = new URL(req.url ?? '/', 'http://x').pathname;
  if (path === '/health') {
    res.writeHead(200, { 'content-type': 'text/plain' }).end('ok');
    return;
  }
  if (!existsSync(CLIENT_DIST)) {
    res
      .writeHead(404, { 'content-type': 'text/plain' })
      .end('Client not built. In development, use the Vite dev server.');
    return;
  }
  let file = join(CLIENT_DIST, normalize(path));
  // Unknown paths fall back to the app, so room links like /?room=ABC234 always load.
  if (!file.startsWith(CLIENT_DIST) || !existsSync(file) || statSync(file).isDirectory()) {
    file = join(CLIENT_DIST, 'index.html');
  }
  const immutable = file.includes(`${CLIENT_DIST}/assets/`);
  res.writeHead(200, {
    'content-type': MIME[extname(file)] ?? 'application/octet-stream',
    'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
  });
  createReadStream(file).pipe(res);
});

const wss = new WebSocketServer({ server: http, path: '/ws', maxPayload: MAX_MESSAGE_BYTES });
const alive = new WeakMap<WebSocket, boolean>();

wss.on('connection', (socket) => {
  alive.set(socket, true);
  socket.on('pong', () => alive.set(socket, true));

  const conn: Connection = {
    send: (msg) => socket.readyState === WebSocket.OPEN && socket.send(JSON.stringify(msg)),
  };

  socket.on('message', (data) => {
    const msg = parseClientMessage(data.toString());
    if (!msg) return conn.send({ t: 'error', message: 'Invalid message.' });
    lobby.handle(conn, msg);
  });
  socket.on('close', () => lobby.disconnect(conn));
});

// Drops sockets that stopped answering, and keeps idle ones from being cut by hosting proxies.
setInterval(() => {
  for (const socket of wss.clients) {
    if (!alive.get(socket)) {
      socket.terminate();
      continue;
    }
    alive.set(socket, false);
    socket.ping();
  }
  lobby.sweep();
}, HEARTBEAT_MS);

http.listen(PORT, () => console.info(`sudoku server listening on :${PORT}`));
