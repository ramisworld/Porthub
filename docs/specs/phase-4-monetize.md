# Phase 4 — Monetize & Own: Stripe, custom domains, code export

**Goal:** Turn the differentiators into revenue and the ownership promise into reality.
Custom domains and branding behind a paywall; download-the-code for true ownership.

## In scope
- **Stripe** subscription (Pro): Checkout + billing portal + webhook → `User.plan`.
- **Custom domain** flow (Pro): user adds CNAME → app attaches via Vercel Domains API →
  set `Portfolio.customDomain`. **Reuses the Phase 1 `middleware.ts`** — a verified custom
  domain is just another Host mapped to the slug; no new routing needed.
- **Remove "Made with PortHub"** branding for Pro (free keeps it — the viral loop).
- **Code export**: the generated `code` (with `DATA` injected) **is already a self-hostable
  site** — bundle it (single HTML, or + assets) and zip for download. The ownership headline,
  near-free because we generate code, not a template render.
- Gating: free = subdomain + branding; Pro = custom domain + no branding + export + private.

## Out of scope
Teams/orgs, analytics dashboards, multi-portfolio Pro tiers (future).

## Deliverables
- `app/api/stripe/webhook/route.ts` + `server/api/routers/billing.ts` (checkout, portal).
- Custom-domain attach/verify flow + Vercel Domains API integration.
- `server/portfolio/export.ts` — server-render template to static files → zip.
- Pro gating across UI (branding, domain, export, private).

## Key tasks
1. Stripe products/prices; Checkout + portal; webhook updates `User.plan`.
2. Custom-domain UI: instructions, CNAME verification, Vercel attach, persist `customDomain`.
3. Branding component reads plan; hidden for Pro.
4. Export: static render of the chosen template + assets → downloadable zip.
5. Enforce gates server-side (not just UI).

## Acceptance criteria
- [ ] Upgrade via Stripe flips `User.plan` to `pro` (verified by webhook).
- [ ] Pro user attaches a custom domain and the portfolio serves on it.
- [ ] "Made with PortHub" is present on free, absent on Pro.
- [ ] Export produces a working, self-hostable site that matches the live one.
- [ ] All Pro features are enforced server-side.

## Risks
- Domain attach/SSL propagation UX → clear pending/verifying states.
- Export fidelity → moot by design: the live portfolio *is* the generated file, so the export
  matches it. Only watch CDN deps (Tailwind/anim libs) — document them or inline for offline use.
