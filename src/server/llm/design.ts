import "server-only";
import type { z } from "zod";
import { DEFAULT_SPEC, designSpecSchema, type DesignSpec } from "~/engine/spec";
import type { ProfileData } from "~/server/profile/model";
import type { UsageRecord } from "./cost";

/**
 * GHOST_PROTOCOL — a single, hand-crafted design: an encrypted AI workstation.
 * An almost-black void, monospace throughout, restrained green signal + muted
 * telemetry, a slow liquid-glass particle core, and deliberate (not noisy)
 * motion. Every generation renders this world. The vibe is stored but does not
 * (yet) branch the design; the GitHub copy comes from the facts layer.
 */
function ghostSpec(): z.input<typeof designSpecSchema> {
  return {
    archetype: "terminal",
    experience: "terminalNexus",
    theme: {
      mode: "dark",
      bg: "#010303", // almost black, neutral — never blue/teal
      surface: "#040807",
      fg: "#e9f0eb", // clean cool off-white — not muddy
      muted: "#6b756f", // neutral dim grey — not green-tinted
      border: "#101715",
      accent: "#36d486", // refined phosphor green, not lime
      accent2: "#80e8bd", // soft terminal mint, secondary only
      glow: "#1e8f59",
      radius: "sharp",
      glass: 0.55,
    },
    typography: { display: "mono", body: "mono", scale: "normal" },
    background: { mode: "matrix", intensity: 0.5, speed: 0.5, parallax: 0.5 },
    webgl: { scene: "ghostObject", intensity: 0.58 },
    postfx: { bloom: 0.14, chromatic: 0.035, scanlines: true },
    cursor: "square",
    boot: "system",
    motion: "subtle",
    heroGimmick: { type: "none" },
    sections: [
      { type: "hero" },
      { type: "stats" },
      { type: "languages" },
      { type: "projects" },
      { type: "contact" },
    ],
    skins: {
      projectCard: "terminalWindow",
      statCard: "terminal",
      langBar: "ascii",
      nav: "minimal",
      button: "terminal",
    },
  };
}

export async function buildDesignSpec(
  _data: ProfileData,
  _vibe: string,
): Promise<{ spec: DesignSpec; usage: UsageRecord | null }> {
  const parsed = designSpecSchema.safeParse(ghostSpec());
  return { spec: parsed.success ? parsed.data : DEFAULT_SPEC, usage: null };
}
