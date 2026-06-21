import { z } from "zod";

/**
 * DesignSpec — the small JSON the art-director emits and the Engine consumes.
 * This file is the SINGLE SOURCE OF TRUTH: the enum arrays below must match the
 * registries in `src/engine/runtime/*.js`, the mock in `src/server/llm/design.ts`,
 * and (later) the live art-director prompt.
 *
 * The whole point: the LLM only picks from these registries + a free palette +
 * an optional CSS flourish — a tiny output — while the Engine owns all the
 * interactive machinery. Variety = archetype × background × fonts × motion ×
 * (continuous) palette × skins × gimmick × signatureCss.
 */

export const ARCHETYPES = [
  "terminal", // hacker / command-line
  "editorial", // magazine / serif / whitespace
  "brutalist", // raw, high-contrast, bordered blocks
  "minimal", // Linear/Vercel clean
  "bento", // grid of tiles
] as const;

export const EXPERIENCE_PACKS = [
  "classic", // backwards-compatible v2 layout
  "terminalNexus", // cyber terminal, telemetry rail, command modules
  "directorCut", // cinematic acts, letterbox, timeline scrubber
  "desktopOS", // app windows, taskbar, file explorer metaphor
  "gameHud", // RPG/player profile, abilities, inventory, quests
  "liquidGlass", // premium glass/prism editorial system
  "cosmicLab", // scientific console, orbital cards, star telemetry
] as const;

export const BACKGROUNDS = [
  "matrix",
  "starfield",
  "dotgrid",
  "aurora",
  "particles",
  "waves",
  "none",
] as const;

export const FONTS = [
  "mono",
  "grotesk",
  "serif",
  "geometric",
  "condensed",
  "rounded",
] as const;

export const GIMMICKS = [
  "typewriter",
  "glitch",
  "tilt3d",
  "magnetic",
  "cursorTrail",
  "none",
] as const;

export const MOTIONS = ["none", "subtle", "energetic", "cinematic", "snappy"] as const;

export const SECTIONS = [
  "hero",
  "stats",
  "languages",
  "projects",
  "about",
  "contact",
] as const;

export const RADII = ["sharp", "soft", "round"] as const;
export const SCALES = ["compact", "normal", "large"] as const;

export const PROJECT_CARD_SKINS = [
  "terminalWindow",
  "glass",
  "outline",
  "ticket",
  "codeblock",
  "plain",
] as const;
export const STAT_CARD_SKINS = ["glass", "outline", "plain", "terminal"] as const;
export const LANGBAR_SKINS = ["bars", "chips", "dots", "ascii"] as const;
export const NAV_SKINS = ["bar", "pill", "minimal"] as const;
export const BUTTON_SKINS = ["solid", "outline", "ghost", "terminal"] as const;

// --- Premium (Engine v2) registries: WebGL scene, postprocessing, cursor, boot.
export const WEBGL_SCENES = [
  "starfield",
  "glassOrb",
  "energyCube",
  "prismField",
  "voidRings",
  "off",
] as const;
export const CURSORS = ["square", "circle", "dot", "none"] as const;
export const BOOTS = ["system", "off"] as const;

const hex = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "must be a hex color");

export const designSpecSchema = z.object({
  archetype: z.enum(ARCHETYPES),
  experience: z.enum(EXPERIENCE_PACKS).default("classic"),
  theme: z.object({
    mode: z.enum(["light", "dark"]),
    bg: hex,
    surface: hex,
    fg: hex,
    muted: hex,
    border: hex,
    accent: hex,
    accent2: hex,
    glow: hex,
    radius: z.enum(RADII),
    glass: z.number().min(0).max(1),
  }),
  typography: z.object({
    display: z.enum(FONTS),
    body: z.enum(FONTS),
    scale: z.enum(SCALES),
  }),
  background: z.object({
    mode: z.enum(BACKGROUNDS),
    intensity: z.number().min(0).max(1),
    speed: z.number().min(0).max(1),
    parallax: z.number().min(0).max(1),
  }),
  // Premium WebGL background (Engine v2). `background` above is the 2D fallback.
  webgl: z.object({
    scene: z.enum(WEBGL_SCENES),
    intensity: z.number().min(0).max(1),
  }),
  postfx: z.object({
    bloom: z.number().min(0).max(1),
    chromatic: z.number().min(0).max(1),
    scanlines: z.boolean(),
  }),
  cursor: z.enum(CURSORS),
  boot: z.enum(BOOTS),
  motion: z.enum(MOTIONS),
  heroGimmick: z.object({
    type: z.enum(GIMMICKS),
  }),
  sections: z
    .array(z.object({ type: z.enum(SECTIONS), title: z.string().optional() }))
    .min(1),
  skins: z.object({
    projectCard: z.enum(PROJECT_CARD_SKINS),
    statCard: z.enum(STAT_CARD_SKINS),
    langBar: z.enum(LANGBAR_SKINS),
    nav: z.enum(NAV_SKINS),
    button: z.enum(BUTTON_SKINS),
  }),
  // Bespoke escape hatch — CSS only, bounded. Safe inside the sandboxed iframe.
  signatureCss: z.string().max(1200).optional(),
});

export type DesignSpec = z.infer<typeof designSpecSchema>;

/** A guaranteed-valid spec used as the fallback when art-direction fails. */
export const DEFAULT_SPEC: DesignSpec = {
  archetype: "minimal",
  experience: "liquidGlass",
  theme: {
    mode: "dark",
    bg: "#0a0a0f",
    surface: "#14141c",
    fg: "#e8e8ef",
    muted: "#8a8aa0",
    border: "#23232f",
    accent: "#6c7bff",
    accent2: "#9a6cff",
    glow: "#6c7bff",
    radius: "soft",
    glass: 0.4,
  },
  typography: { display: "grotesk", body: "grotesk", scale: "normal" },
  background: { mode: "dotgrid", intensity: 0.5, speed: 0.4, parallax: 0.4 },
  webgl: { scene: "starfield", intensity: 0.5 },
  postfx: { bloom: 0.5, chromatic: 0.3, scanlines: false },
  cursor: "circle",
  boot: "system",
  motion: "subtle",
  heroGimmick: { type: "none" },
  sections: [
    { type: "hero" },
    { type: "stats" },
    { type: "languages" },
    { type: "projects" },
  ],
  skins: {
    projectCard: "glass",
    statCard: "glass",
    langBar: "bars",
    nav: "bar",
    button: "solid",
  },
};
