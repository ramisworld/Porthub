# PortHub — Architecture

## 0. The core model: facts + art direction + a shared premium engine

PortHub no longer asks the LLM to write full HTML/CSS/JS for every portfolio. That approach
was expensive, brittle, and too dependent on one model call getting layout, animation,
accessibility, and performance right at the same time.

The product now has three layers:

- **Layer 1 — Facts (`ProfileData`):** deterministic GitHub scraping + a small model. Curates the
  user's best work into a small structured object. This is "compaction".
- **Layer 2 — Art direction (`DesignSpec`):** a tiny JSON recipe. The model picks palette,
  typography, motion, WebGL scene, boot treatment, component skins, and an **experience pack**.
- **Layer 3 — Shared engine:** hand-built PortHub code renders `ProfileData + DesignSpec` into
  the actual interactive portfolio. This is where the design quality lives.

The engine is the core IP. It ships once as `public/engine/<version>.js/.css` and every portfolio
references that shared bundle. Existing portfolios store only the recipe, so engine upgrades can
improve old portfolios without regenerating code.

### Experience packs

PortHub should feel like a catalogue of living worlds, not a template with different colors.
Each experience pack owns the whole composition: loader, navigation, section naming, typography,
layout rhythm, project cards, contact treatment, scroll choreography, cursor behavior, and the
WebGL/canvas scene contract.

Examples:

- `terminalNexus` — cyber terminal, side telemetry, reactive particles, command-line modules.
- `directorCut` — cinematic letterbox, scene/take boot slate, timeline scrubber, act-based layout.
- `desktopOS` — draggable-feeling app windows, dock/taskbar, filesystem metaphors.
- `gameHud` — player card, ability tree, inventory, quest log, rank/XP language treatment.
- `liquidGlass` — refractive glass, editorial spacing, fluid cards, premium calm motion.

The art-director LLM should choose an experience pack; it should not invent implementation details.
Variety comes from pack x scene x palette x typography x content x motion parameters.

## 1. Stack (T3-inspired, opinionated)

Scaffold with **`create-t3-app`**, then swap auth to Clerk and add the rest.

| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js 15, App Router, TypeScript** | SSR, OG images, host-based multi-tenant routing |
| Styling (app UI) | **Tailwind + shadcn/ui** | The PortHub app chrome (not the generated portfolios) |
| Data layer | **tRPC** + **one streaming Route Handler** (generate) | Typed mutations; SSE for the live build log |
| DB | **PostgreSQL** — Docker (local) / Neon (prod) + **Prisma** | Reproducible local DB; serverless prod |
| Auth | **Clerk — Phase 2** (Phase 1 generates anonymously) | Don't gate the payoff |
| Facts model (Layer 1) | **`claude-haiku-4-5`** + deterministic code | Cheap repo→blurb condensing |
| Design model (Layer 2) | **`claude-opus-4-8`** (A/B `claude-sonnet-4-6`) | Strong design instincts, low AI-slop |
| Portfolio runtime | **Shared engine bundle** (`public/engine/v*.js/.css`) | Rich hand-built interactions, cached once, cheap generations |
| Rendering | **Sandboxed `<iframe srcdoc>`** (`allow-scripts`, NOT `allow-same-origin`) | Untrusted generated JS can't touch the app |
| GitHub | **`@octokit/graphql`**, server-side token | One query, 5,000 req/hr |
| Multi-tenant routing | **`middleware.ts`** host rewrite + wildcard domain | `<slug>.localhost:3000` / `<slug>.porthub.app` |
| Payments | **Stripe** | Custom-domain / branding / Pro |
| Hosting | **Vercel** + wildcard `*.porthub.app` | Per-portfolio subdomains; custom domains via API |
| IDs | **`nanoid`** | The unguessable `slug` subdomain |
| Validation | **Zod** | `ProfileData` contract |

### Local development (Docker)

- **Postgres runs in Docker locally** via `docker-compose.yml`; Prisma uses its `DATABASE_URL`.
- **App runs natively** (`pnpm dev`) for fast HMR — not containerized.
- **Prod:** Neon for the DB, Vercel for the app (Vercel builds its own image; no app Dockerfile).
- Containerize the app later only if self-hosting away from Vercel.

## 2. Multi-tenant / subdomain routing (local-first)

```
Request ──▶ middleware.ts  (reads Host header)
   ├─ Host == ROOT_DOMAIN        → serve the app (marketing / dashboard / editor)
   └─ Host == <slug>.ROOT_DOMAIN → rewrite to /sites/<slug>  (render the generated page)
```

- **Local:** browsers auto-resolve `*.localhost` → `127.0.0.1` (no `/etc/hosts`). `<slug>.localhost:3000` works out of the box. `NEXT_PUBLIC_ROOT_DOMAIN=localhost:3000`.
- **Prod:** wildcard `*.porthub.app` → Vercel → same middleware. `NEXT_PUBLIC_ROOT_DOMAIN=porthub.app`.
- **Preview** builds `http(s)://<slug>.${ROOT_DOMAIN}` — identical dev↔prod.
- **`rewrite`, not redirect** — subdomain stays in the URL bar. Reserve `www`, `app`, `api`.
- **Phase 4 custom domains** reuse this: a verified domain is just another Host mapped to a slug.

## 3. Repo layout (target)

```
porthub/
  docker-compose.yml             # local Postgres
  src/
    middleware.ts                # host-based subdomain rewrite
    app/
      (marketing)/page.tsx       # landing: username + vibe inputs (+ later gallery)
      (app)/
        generate/page.tsx        # live build-log screen (SSE)
        dashboard/page.tsx       # (Phase 2) user's portfolios
        edit/[id]/page.tsx       # (Phase 2) ProfileData editor
      sites/[slug]/page.tsx      # REWRITE TARGET: renders recipe through shared engine in sandboxed iframe
      sites/[slug]/opengraph-image.tsx
      api/
        generate/route.ts        # streaming pipeline (SSE)
        trpc/[trpc]/route.ts
        stripe/webhook/route.ts   # (Phase 4)
    server/
      github/                    # GraphQL query + select/compact (deterministic)
      llm/
        facts.ts                 # Layer 1: Haiku blurbs → ProfileData
        design.ts                # Layer 2: art director → tiny DesignSpec JSON
      profile/                   # ProfileData (Zod), data-injection + export helpers
    engine/
      spec.ts                    # DesignSpec contract and registries
      runtime/                   # browser DOM builders, packs, skins, fallback backgrounds
      premium/                   # Three.js, GSAP, boot screens, cursor, scroll choreography
  prisma/schema.prisma
  docs/
```

## 4. The generation engine (core IP)

```
username + vibe
  └─▶ [GitHub GraphQL fetch]      server/github/fetch.ts     (cache by username)
       └─▶ [select + compact]     server/github/select.ts    (≤8 repos, README-or-not)
            └─▶ [Haiku → ProfileData]  server/llm/facts.ts    (cheap, structured FACTS)
                 └─▶ [Art director → DesignSpec] server/llm/design.ts
                      └─▶ persist Portfolio{profileData, designSpec, engineVersion, slug}
                           └─▶ /sites/<slug> renders the shared engine in a sandboxed iframe
```

### Layer 1 — Facts (`ProfileData`): what "compaction" means

Deterministic selection + a cheap Haiku condense. Never feeds raw GitHub to Opus.

- **Repo selection:** score every repo (stars + recency + pinned + topics + has-demo +
  description quality − fork/archived/tutorial). Take the **top 8**; if the user has fewer than
  8 real repos, **include them all.**
- **Signal per repo:** description, topics, language breakdown, stars, demo URL, and the README
  **intro section only** (strip badges/TOC/install/license, cap ~400 tokens).
- **No-README repos still qualify:** use description + topics + languages + top-level file tree
  + `package.json`/`pyproject` (name, deps). A starred README-less repo can outrank a documented
  trivial one.
- **Haiku condense:** turn each repo's signals into a tight 1–2 sentence blurb (~$0.005 total).
- Output is the structured `ProfileData` (Section 5) — the durable, editable layer.

### Layer 2 — Art direction (`DesignSpec`)

One small model call: `ProfileData + vibe -> DesignSpec`.

The model chooses from strict registries:

- `experience`: full-page world/composition.
- `webgl.scene`: reusable premium scene module.
- `theme`, `typography`, `skins`, `motion`, `cursor`, `boot`, `postfx`.
- optional bounded `signatureCss` for tiny visual flourishes only.

The model must not write HTML or arbitrary JS. That keeps generation cheap and keeps the visual
quality in code we can test.

### Layer 3 — Shared engine

The engine renders the portfolio in the iframe. It contains:

- DOM renderers for each experience pack.
- Premium WebGL scenes using Three.js shaders, particles, bloom, chromatic shift, and scroll-driven
  uniforms.
- GSAP choreography: ScrollTrigger timelines, ScrollSmoother, ScrambleText, hover/cursor effects,
  section-aware nav, and per-pack animation hooks.
- 2D fallbacks and reduced-motion paths.
- A stable component vocabulary for stats, abilities, projects, contact, and identity.

### Model strategy & cost

In the shared-engine approach, output tokens are tiny because the model writes only JSON:

| Layer | Model | Tokens | Cost |
|---|---|---|---|
| Facts | `claude-haiku-4-5` | ~3K in / ~0.4K out | ~$0.005 |
| Art direction | small/medium model | ~2K in / ~0.5K out | ~2-3 cents target |
| **Per portfolio** | | | **low cents target** |

- **The cost lever is the engine:** invest engineering time in reusable premium packs instead of
  paying models to retype UI code.
- **The quality lever is pack depth:** every pack needs its own layout rules, not just a theme.
- **What blows the product:** generic grids, generic bars, generic cards, and background-only wow.

## 5. `ProfileData` (the contract — Zod)

The editable facts layer. The generated page reads it as injected `DATA`.

```
ProfileData {
  identity   { name, headline, role, location, links{github,site,x,email} }
  languages  [{ label, share }]                 // aggregated + deduped; share is not displayed as skill grade
  abilities  [{ label, source?, weight? }]       // derived from languages/topics/deps; rendered as skills/abilities
  stats      [{ value, label }]                 // flattering-but-true, never a zero
  projects   [{ name, blurb, tech[], stars?, demoUrl?, repoUrl }]   // ≤ 8
}
```

Editing `ProfileData` updates the injected `DATA` (free, no regeneration). Restyling
regenerates `code`. Export bundles `code` + `DATA` into a self-hostable file.

## 6. Data model (Prisma)

```
User       { id(Clerk), plan(free|pro), createdAt }                 // Phase 2
Portfolio  { id, ownerId?, githubUsername, slug(unique),
             vibe(String), profileData(Json), designSpec(Json), engineVersion(String), code(Text? legacy),
             isPublic, customDomain?, views, createdAt }
GitHubCache{ username(unique), raw(Json), fetchedAt }               // TTL for rate limits
```

Phase 1 portfolios are anonymous (`ownerId = null`); Phase 2 claims them on signup.

## 7. Security & limits

- **Generated code is untrusted** → render only in a sandboxed `<iframe srcdoc>` with
  `allow-scripts` and **without** `allow-same-origin`. Never `dangerouslySetInnerHTML` into the app.
- GitHub token server-side only; per-username cache + TTL.
- README markdown sanitized before it reaches any model context.
- Rate-limit `api/generate` per IP/user.
- Middleware rewrites (not redirects); reserve root subdomains.
