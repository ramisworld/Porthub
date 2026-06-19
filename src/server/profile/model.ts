import { z } from "zod";

/**
 * ProfileData — the editable "facts" layer (see docs/ARCHITECTURE.md §5).
 *
 * Built by Layer 1 (deterministic select + Haiku condense), stored on
 * Portfolio.profileData, and injected into the generated page as `const DATA`.
 * The LLM writes content into this shape; it never designs layout.
 */

export const linksSchema = z.object({
  github: z.string().url().optional(),
  site: z.string().url().optional(),
  x: z.string().url().optional(),
  email: z.string().email().optional(),
});

export const languageSchema = z.object({
  label: z.string(),
  /** 0–100, aggregated + deduped share of bytes across repos. */
  share: z.number().min(0).max(100),
});

export const statSchema = z.object({
  /** Pre-formatted, flattering-but-true (never a zero). e.g. "1.2k", "6", "2023". */
  value: z.string(),
  label: z.string(),
});

export const projectSchema = z.object({
  name: z.string(),
  /** 1–2 sentence, grounded blurb (from README intro / topics / manifest). */
  blurb: z.string(),
  tech: z.array(z.string()),
  stars: z.number().int().nonnegative().optional(),
  demoUrl: z.string().url().optional(),
  repoUrl: z.string().url(),
});

export const profileDataSchema = z.object({
  identity: z.object({
    name: z.string(),
    headline: z.string(),
    role: z.string(),
    location: z.string().optional(),
    links: linksSchema,
  }),
  languages: z.array(languageSchema),
  stats: z.array(statSchema),
  projects: z.array(projectSchema).max(8),
});

export type Links = z.infer<typeof linksSchema>;
export type Language = z.infer<typeof languageSchema>;
export type Stat = z.infer<typeof statSchema>;
export type Project = z.infer<typeof projectSchema>;
export type ProfileData = z.infer<typeof profileDataSchema>;
