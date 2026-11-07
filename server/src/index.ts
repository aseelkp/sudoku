import { createServer } from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import { parseClientMessage } from '@sudoku/shared';
import { config } from './config';
import { type Connection, Lobby } from './lobby';
import { RateLimiter } from './rateLimit';
import { serveStatic } from './static';

const lobby = new Lobby({ maxRooms: config.maxRooms });
const staticFiles = serveStatic(config.clientDist);

const http = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'text/plain' }).end('ok');
    return;
  }
  staticFiles(req, res);
});

/** Same-origin pages may connect, plus any explicitly allowed origins. Non-browser clients send no Origin. */
function originAllowed(origin: string | undefined, host: string | undefined): boolean {
  if (!origin) return true;
  if (config.allowedOrigins.includes(origin)) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

const wss = new WebSocketServer({
  server: http,
  path: '/ws',
  maxPayload: config.maxMessageBytes,
  verifyClient: ({ origin, req }) => originAllowed(origin, req.headers.host),
});
const alive = new WeakMap<WebSocket, boolean>();

wss.on('connection', (socket) => {
  alive.set(socket, true);
  socket.on('pong', () => alive.set(socket, true));
  // Without a listener, one malformed frame would throw and take the whole server down.
  socket.on('error', (err) => console.warn('socket error:', err.message));

  const limiter = new RateLimiter(40, 20);
  const conn: Connection = {
    send: (msg) => {
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(msg));
    },
  };

  socket.on('message', (data) => {
    if (!limiter.take()) {
      socket.close(1008, 'Too many messages');
      return;
    }
    const msg = parseClientMessage(data.toString());
    if (!msg) {
      conn.send({ t: 'error', message: 'Invalid message.' });
      return;
    }
    lobby.handle(conn, msg);
  });
  socket.on('close', () => lobby.disconnect(conn));
});

// Drops sockets that stopped answering, and keeps idle ones from being cut by hosting proxies.
const heartbeat = setInterval(() => {
  for (const socket of wss.clients) {
    if (!alive.get(socket)) {
      socket.terminate();
      continue;
    }
    alive.set(socket, false);
    socket.ping();
  }
  lobby.sweep();
}, config.heartbeatMs);

http.listen(config.port, () => console.info(`sudoku server listening on :${config.port}`));

// Hosts send SIGTERM before replacing an instance. Rooms live in memory, so in-progress games end here;
// close sockets with "service restart" so clients show a clear message instead of hanging.
function shutdown(signal: string) {
  console.info(`${signal} received, shutting down`);
  clearInterval(heartbeat);
  for (const socket of wss.clients) socket.close(1012, 'Server restarting');
  wss.close();
  http.close(() => process.exit(0));
  setTimeout(() => process.exit(0), config.shutdownGraceMs).unref();
}
process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));
