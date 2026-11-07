import { expect, it } from 'vitest';
import { RateLimiter } from './rateLimit';

it('allows a burst, then refills over time', () => {
  let t = 0;
  const limiter = new RateLimiter(3, 2, () => t);
  expect([limiter.take(), limiter.take(), limiter.take(), limiter.take()]).toEqual([true, true, true, false]);
  t += 500; // half a second at 2/s refills one token
  expect(limiter.take()).toBe(true);
  expect(limiter.take()).toBe(false);
  t += 60_000; // never exceeds capacity
  expect([limiter.take(), limiter.take(), limiter.take(), limiter.take()]).toEqual([true, true, true, false]);
});
