import { LRUCache } from "lru-cache";

/**
 * Minimal sliding-window rate limiter (IP + GitHub username), in-memory.
 * Good enough for local/dev and to gate Opus spend before launch.
 * Swap for Upstash Ratelimit in production (multi-instance correctness).
 */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;

const buckets = new LRUCache<string, number[]>({ max: 10_000, ttl: WINDOW_MS });

export function rateLimit(key: string): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < WINDOW_MS);

  if (hits.length >= MAX_PER_WINDOW) {
    const oldest = hits[0] ?? now;
    return { ok: false, retryAfter: Math.ceil((WINDOW_MS - (now - oldest)) / 1000) };
  }

  hits.push(now);
  buckets.set(key, hits);
  return { ok: true, retryAfter: 0 };
}
