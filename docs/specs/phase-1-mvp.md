# Phase 1 — Magic MVP: username + vibe → generated interactive portfolio (no auth)

**Goal:** The pure magic. Land → type a GitHub username → describe the vibe → loading screen →
**a bespoke, interactive, animated portfolio the LLM generated**, live on a subdomain. No auth,
no editor. Target cost **~$0.18** / generation (hard ceiling $0.30).

## In scope
- `create-t3-app` scaffold (Next 15 App Router, TS, Tailwind, Prisma, tRPC) + shadcn.
- **`docker-compose.yml`** with local Postgres; Prisma (`Portfolio`, `GitHubCache`). No auth/`User` yet.
- Landing: GitHub username input + **free-text vibe field** (typewriter-placeholder examples). No presets.
- **Layer 1 (Facts):** GitHub GraphQL fetch + deterministic select (**≤8 repos, all if fewer**,
  README-or-not) + **Haiku** condense → `ProfileData` (Zod).
- **Layer 2 (Design):** one **Opus** call → a **self-contained interactive HTML page** (Tailwind
  CDN + CSS + JS, animated/interactive background) reading injected `DATA`. System prompt bakes in
  the interactive/animated/anti-AI-slop design DNA; vibe steers the aesthetic.
- **render-check:** parse generated output; regenerate once if broken.
- Streaming `api/generate` Route Handler → live build-log screen (fetch → curate → write → design).
- **`middleware.ts` subdomain routing** → `/sites/[slug]`, which renders `code` in a **sandboxed
  iframe** (`allow-scripts`, no `allow-same-origin`).
- Dynamic OG image. Anonymous `Portfolio{vibe, profileData, code}` persisted with `slug = nanoid()`.

## Out of scope (later)
Auth/accounts, editor, "ask AI" restyle, regenerate UI, data-injection edit loop, gallery, Stripe, custom domains, export UI.

## Deliverables
- `docker-compose.yml`; `prisma/schema.prisma` (`Portfolio` ownerId-nullable, `GitHubCache`).
- `src/middleware.ts` — host → `/sites/<slug>` rewrite.
- `server/github/{fetch,select}.ts` — query + ≤8-repo selection + README-intro extraction + no-README signal (file tree / manifest).
- `server/profile/model.ts` — `ProfileData` Zod schema.
- `server/llm/facts.ts` — Haiku repo→blurb → `ProfileData`.
- `server/llm/design.ts` — Opus system prompt (design DNA + anti-slop) → self-contained page; data injected as `const DATA`.
- `server/llm/render-check.ts` — validate/retry.
- `app/api/generate/route.ts` — SSE pipeline emitting status + final slug.
- `app/(marketing)/page.tsx` — username + vibe inputs.
- `app/(app)/generate/page.tsx` — build-log screen.
- `app/sites/[slug]/page.tsx` (sandboxed iframe) + `opengraph-image.tsx`.

## Key tasks
1. Scaffold T3 + shadcn; `docker-compose` Postgres; env (`DATABASE_URL`, `ANTHROPIC_API_KEY`,
   `GITHUB_TOKEN`, `NEXT_PUBLIC_ROOT_DOMAIN=localhost:3000`).
2. `middleware.ts`: subdomain Host → rewrite `/sites/<slug>`; root Host → app.
3. `ProfileData` (Zod): identity, languages, stats, projects (≤8).
4. GitHub fetch (GraphQL): profile, pinned + top repos, languages w/ sizes, topics, READMEs, contributions.
5. Select + compact: score & take ≤8 repos (all if fewer); extract README intro; gather no-README signal.
6. Haiku facts: repo signals → 1–2 sentence blurbs → assemble `ProfileData`. Pick 3 flattering-true stats.
7. Opus design: system prompt (interactive, animated, living background, micro-interactions, custom
   type, **anti-AI-slop**) + `ProfileData` + vibe → one self-contained HTML page reading `const DATA`.
8. render-check: parse; retry once on failure.
9. `/sites/[slug]` renders `code` in a sandboxed iframe; OG image.
10. Streaming Route Handler + build-log UI; persist `Portfolio` (anonymous) with `nanoid` slug.
11. **Verify cost** of a real generation ≤ $0.30 (expect ~$0.18); log token usage per layer.

## Acceptance criteria
- [ ] `ramisworld` + "dark hacker terminal, neon green, minimal" → a **distinctly that-vibe**,
      interactive, animated portfolio live at `<slug>.localhost:3000` in < ~25s.
- [ ] Two different vibes on the same username produce **visibly different** designs.
- [ ] Languages **deduped/aggregated**; **no "0 stars"**; a **README-less but good repo** is featured.
- [ ] Project copy references **real** signals (no banned filler).
- [ ] Generated page renders **only** inside the sandboxed iframe; broken output auto-retries once.
- [ ] Measured generation cost ≤ $0.30 (target ~$0.18); per-layer token usage logged.
- [ ] Renders correctly on desktop + mobile, with a correct OG image.

## Risks
- **Reliability of generated code** → render-check + one retry; keep scope to one file; bound output.
- **Cost creep from large pages** → Tailwind CDN + data-injection + output caps + model A/B (Sonnet).
- **Sparse GitHub** → stat-selection + careful non-hallucinated blurbs (Haiku) + low-signal tone.
- `*.localhost`: fine in browsers; document `--resolve` for CLI testing.
- GitHub rate limits → server token + `GitHubCache` TTL.
