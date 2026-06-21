import "server-only";
import { customAlphabet } from "nanoid";
import type { Prisma } from "../../../generated/prisma";
import { db } from "~/server/db";
import { fetchRawProfile } from "~/server/github/fetch";
import { buildFacts } from "~/server/llm/facts";
import { buildDesignSpec } from "~/server/llm/design";
import { logRunTotal, type UsageRecord } from "~/server/llm/cost";
import { ENGINE_VERSION } from "~/engine/version";

// DNS-safe lowercase slug for the subdomain.
const newSlug = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 10);

export type Stage =
  | "fetching"
  | "curating"
  | "writing"
  | "designing"
  | "saving"
  | "done"
  | "error";

export interface GenerateEvent {
  stage: Stage;
  message?: string;
  slug?: string;
  error?: string;
}

/**
 * The Phase-1 pipeline: fetch → curate (in fetch) → facts → design → render-check →
 * persist. Yields progress events for the live build-log. Honors MOCK_LLM via the
 * facts/design modules.
 */
export async function* runGeneration(
  username: string,
  vibe: string,
): AsyncGenerator<GenerateEvent> {
  try {
    yield { stage: "fetching", message: "Reading your GitHub…" };
    const profile = await fetchRawProfile(username);

    yield { stage: "curating", message: "Curating your best work…" };

    const usages: UsageRecord[] = [];

    yield { stage: "writing", message: "Writing your story…" };
    const { data, usage: factsUsage } = await buildFacts(profile);
    if (factsUsage) usages.push(factsUsage);

    yield { stage: "designing", message: "Designing your site…" };
    const { spec, usage: designUsage } = await buildDesignSpec(data, vibe);
    if (designUsage) usages.push(designUsage);

    yield { stage: "saving", message: "Publishing…" };
    const slug = newSlug();
    await db.portfolio.create({
      data: {
        githubUsername: profile.user.login,
        slug,
        vibe,
        profileData: JSON.parse(JSON.stringify(data)) as Prisma.InputJsonValue,
        designSpec: JSON.parse(JSON.stringify(spec)) as Prisma.InputJsonValue,
        engineVersion: ENGINE_VERSION,
        isPublic: false,
      },
    });

    logRunTotal({ username: profile.user.login, slug }, usages);
    yield { stage: "done", slug };
  } catch (err) {
    yield {
      stage: "error",
      error: err instanceof Error ? err.message : "Generation failed.",
    };
  }
}
