import "server-only";
import { z } from "zod";
import {
  aggregateLanguages,
  compactReadme,
  pickStats,
} from "~/server/github/select";
import type { RawProfile, RawRepo } from "~/server/github/types";
import {
  profileDataSchema,
  type ProfileData,
  type Project,
} from "~/server/profile/model";
import { anthropic, isMock, MODELS, textOf } from "./anthropic";
import { buildUsageRecord, logUsage, type UsageRecord } from "./cost";

/**
 * Layer 1 — Facts. Turns the compacted RawProfile into the structured, editable
 * ProfileData. Deterministic for identity/languages/stats/tech; the LLM (Haiku)
 * only writes the headline/role and per-project blurbs. Mockable (zero spend).
 */

// ---- helpers (deterministic) ----

function firstSentences(text: string, n: number): string {
  const parts = text.replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s+/);
  return parts.slice(0, n).join(" ").slice(0, 280);
}

function repoTech(r: RawRepo): string[] {
  const tech = [
    r.primaryLanguage?.name,
    ...r.languages.slice(0, 4).map((l) => l.name),
    ...r.topics.slice(0, 4),
  ].filter((t): t is string => Boolean(t));
  return [...new Set(tech)].slice(0, 8);
}

function inferRole(languages: { label: string }[], repos: RawRepo[]): string {
  const langs = languages.map((l) => l.label.toLowerCase());
  const topics = repos.flatMap((r) => r.topics.map((t) => t.toLowerCase()));
  const has = (...xs: string[]) =>
    xs.some((x) => langs.includes(x) || topics.includes(x));
  if (has("machine-learning", "ml", "deep-learning", "pytorch", "tensorflow"))
    return "Machine learning engineer";
  if (has("typescript", "javascript", "react", "next") && has("python", "go", "rust"))
    return "Full-stack developer";
  if (has("typescript", "javascript", "react", "next", "vue", "svelte"))
    return "Frontend developer";
  if (has("go", "rust", "python", "java", "c++")) return "Backend developer";
  return "Software developer";
}

function safeUrl(s: string | null): string | undefined {
  if (!s) return undefined;
  const v = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    new URL(v);
    return v;
  } catch {
    return undefined;
  }
}

function buildIdentityLinks(profile: RawProfile): ProfileData["identity"]["links"] {
  const u = profile.user;
  // GitHub returns "" (not null) for unset fields, and websites may lack a scheme.
  const email =
    u.email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(u.email) ? u.email : undefined;
  return {
    github: u.url,
    site: safeUrl(u.websiteUrl),
    x: u.twitterUsername ? `https://x.com/${u.twitterUsername}` : undefined,
    email,
  };
}

// ---- the LLM-written part ----

const factsOutputSchema = z.object({
  headline: z.string(),
  role: z.string(),
  projects: z.array(z.object({ name: z.string(), blurb: z.string() })),
});
type FactsOutput = z.infer<typeof factsOutputSchema>;

function mockFacts(profile: RawProfile, languages: { label: string }[]): FactsOutput {
  const top = languages.slice(0, 2).map((l) => l.label);
  return {
    headline:
      profile.user.bio?.trim() ??
      (top.length
        ? `Building with ${top.join(" & ")}`
        : "Building things on the internet"),
    role: inferRole(languages, profile.repos),
    projects: profile.repos.map((r) => {
      const intro = compactReadme(r.readme);
      const blurb = intro
        ? firstSentences(intro, 2)
        : (r.description ??
          `A ${r.primaryLanguage?.name ?? "software"} project${
            r.topics[0] ? ` focused on ${r.topics[0]}` : ""
          }.`);
      return { name: r.name, blurb };
    }),
  };
}

// DRAFT facts prompt — reviewed at the checkpoint before going live.
const FACTS_SYSTEM = `You write the factual content for a developer's portfolio from real GitHub data.
Rules:
- Ground every sentence in the provided data. Never invent metrics, employers, or facts.
- BANNED filler: "passionate", "dedicated developer", "clean code", "results-driven", "team player", "across the full stack" (unless literally true and specific).
- Each project blurb: 1–2 sentences, concrete — what it does + the notable tech. If the data is thin, be brief; do not pad.
- headline: one specific line about what this person actually builds (from their real projects/languages).
- role: a short, accurate title (e.g. "Machine learning engineer", "Frontend developer").
Return ONLY JSON: {"headline": string, "role": string, "projects": [{"name": string, "blurb": string}]}.`;

async function liveFacts(
  profile: RawProfile,
): Promise<{ out: FactsOutput; usage: UsageRecord }> {
  const context = {
    bio: profile.user.bio,
    repos: profile.repos.map((r) => ({
      name: r.name,
      description: r.description,
      topics: r.topics,
      primaryLanguage: r.primaryLanguage?.name ?? null,
      readme: compactReadme(r.readme),
      fileTree: r.readme ? undefined : r.fileTree.slice(0, 20),
      deps: r.manifest?.deps,
    })),
  };

  const msg = await anthropic().messages.create({
    model: MODELS.facts,
    max_tokens: 1500,
    system: FACTS_SYSTEM,
    messages: [{ role: "user", content: JSON.stringify(context) }],
  });

  const usage = buildUsageRecord("facts (Haiku)", MODELS.facts, msg.usage);
  logUsage(usage);

  const raw: unknown = JSON.parse(textOf(msg));
  return { out: factsOutputSchema.parse(raw), usage };
}

// ---- assembly ----

export async function buildFacts(
  profile: RawProfile,
): Promise<{ data: ProfileData; usage: UsageRecord | null }> {
  const languages = aggregateLanguages(profile.repos);
  const stats = pickStats(profile);

  let out: FactsOutput;
  let usage: UsageRecord | null = null;
  if (isMock) {
    out = mockFacts(profile, languages);
  } else {
    try {
      const r = await liveFacts(profile);
      out = r.out;
      usage = r.usage;
    } catch {
      out = mockFacts(profile, languages); // graceful fallback on bad model output
    }
  }

  const blurbByName = new Map(out.projects.map((p) => [p.name, p.blurb]));

  const projects: Project[] = profile.repos.map((r) => ({
    name: r.name,
    blurb:
      blurbByName.get(r.name) ??
      r.description ??
      `A ${r.primaryLanguage?.name ?? "software"} project.`,
    tech: repoTech(r),
    stars: r.stargazerCount > 0 ? r.stargazerCount : undefined,
    demoUrl: r.homepageUrl ?? undefined,
    repoUrl: r.url,
  }));

  const data: ProfileData = {
    identity: {
      name: profile.user.name ?? profile.user.login,
      headline: out.headline,
      role: out.role,
      location: profile.user.location ?? undefined,
      links: buildIdentityLinks(profile),
    },
    languages,
    stats,
    projects,
  };

  return { data: profileDataSchema.parse(data), usage };
}
