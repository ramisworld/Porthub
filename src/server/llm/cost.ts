import "server-only";

/**
 * Token + cost accounting for LLM calls. Every live generation logs exact tokens
 * and computed cost per layer (Haiku facts, Opus design) plus a run total, so we
 * can analyse spend per run. Grep server logs for `[cost]`.
 */

// USD per 1,000,000 tokens (see docs/ARCHITECTURE.md §4). Keep in sync with models.
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-haiku-4-5": { input: 1, output: 5 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-opus-4-8": { input: 5, output: 25 },
};

// Cache multipliers (read ~0.1x input price, write ~1.25x). 0 for our uncached calls.
const CACHE_READ_MULT = 0.1;
const CACHE_WRITE_MULT = 1.25;

interface RawUsage {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}

export interface UsageRecord {
  label: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  costUsd: number;
}

export function buildUsageRecord(
  label: string,
  model: string,
  usage: RawUsage,
): UsageRecord {
  const price = PRICING[model] ?? { input: 0, output: 0 };
  const inputTokens = usage.input_tokens ?? 0;
  const outputTokens = usage.output_tokens ?? 0;
  const cacheReadTokens = usage.cache_read_input_tokens ?? 0;
  const cacheCreationTokens = usage.cache_creation_input_tokens ?? 0;

  const costUsd =
    (inputTokens * price.input +
      outputTokens * price.output +
      cacheReadTokens * price.input * CACHE_READ_MULT +
      cacheCreationTokens * price.input * CACHE_WRITE_MULT) /
    1_000_000;

  return {
    label,
    model,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheCreationTokens,
    costUsd,
  };
}

export function logUsage(r: UsageRecord): void {
  const cache =
    r.cacheReadTokens || r.cacheCreationTokens
      ? ` cache(r=${r.cacheReadTokens},w=${r.cacheCreationTokens})`
      : "";
  console.log(
    `[cost] ${r.label.padEnd(14)} ${r.model.padEnd(18)} in=${r.inputTokens} out=${r.outputTokens}${cache} → $${r.costUsd.toFixed(4)}`,
  );
}

export function logRunTotal(
  meta: { username: string; slug: string },
  records: UsageRecord[],
): void {
  if (records.length === 0) {
    console.log(`[cost] run ${meta.username} (${meta.slug}) — MOCK, $0.0000`);
    return;
  }
  const sum = (f: (r: UsageRecord) => number) =>
    records.reduce((a, r) => a + f(r), 0);
  const inTok = sum((r) => r.inputTokens);
  const outTok = sum((r) => r.outputTokens);
  const total = sum((r) => r.costUsd);
  console.log(
    `[cost] ═══ RUN TOTAL ${meta.username} (${meta.slug}): in=${inTok} out=${outTok} → $${total.toFixed(4)} ═══`,
  );
}
