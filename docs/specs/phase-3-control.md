# Phase 3 — Creative Control & Loop: ask-AI restyle, variations, gallery

**Goal:** Give users fine creative control over the generated design, plus the viral loop.
(Facts editing + full restyle shipped in Phase 2.)

## In scope
- **Ask AI to modify (targeted):** natural-language tweaks to the *design* without a full
  rebuild — e.g. "make the background more alive", "bigger hero", "warmer palette", "add a
  marquee of my languages". Re-runs the design call with the current `code` + instruction.
- **Variations:** generate 2–3 design options from the same `ProfileData` + vibe; user picks.
- **Vibe remix:** edit the vibe sentence and regenerate (e.g. "now make it brutalist").
- **Public gallery** on the landing page: recent public portfolios (live previews), gated on a
  completeness bar. Polished OG images for shareability.

## Out of scope
Stripe, custom domains, code export UI (Phase 4).

## Deliverables
- tRPC `portfolio.aiRestyle(instruction)`, `portfolio.variations()`, `portfolio.remixVibe(vibe)`.
- `server/llm/restyle.ts` — instruction + current `code` → revised page; render-check + retry.
- `server/api/routers/gallery.ts` — `recentPublic`; gallery component on landing.

## Key tasks
1. `aiRestyle`: feed current `code` + instruction to Opus → revised page; validate; keep `DATA` intact.
2. `variations`: N design samples (cost-aware — cap N, reuse `ProfileData`); selection UI.
3. `remixVibe`: update `vibe`, regenerate design.
4. Gallery query + component; enforce a completeness bar before listing.

## Acceptance criteria
- [ ] "Ask AI" applies a targeted design change and still renders (post render-check).
- [ ] Variations produce visibly distinct options from one `ProfileData`.
- [ ] Editing the vibe regenerates a coherently different design.
- [ ] Landing gallery shows real, clickable public portfolios above the bar.

## Risks
- Restyle cost (each is a generation) → show estimated/again-cost, cap variations, prefer facts-edit
  for content changes.
- Drift/breakage on iterative restyles → always render-check; offer "revert to previous code".
- Gallery quality → completeness bar before listing.
