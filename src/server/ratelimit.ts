import { LRUCache } from "lru-cache";

/**
 * Tiny in-process sliding-window rate limiter.
 *
 *   limit("gen:<userId>", { window: "1h", max: 3 })
 *
 * Buckets are keyed and capped to 10k entries with a 24h TTL — good enough for
 * a single Node process. Swap for Upstash Ratelimit when we go multi-instance.
 */

type WindowSpec = "10s" | "1m" | "10m" | "1h" | "24h";

const WINDOWS: Record<WindowSpec, number> = {
  "10s": 10_000,
  "1m": 60_000,
  "10m": 10 * 60_000,
  "1h": 60 * 60_000,
  "24h": 24 * 60 * 60_000,
};

interface LimitOpts {
  window: WindowSpec;
  max: number;
}

const buckets = new LRUCache<string, number[]>({
  max: 10_000,
  ttl: WINDOWS["24h"],
});

export function limit(
  key: string,
  opts: LimitOpts,
): { ok: boolean; retryAfter: number } {
  const windowMs = WINDOWS[opts.window];
  const now = Date.now();
  const fullKey = `${key}|${opts.window}`;
  const hits = (buckets.get(fullKey) ?? []).filter((t) => now - t < windowMs);

  if (hits.length >= opts.max) {
    const oldest = hits[0] ?? now;
    return {
      ok: false,
      retryAfter: Math.ceil((windowMs - (now - oldest)) / 1000),
    };
  }

  hits.push(now);
  buckets.set(fullKey, hits);
  return { ok: true, retryAfter: 0 };
}

/**
 * Legacy 5/min limiter — kept so existing call sites continue to work while
 * we migrate to the explicit `limit(key, { window, max })` signature.
 */
export function rateLimit(key: string): { ok: boolean; retryAfter: number } {
  return limit(key, { window: "1m", max: 5 });
}
