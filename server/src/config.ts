import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) throw new Error(`${name} must be a non-negative integer, got "${raw}"`);
  return value;
}

/** All runtime settings, read once from the environment at startup. */
export const config = {
  port: intFromEnv('PORT', 8787),
  /** Extra origins allowed to open game sockets, besides the server's own (comma-separated). */
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  maxRooms: intFromEnv('MAX_ROOMS', 2000),
  /** The built client. Same depth from src/ and dist/, so this works for tsx and the bundle. */
  clientDist: process.env.CLIENT_DIST ?? resolve(fileURLToPath(import.meta.url), '../../../client/dist'),
  heartbeatMs: 25_000,
  maxMessageBytes: 1024,
  shutdownGraceMs: 5_000,
};
