# Phase 2 — Accounts & Editing: claim + edit (facts edit free, restyle on demand)

**Goal:** Let users keep and control what Phase 1 generated. Accounts, claim, and editing —
built around the two-layer split so text edits are **free** and restyles are deliberate.

## In scope
- **Clerk** auth + `User` model.
- **Claim flow:** the anonymous Phase-1 `Portfolio` (slug in session) is attached to the account
  on signup (`ownerId`). Fallback: re-enter username to match/claim.
- **Facts editor** (`edit/[id]`): form over `ProfileData` — name, headline, blurbs, links,
  project order. Saving updates the injected `DATA` in the stored `code` → **no regeneration cost**.
- **Restyle (regenerate design):** a button that re-runs the Opus design call (new `code`) — used
  sparingly, since it costs a generation. Confirm before overwrite.
- **Dashboard:** list the user's portfolios; Preview opens the subdomain; publish/unpublish.

## Out of scope
"Ask AI" targeted edits, extra style controls, gallery curation, Stripe, custom domains, export UI.

## Deliverables
- `User` model; Clerk middleware (protect `/dashboard`, `/edit`; keep `/`, `/sites/*`, `/api/generate` public).
- `server/profile/inject.ts` — re-inject edited `ProfileData` into `code` without an LLM call.
- tRPC `portfolio`: `claim`, `get`, `updateFacts` (patch ProfileData + re-inject), `restyle`, `list`, `setPublic`.
- `app/(app)/dashboard/page.tsx`, `app/(app)/edit/[id]/page.tsx`.

## Key tasks
1. Add Clerk; upsert `User` on sign-in.
2. Claim: attach the session's anonymous portfolio to `ownerId` (or match by username).
3. Facts editor form from `ProfileData`; on save → patch + `inject` → updated `code`.
4. Restyle button → `restyle` (Opus design call) with an explicit "replaces current design" confirm.
5. Dashboard list + Preview + publish toggle.

## Acceptance criteria
- [ ] A Phase-1 anonymous portfolio can be **claimed** by creating an account.
- [ ] Editing a fact updates the live subdomain after save **without** an LLM call (data re-inject).
- [ ] Restyle regenerates the design and confirms before overwriting.
- [ ] Dashboard lists portfolios; Preview opens the subdomain.

## Risks
- Data-injection reliability (model must read `const DATA`) → enforce/validate the `DATA` contract at
  generation; if a page inlined content instead, fall back to "restyle" for edits.
- Lost session before claim → username-match fallback.
