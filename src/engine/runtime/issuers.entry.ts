// PortHub Engine — issuer registry entry.
//
// Bundled into the engine via esbuild (see scripts/build-engine.mjs). Reads
// the single source of truth in src/lib/issuers.ts and exposes the lookups
// the runtime needs on window.PH:
//
//   PH.issuerSvg(key)   → inline SVG markup (icon-only), "" if unknown
//   PH.issuerColor(key) → brand accent color (#RRGGBB), "" if unknown
//
// Centralizing the SVGs in TS means the React editor and the iframe runtime
// share one logo asset; there is no risk of the two drifting out of sync.

import { ISSUER_BY_KEY } from "~/lib/issuers";

type PHWindow = Window & {
  PH?: {
    issuerSvg?: (key: string) => string;
    issuerColor?: (key: string) => string;
  };
};

const w = window as PHWindow;
const PH = (w.PH ??= {});

PH.issuerSvg = (key: string): string => {
  if (!key) return "";
  return ISSUER_BY_KEY[key.toLowerCase()]?.svg ?? "";
};

PH.issuerColor = (key: string): string => {
  if (!key) return "";
  return ISSUER_BY_KEY[key.toLowerCase()]?.color ?? "";
};
