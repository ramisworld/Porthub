/**
 * Issuer registry — single source of truth for credential issuers.
 *
 * Each entry pairs a display label and brand color with an icon-only SVG
 * (no wordmark, no company name). The registry is consumed by:
 *
 *   • the dashboard credentials editor (React, this file via import), and
 *   • the engine runtime (iframe, via src/engine/runtime/issuers.entry.ts
 *     which bundles this module through esbuild at engine-build time).
 *
 * Order matters — entries are listed from most-recognised tech brand to
 * niche cert orgs / learning platforms, so the editor dropdown surfaces the
 * issuers users are most likely to pick at the top without needing to search.
 *
 * SVGs are simplified geometric reconstructions of each brand's icon mark
 * (no wordmarks), drawn with primitives so the file stays under a few KB.
 * Brand owners' usage guidelines apply when shipped in production.
 */

export type IssuerMeta = {
  key: string;
  label: string;
  /** Brand accent color, drives the card's edge glow on the rendered card. */
  color: string;
  /** Inline SVG markup (icon-only, viewBox="0 0 24 24"). */
  svg: string;
};

const wrap = (inner: string): string =>
  `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`;

export const ISSUERS: ReadonlyArray<IssuerMeta> = [
  // ── Hyperscalers + biggest tech brands ─────────────────────────────────
  {
    key: "aws",
    label: "Amazon Web Services",
    color: "#FF9900",
    svg: wrap(
      '<rect x="1" y="1" width="22" height="22" rx="3" fill="#232F3E"/>' +
        // The signature AWS "smile" with an arrowhead at the right tip.
        '<path d="M4.5 15.6c4.6 2.6 10.4 2.6 15 0" stroke="#FF9900" stroke-width="2.2" stroke-linecap="round" fill="none"/>' +
        '<path d="M17.2 14.4l2.3 1.2-1 2.1" stroke="#FF9900" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
    ),
  },
  {
    key: "microsoft",
    label: "Microsoft",
    color: "#0078D4",
    svg: wrap(
      '<rect x="1" y="1" width="10" height="10" fill="#F25022"/>' +
        '<rect x="13" y="1" width="10" height="10" fill="#7FBA00"/>' +
        '<rect x="1" y="13" width="10" height="10" fill="#00A4EF"/>' +
        '<rect x="13" y="13" width="10" height="10" fill="#FFB900"/>',
    ),
  },
  {
    key: "google",
    label: "Google",
    color: "#4285F4",
    svg: wrap(
      '<path fill="#4285F4" d="M22.5 12.27c0-.78-.07-1.53-.2-2.27H12v4.3h5.92a5.07 5.07 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.11z"/>' +
        '<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.05-3.72 1.05-2.86 0-5.28-1.93-6.15-4.52H2.18v2.84A11 11 0 0 0 12 23z"/>' +
        '<path fill="#FBBC05" d="M5.85 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18A10.98 10.98 0 0 0 1 12c0 1.78.43 3.46 1.18 4.95l3.67-2.84z"/>' +
        '<path fill="#EA4335" d="M12 5.38c1.62 0 3.07.56 4.21 1.65l3.15-3.15C17.46 2.1 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.67 2.84C6.72 7.3 9.14 5.38 12 5.38z"/>',
    ),
  },
  {
    key: "google-cloud",
    label: "Google Cloud",
    color: "#4285F4",
    svg: wrap(
      // Four-color cloud quadrants — the modern GCP mark.
      '<path d="M12 5.6 L17.4 8.8 L12 12 L12 5.6 Z" fill="#EA4335"/>' +
        '<path d="M17.4 8.8 L17.4 15.2 L12 12 L17.4 8.8 Z" fill="#FBBC05"/>' +
        '<path d="M17.4 15.2 L12 18.4 L12 12 L17.4 15.2 Z" fill="#34A853"/>' +
        '<path d="M12 18.4 L6.6 15.2 L12 12 L12 18.4 Z" fill="#4285F4"/>' +
        '<path d="M6.6 15.2 L6.6 8.8 L12 12 L6.6 15.2 Z" fill="#4285F4"/>' +
        '<path d="M6.6 8.8 L12 5.6 L12 12 L6.6 8.8 Z" fill="#EA4335"/>',
    ),
  },
  {
    key: "meta",
    label: "Meta",
    color: "#1877F2",
    svg: wrap(
      '<defs><linearGradient id="m-g" x1="0" y1="0" x2="1" y2="0">' +
        '<stop offset="0%" stop-color="#0064E0"/>' +
        '<stop offset="50%" stop-color="#0098FF"/>' +
        '<stop offset="100%" stop-color="#00C2FF"/>' +
        "</linearGradient></defs>" +
        // Continuous infinity-style ribbon — Meta's primary identity mark.
        '<path d="M3 14.5c0-3.6 2-7 5-7 2.5 0 4.2 1.9 6 4.6 1.6 2.4 2.7 4 4 4 1.5 0 2.5-1.4 2.5-3.6 0-2.5-1.4-4.5-3.4-4.5-1.7 0-3.1 1.4-4.6 3.6" ' +
        'stroke="url(#m-g)" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
    ),
  },
  {
    key: "openai",
    label: "OpenAI",
    color: "#10A37F",
    svg: wrap(
      // OpenAI's mark is a hub/blossom of three interlocking ovals forming
      // six petals around a center hub. Three overlapping ellipses rotated
      // 60° each gives the recognised silhouette.
      '<rect x="1" y="1" width="22" height="22" rx="5" fill="#10A37F"/>' +
        '<g fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round">' +
        '<ellipse cx="12" cy="12" rx="6.4" ry="3"/>' +
        '<ellipse cx="12" cy="12" rx="6.4" ry="3" transform="rotate(60 12 12)"/>' +
        '<ellipse cx="12" cy="12" rx="6.4" ry="3" transform="rotate(120 12 12)"/>' +
        "</g>",
    ),
  },
  {
    key: "anthropic",
    label: "Anthropic",
    color: "#CC785C",
    svg: wrap(
      // Anthropic's mark is a warm-tan asterisk burst on a cream surface —
      // eight tapered arms meeting at the center. Four crossed ellipses
      // give the recognisable starburst silhouette.
      '<rect x="1" y="1" width="22" height="22" rx="5" fill="#F0EEE6"/>' +
        '<g fill="#181818">' +
        '<ellipse cx="12" cy="12" rx="1.3" ry="8.5"/>' +
        '<ellipse cx="12" cy="12" rx="1.3" ry="8.5" transform="rotate(45 12 12)"/>' +
        '<ellipse cx="12" cy="12" rx="1.3" ry="8.5" transform="rotate(90 12 12)"/>' +
        '<ellipse cx="12" cy="12" rx="1.3" ry="8.5" transform="rotate(135 12 12)"/>' +
        "</g>",
    ),
  },
  {
    key: "ibm",
    label: "IBM",
    color: "#0F62FE",
    svg: wrap(
      // IBM's "8-bar" mark — eight horizontal stripes that form the IBM
      // letterforms. We keep them as plain bars (no negative space cut for
      // the letters) — recognisable at icon size and avoids the wordmark.
      '<rect x="1.5" y="1.5" width="21" height="21" rx="2" fill="#fff"/>' +
        '<g fill="#0F62FE">' +
        '<rect x="3.5" y="5.5" width="17" height="1.4"/>' +
        '<rect x="3.5" y="7.8" width="17" height="1.4"/>' +
        '<rect x="3.5" y="10.1" width="17" height="1.4"/>' +
        '<rect x="3.5" y="12.4" width="17" height="1.4"/>' +
        '<rect x="3.5" y="14.7" width="17" height="1.4"/>' +
        '<rect x="3.5" y="17" width="17" height="1.4"/>' +
        "</g>",
    ),
  },
  {
    key: "nvidia",
    label: "NVIDIA",
    color: "#76B900",
    svg: wrap(
      '<rect x="1" y="1" width="22" height="22" rx="3" fill="#0E0E0E"/>' +
        // NVIDIA's stylised "eye" — a green swoosh inside a darker outline.
        '<path d="M5 16c2-5 7-8 14-8-4 0-7 3-9 7-1.4 2.6-2.7 3.6-5 1z" fill="#76B900"/>',
    ),
  },
  {
    key: "oracle",
    label: "Oracle",
    color: "#F80000",
    svg: wrap(
      // The Oracle wordmark sits inside a red elliptical outline — keeping
      // just the ellipse (icon-only) preserves the identity at small sizes.
      '<ellipse cx="12" cy="12" rx="9.5" ry="5.5" stroke="#F80000" stroke-width="2.4" fill="none"/>',
    ),
  },
  {
    key: "salesforce",
    label: "Salesforce",
    color: "#00A1E0",
    svg: wrap(
      '<path d="M7 18h11a3.5 3.5 0 0 0 .9-6.9A5 5 0 0 0 9.4 8.3 4 4 0 0 0 7 18z" fill="#00A1E0"/>',
    ),
  },
  {
    key: "cisco",
    label: "Cisco",
    color: "#1BA0D7",
    svg: wrap(
      // Cisco's "seven bars" mark — three groups symmetric around the tall
      // center bar, evoking a network signal.
      '<g fill="#1BA0D7"><rect x="2" y="11" width="1.6" height="2"/>' +
        '<rect x="5" y="9" width="1.6" height="6"/>' +
        '<rect x="8" y="6" width="1.6" height="12"/>' +
        '<rect x="11" y="3" width="1.6" height="18"/>' +
        '<rect x="14" y="6" width="1.6" height="12"/>' +
        '<rect x="17" y="9" width="1.6" height="6"/>' +
        '<rect x="20" y="11" width="1.6" height="2"/></g>',
    ),
  },

  // ── Developer tooling + data platforms ─────────────────────────────────
  {
    key: "github",
    label: "GitHub",
    color: "#FFFFFF",
    svg: wrap(
      // Octocat silhouette (single-color outline mark).
      '<path fill="#fff" d="M12 1a11 11 0 0 0-3.48 21.44c.55.1.75-.24.75-.53v-2.05c-3.06.66-3.7-1.3-3.7-1.3-.5-1.27-1.23-1.6-1.23-1.6-1-.68.08-.67.08-.67 1.1.08 1.69 1.14 1.69 1.14.98 1.69 2.58 1.2 3.21.92.1-.72.39-1.2.7-1.48-2.44-.28-5-1.22-5-5.44 0-1.2.43-2.18 1.14-2.95-.12-.28-.5-1.4.1-2.92 0 0 .93-.3 3.04 1.13a10.5 10.5 0 0 1 5.53 0c2.1-1.43 3.03-1.13 3.03-1.13.6 1.52.22 2.64.1 2.92.71.77 1.14 1.75 1.14 2.95 0 4.23-2.57 5.16-5.02 5.43.4.34.75 1.02.75 2.05v3.04c0 .3.2.64.76.53A11 11 0 0 0 12 1z"/>',
    ),
  },
  {
    key: "linkedin",
    label: "LinkedIn Learning",
    color: "#0A66C2",
    svg: wrap(
      '<rect x="1.5" y="1.5" width="21" height="21" rx="3" fill="#0A66C2"/>' +
        '<path fill="#fff" d="M7.5 9.5h2.6v8.5H7.5zM8.8 5.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM12 9.5h2.5v1.2c.4-.7 1.4-1.4 2.8-1.4 3 0 3.2 2 3.2 4.5V18h-2.6v-3.7c0-1 0-2.2-1.4-2.2s-1.5 1-1.5 2.2V18H12V9.5z"/>',
    ),
  },
  {
    key: "databricks",
    label: "Databricks",
    color: "#FF3621",
    svg: wrap(
      // Databricks "lakehouse" — stacked chevrons in their signature red.
      '<g fill="none" stroke="#FF3621" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M3 8 L12 3 L21 8"/>' +
        '<path d="M3 12.5 L12 7.5 L21 12.5"/>' +
        '<path d="M3 17 L12 12 L21 17"/>' +
        "</g>",
    ),
  },
  {
    key: "snowflake",
    label: "Snowflake",
    color: "#29B5E8",
    svg: wrap(
      // Six-armed snowflake with branches near the tips — closer to the
      // actual mark than the prior 4-line simplification.
      '<g stroke="#29B5E8" stroke-width="1.5" stroke-linecap="round" fill="none">' +
        '<line x1="12" y1="2.5" x2="12" y2="21.5"/>' +
        '<line x1="3.7" y1="7.25" x2="20.3" y2="16.75"/>' +
        '<line x1="3.7" y1="16.75" x2="20.3" y2="7.25"/>' +
        // tip branchlets
        '<path d="M12 5 L10 3.4 M12 5 L14 3.4"/>' +
        '<path d="M12 19 L10 20.6 M12 19 L14 20.6"/>' +
        '<path d="M6 8.5 L4 8 M6 8.5 L5.5 6.4"/>' +
        '<path d="M18 15.5 L20 16 M18 15.5 L18.5 17.6"/>' +
        '<path d="M6 15.5 L4 16 M6 15.5 L5.5 17.6"/>' +
        '<path d="M18 8.5 L20 8 M18 8.5 L18.5 6.4"/>' +
        "</g>",
    ),
  },
  {
    key: "mongodb",
    label: "MongoDB",
    color: "#13AA52",
    svg: wrap(
      '<path d="M12 2c2 5 6 8 6 12s-3 7-6 8c-3-1-6-4-6-8s4-7 6-12z" fill="#13AA52"/>' +
        '<path d="M12 5v17" stroke="#0B6B33" stroke-width="1.2"/>',
    ),
  },
  {
    key: "kubernetes",
    label: "Kubernetes (CNCF)",
    color: "#326CE5",
    svg: wrap(
      '<path d="M12 1.6l8.5 4v8.8L12 22.4l-8.5-8v-8.8L12 1.6z" fill="#326CE5"/>' +
        '<path d="M12 6.5v11M6.8 9.3l10.4 5.4M17.2 9.3l-10.4 5.4" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>' +
        '<circle cx="12" cy="12" r="2" fill="#fff"/>',
    ),
  },
  {
    key: "hashicorp",
    label: "HashiCorp",
    color: "#7B42BC",
    svg: wrap(
      '<rect x="1.5" y="1.5" width="21" height="21" rx="3" fill="#7B42BC"/>' +
        '<path d="M8 6v12M16 6v12M8 12h8" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>',
    ),
  },
  {
    key: "hubspot",
    label: "HubSpot",
    color: "#FF7A59",
    svg: wrap(
      '<circle cx="14.5" cy="14.5" r="5" stroke="#FF7A59" stroke-width="2.2" fill="none"/>' +
        '<circle cx="14.5" cy="14.5" r="1.6" fill="#FF7A59"/>' +
        '<circle cx="14.5" cy="6" r="2" fill="#FF7A59"/>' +
        '<line x1="14.5" y1="8" x2="14.5" y2="10" stroke="#FF7A59" stroke-width="1.6"/>',
    ),
  },

  // ── Professional certification bodies ──────────────────────────────────
  {
    key: "comptia",
    label: "CompTIA",
    color: "#C8202F",
    svg: wrap(
      '<rect x="1.5" y="1.5" width="21" height="21" rx="3" fill="#C8202F"/>' +
        '<path d="M16 10a5 5 0 1 0 0 4" stroke="#fff" stroke-width="2.6" stroke-linecap="round" fill="none"/>',
    ),
  },
  {
    key: "pmi",
    label: "PMI",
    color: "#1F2A5C",
    svg: wrap(
      '<rect x="1.5" y="1.5" width="21" height="21" rx="3" fill="#1F2A5C"/>' +
        '<path d="M7 17V7h4a3 3 0 1 1 0 6H9" stroke="#fff" stroke-width="2.2" stroke-linecap="round" fill="none"/>',
    ),
  },
  {
    key: "scrum-org",
    label: "Scrum.org",
    color: "#244270",
    svg: wrap(
      '<rect x="1.5" y="1.5" width="21" height="21" rx="3" fill="#244270"/>' +
        '<path d="M8 9.5a3.5 3.5 0 0 1 3.5-3.5h1a3.5 3.5 0 0 1 0 7h-1a3.5 3.5 0 0 0 0 7h1a3.5 3.5 0 0 0 3.5-3.5" stroke="#fff" stroke-width="2.2" stroke-linecap="round" fill="none"/>',
    ),
  },

  // ── Learning platforms (most niche, surfaced last) ────────────────────
  {
    key: "edx",
    label: "edX",
    color: "#02262B",
    svg: wrap(
      '<rect x="1.5" y="1.5" width="21" height="21" rx="3" fill="#02262B"/>' +
        '<path d="M5 8h8M5 12h6M5 16h8M14 8l5 8M19 8l-5 8" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>',
    ),
  },
  {
    key: "udacity",
    label: "Udacity",
    color: "#02B3E4",
    svg: wrap(
      '<rect x="1.5" y="1.5" width="21" height="21" rx="3" fill="#02B3E4"/>' +
        '<path d="M7 7v6a5 5 0 0 0 10 0V7" stroke="#fff" stroke-width="2.2" stroke-linecap="round" fill="none"/>',
    ),
  },
  {
    key: "deeplearning-ai",
    label: "DeepLearning.AI",
    color: "#E5484D",
    svg: wrap(
      // Concentric-ring sphere on a coral-pink disc — matches the actual
      // DeepLearning.AI mark (target-like rings with a soft 3D highlight).
      '<defs><radialGradient id="dla-g" cx="35%" cy="30%" r="80%">' +
        '<stop offset="0%" stop-color="#FF9098"/>' +
        '<stop offset="62%" stop-color="#E5484D"/>' +
        '<stop offset="100%" stop-color="#A8242A"/>' +
        "</radialGradient></defs>" +
        '<circle cx="12" cy="12" r="10.5" fill="url(#dla-g)"/>' +
        '<circle cx="12" cy="12" r="7.4" fill="none" stroke="rgba(255,255,255,0.32)" stroke-width="1.1"/>' +
        '<circle cx="12" cy="12" r="4.8" fill="none" stroke="rgba(255,255,255,0.42)" stroke-width="1.1"/>' +
        '<circle cx="12" cy="12" r="2.4" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="1.1"/>' +
        // Highlight glow at the upper-left to give it a 3D sphere feel.
        '<circle cx="8.5" cy="8" r="2.3" fill="rgba(255,255,255,0.22)"/>',
    ),
  },
] as const;

export const ISSUER_BY_KEY: Record<string, IssuerMeta> = Object.fromEntries(
  ISSUERS.map((i) => [i.key, i]),
);
