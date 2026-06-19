import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    // GitHub PAT (public read) for the GraphQL fetch. Used live even in mock mode.
    // Optional at the env layer so the app boots without it; fetch.ts validates at call time.
    GITHUB_TOKEN: z.string().optional(),
    // Anthropic key. Optional in Phase 1 (MOCK_LLM short-circuits all model calls).
    ANTHROPIC_API_KEY: z.string().optional(),
    // When "true", facts (Haiku) and design (Opus) calls are stubbed — zero token spend.
    MOCK_LLM: z.enum(["true", "false"]).default("true"),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // Root domain for subdomain routing + Preview links. `localhost:3000` in dev.
    NEXT_PUBLIC_ROOT_DOMAIN: z.string().default("localhost:3000"),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    MOCK_LLM: process.env.MOCK_LLM,
    NEXT_PUBLIC_ROOT_DOMAIN: process.env.NEXT_PUBLIC_ROOT_DOMAIN,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
