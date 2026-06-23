import "server-only";
import type { z } from "zod";
import { DEFAULT_SPEC, designSpecSchema, type DesignSpec } from "~/engine/spec";
import type { ProfileData } from "~/server/profile/model";
import type { UsageRecord } from "./cost";

/**
 * GHOST_PROTOCOL — a single, hand-crafted design: dark hacker-terminal × matrix ×
 * liquid-glass × cyberpunk. Every generation renders this world. The vibe is
 * stored but does not (yet) branch the design; the GitHub copy comes from the
 * facts layer. (Multiple worlds + vibe→world selection is a post-launch feature.)
 */
function ghostSpec(): z.input<typeof designSpecSchema> {
  return {
    archetype: "terminal",
    experience: "terminalNexus",
    theme: {
      mode: "dark",
      bg: "#03060a",
      surface: "#081310",
      fg: "#d8ffe9",
      muted: "#5c7a6e",
      border: "#15392a",
      accent: "#39ff14", // matrix green
      accent2: "#00e5ff", // cyber cyan
      glow: "#39ff14",
      radius: "sharp",
      glass: 0.7,
    },
    typography: { display: "mono", body: "mono", scale: "normal" },
    background: { mode: "matrix", intensity: 0.7, speed: 0.6, parallax: 0.6 },
    webgl: { scene: "ghostObject", intensity: 0.85 },
    postfx: { bloom: 0.34, chromatic: 0.28, scanlines: true },
    cursor: "square",
    boot: "system",
    motion: "energetic",
    heroGimmick: { type: "glitch" },
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
