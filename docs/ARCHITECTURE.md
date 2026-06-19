# PortHub — Architecture

## 0. The core model: the LLM generates the UI

PortHub does **not** use fixed templates. To produce bespoke, interactive, animated designs
that match each user's stated vibe, **the LLM generates the actual page** (HTML + Tailwind +
CSS + JS, animations, interactive background). Deterministic code never designs anything — it
only (a) prepares the data and (b) safely renders/stores what the model generates.

Two layers, and the split is the whole architecture:

- **Layer 1 — Facts (`ProfileData`):** cheap, deterministic + a small model. Curates the
  user's best work into a small structured object. This is "compaction".
- **Layer 2 — Design (generated `code`):** the creative Opus call. Takes `ProfileData` + the
  vibe sentence and emits a single self-contained interactive page.

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
| Generated page | **Self-contained HTML** (Tailwind Play CDN + CSS + JS, optional CDN anim lib) | No build step; render + export as one file |
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
      sites/[slug]/page.tsx      # REWRITE TARGET: renders generated code in a sandboxed iframe
      sites/[slug]/opengraph-image.tsx
      api/
        generate/route.ts        # streaming pipeline (SSE)
        trpc/[trpc]/route.ts
        stripe/webhook/route.ts   # (Phase 4)
    server/
      github/                    # GraphQL query + select/compact (deterministic)
      llm/
        facts.ts                 # Layer 1: Haiku blurbs → ProfileData
        design.ts                # Layer 2: Opus → self-contained page
        render-check.ts          # parses/validates generated output; retry once
      profile/                   # ProfileData (Zod), data-injection + export helpers
  prisma/schema.prisma
  docs/
```

## 4. The generation engine (core IP)

```
username + vibe
  └─▶ [GitHub GraphQL fetch]      server/github/fetch.ts     (cache by username)
       └─▶ [select + compact]     server/github/select.ts    (≤8 repos, README-or-not)
            └─▶ [Haiku → ProfileData]  server/llm/facts.ts    (cheap, structured FACTS)
                 └─▶ [Opus → page]     server/llm/design.ts   (bespoke interactive HTML)
                      └─▶ [render-check]server/llm/render-check.ts (retry once if broken)
                           └─▶ persist Portfolio{profileData, vibe, code}, slug = nanoid()
                                └─▶ /sites/<slug> renders code in a sandboxed iframe
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

### Layer 2 — Design (generated `code`): the creative magic

One Opus call: `ProfileData` + vibe → a **single self-contained interactive page.**

- The **system prompt bakes in the design DNA**: always interactive, animated, with a living
  background, micro-interactions, custom typography, strong layout — and **explicitly anti-
  AI-slop** (no Inter/Roboto defaults, no purple-on-white gradients, no cookie-cutter layouts).
- The **vibe sentence steers the whole aesthetic** ("dark hacker terminal, neon green" →
  monospace, scanlines, terminal chrome, animated grid).
- **Output discipline (the cost lever):** Tailwind Play CDN (write classes, not CSS blocks);
  data **injected as `const DATA = ProfileData`** so output tokens go to *design*, not content;
  one file; prefer CSS/canvas for backgrounds, a CDN lib (e.g. three.js) only when it elevates.
- **render-check:** parse the output; if it's broken/empty, regenerate once. Replaces the old
  "quality gate."

### Model strategy & cost (target < $0.30 / first generation)

In the generative approach **output tokens dominate** (the model writes code):

| Layer | Model | Tokens | Cost |
|---|---|---|---|
| Facts | `claude-haiku-4-5` | ~3K in / ~0.4K out | ~$0.005 |
| Design | `claude-opus-4-8` | ~4K in / ~6K out | ~$0.17 |
| **Per portfolio** | | | **~$0.18** (under budget) |

- **Start Opus 4.8** (design quality = the entire product). **A/B `claude-sonnet-4-6`**
  (~$0.10) and keep it if the wow holds.
- **Levers to stay under 30¢:** Tailwind CDN, data-injection, one-file scope, model choice.
- **What blows the budget:** feeding full READMEs to Opus, or letting the page balloon. Both
  controlled by Layer 1 compaction + output discipline. (Fable is out — output pricing too high.)

## 5. `ProfileData` (the contract — Zod)

The editable facts layer. The generated page reads it as injected `DATA`.

```
ProfileData {
  identity   { name, headline, role, location, links{github,site,x,email} }
  languages  [{ label, share }]                 // aggregated + deduped
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
             vibe(String), profileData(Json), code(Text),
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
