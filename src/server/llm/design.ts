import "server-only";
import {
  DEFAULT_SPEC,
  EXPERIENCE_PACKS,
  designSpecSchema,
  type DesignSpec,
} from "~/engine/spec";
import type { ProfileData } from "~/server/profile/model";
import { anthropic, isMock, MODELS, textOf } from "./anthropic";
import { buildUsageRecord, logUsage, type UsageRecord } from "./cost";

/**
 * Layer 2 — Art-director. Emits a tiny `DesignSpec` (palette + which archetype /
 * background / gimmick / skins). The hand-built Engine (src/engine/) turns that
 * into the interactive page. This keeps output tiny (cheap) AND the interactivity
 * reliable (the engine owns it).
 *
 * MOCK: deterministic vibe-keyword → spec, producing visibly different designs.
 * LIVE (next chunk): one small LLM call → DesignSpec JSON.
 */

type Archetype = DesignSpec["archetype"];
type Experience = DesignSpec["experience"];

const has = (v: string, ...words: string[]) => words.some((w) => v.includes(w));

function pickArchetype(v: string): Archetype {
  if (has(v, "terminal", "hacker", "cyber", "matrix", "console", "command", "code", "dev")) return "terminal";
  if (has(v, "editorial", "magazine", "serif", "warm", "elegant", "luxury", "classic", "journal")) return "editorial";
  if (has(v, "brutalist", "brutal", "raw", "punk", "grunge", "bold", "industrial")) return "brutalist";
  if (has(v, "playful", "fun", "colorful", "cute", "vibrant", "bento", "friendly", "pop")) return "bento";
  return "minimal";
}

function pickExperience(v: string, arch: Archetype): Experience {
  if (has(v, "film", "movie", "cinema", "cinematic", "director", "scene", "action", "credits"))
    return "directorCut";
  if (has(v, "desktop", "os", "window", "finder", "filesystem", "mac", "linux", "workspace"))
    return "desktopOS";
  if (has(v, "game", "rpg", "arcade", "player", "quest", "inventory", "hud", "level"))
    return "gameHud";
  if (has(v, "glass", "liquid", "premium", "luxury", "crystal", "prism", "fluid", "water"))
    return "liquidGlass";
  if (has(v, "space", "cosmic", "orbit", "lab", "science", "astral", "galaxy", "stellar"))
    return "cosmicLab";
  if (has(v, "terminal", "hacker", "cyber", "matrix", "console", "command", "crt", "sys"))
    return "terminalNexus";
  return {
    terminal: "terminalNexus",
    editorial: "liquidGlass",
    brutalist: "directorCut",
    minimal: "liquidGlass",
    bento: "gameHud",
  }[arch] as Experience;
}

// vibe color word → accent hex
const COLORS: [RegExp, string][] = [
  [/neon green|lime green|matrix green|hacker green/, "#39ff14"],
  [/\bgreen\b|emerald/, "#22c55e"],
  [/\bcyan\b|aqua/, "#22d3ee"],
  [/\bteal\b/, "#14b8a6"],
  [/\bblue\b|sapphire|azure/, "#3b82f6"],
  [/\bindigo\b/, "#6366f1"],
  [/purple|violet|lilac/, "#8b5cf6"],
  [/pink|magenta|rose/, "#ec4899"],
  [/\bred\b|crimson|scarlet/, "#ef4444"],
  [/orange|tangerine/, "#f97316"],
  [/amber|gold|golden|yellow/, "#f59e0b"],
  [/\blime\b/, "#84cc16"],
];

function pickAccent(v: string, arch: Archetype): string {
  for (const [re, hex] of COLORS) if (re.test(v)) return hex;
  return { terminal: "#39ff14", editorial: "#c0613a", brutalist: "#ff3b00", bento: "#ff5fa2", minimal: "#6c7bff" }[arch];
}

const SECONDARY: Record<string, string> = {
  "#39ff14": "#00e5ff", "#22c55e": "#0ea5e9", "#22d3ee": "#6366f1", "#14b8a6": "#6366f1",
  "#3b82f6": "#a855f7", "#6366f1": "#ec4899", "#8b5cf6": "#ec4899", "#ec4899": "#8b5cf6",
  "#ef4444": "#f59e0b", "#f97316": "#ec4899", "#f59e0b": "#ef4444", "#84cc16": "#22d3ee",
  "#c0613a": "#2d6a5f", "#ff3b00": "#0040ff", "#ff5fa2": "#6c7bff", "#6c7bff": "#9a6cff",
};

function pickMode(v: string, arch: Archetype): "light" | "dark" {
  if (has(v, "light", "paper", "white", "bright", "day", "cream")) return "light";
  if (has(v, "dark", "night", "black", "noir")) return "dark";
  return arch === "editorial" || arch === "brutalist" ? "light" : "dark";
}

function palette(mode: "light" | "dark", accent: string) {
  const accent2 = SECONDARY[accent] ?? "#6c7bff";
  return mode === "dark"
    ? { mode, bg: "#0a0a0f", surface: "#14141c", fg: "#e9e9f2", muted: "#8a8aa0", border: "#23232f", accent, accent2, glow: accent }
    : { mode, bg: "#f6f5f1", surface: "#ffffff", fg: "#16140f", muted: "#6a675f", border: "#e4dfd5", accent, accent2, glow: accent };
}

function pickBackground(v: string, arch: Archetype): DesignSpec["background"]["mode"] {
  if (has(v, "matrix", "rain")) return "matrix";
  if (has(v, "star", "space", "galaxy", "cosmos", "night sky")) return "starfield";
  if (has(v, "grid", "dots")) return "dotgrid";
  if (has(v, "aurora", "gradient", "mesh", "glow")) return "aurora";
  if (has(v, "particle", "constellation", "network")) return "particles";
  if (has(v, "wave", "ocean", "fluid", "liquid")) return "waves";
  return { terminal: "matrix", editorial: "aurora", brutalist: "dotgrid", bento: "particles", minimal: "dotgrid" }[arch] as DesignSpec["background"]["mode"];
}

function pickGimmick(v: string, arch: Archetype): DesignSpec["heroGimmick"]["type"] {
  if (has(v, "glitch")) return "glitch";
  if (has(v, "tilt", "3d")) return "tilt3d";
  if (has(v, "magnetic", "magnet")) return "magnetic";
  if (has(v, "trail", "cursor")) return "cursorTrail";
  if (has(v, "typewriter", "typing")) return "typewriter";
  return { terminal: "typewriter", editorial: "none", brutalist: "glitch", bento: "tilt3d", minimal: "magnetic" }[arch] as DesignSpec["heroGimmick"]["type"];
}

function fontsFor(arch: Archetype): DesignSpec["typography"] {
  const map: Record<Archetype, DesignSpec["typography"]> = {
    terminal: { display: "mono", body: "mono", scale: "normal" },
    editorial: { display: "serif", body: "serif", scale: "large" },
    brutalist: { display: "condensed", body: "grotesk", scale: "normal" },
    bento: { display: "rounded", body: "rounded", scale: "normal" },
    minimal: { display: "grotesk", body: "grotesk", scale: "normal" },
  };
  return map[arch];
}

function skinsFor(arch: Archetype): DesignSpec["skins"] {
  const map: Record<Archetype, DesignSpec["skins"]> = {
    terminal: { projectCard: "terminalWindow", statCard: "terminal", langBar: "ascii", nav: "minimal", button: "terminal" },
    editorial: { projectCard: "outline", statCard: "plain", langBar: "bars", nav: "minimal", button: "outline" },
    brutalist: { projectCard: "outline", statCard: "outline", langBar: "dots", nav: "bar", button: "outline" },
    bento: { projectCard: "glass", statCard: "glass", langBar: "chips", nav: "pill", button: "solid" },
    minimal: { projectCard: "glass", statCard: "plain", langBar: "bars", nav: "bar", button: "solid" },
  };
  return map[arch];
}

function webglFor(
  v: string,
  arch: Archetype,
  experience: Experience,
): DesignSpec["webgl"] {
  let scene: DesignSpec["webgl"]["scene"];
  if (has(v, "cube", "reactor", "energy", "explosion", "shatter", "artifact"))
    scene = "energyCube";
  else if (has(v, "prism", "glass", "liquid", "water", "crystal", "bubble", "fluid"))
    scene = "prismField";
  else if (has(v, "rings", "orbit", "portal", "void", "black hole"))
    scene = "voidRings";
  else if (has(v, "orb", "sphere"))
    scene = "glassOrb";
  else if (has(v, "star", "space", "galaxy", "cosmos", "hyper", "warp", "speed", "matrix", "void"))
    scene = "starfield";
  else
    scene = {
      classic: { terminal: "starfield", editorial: "glassOrb", brutalist: "off", bento: "glassOrb", minimal: "starfield" }[arch],
      terminalNexus: "energyCube",
      directorCut: "energyCube",
      desktopOS: "prismField",
      gameHud: "voidRings",
      liquidGlass: "prismField",
      cosmicLab: "starfield",
    }[experience] as DesignSpec["webgl"]["scene"];
  const intensity = {
    terminalNexus: 0.9,
    directorCut: 0.9,
    desktopOS: 0.55,
    gameHud: 0.8,
    liquidGlass: 0.65,
    cosmicLab: 0.85,
    classic: { terminal: 0.8, editorial: 0.4, brutalist: 0.3, bento: 0.7, minimal: 0.5 }[arch],
  }[experience] as number;
  return { scene, intensity };
}

function postfxFor(v: string, arch: Archetype): DesignSpec["postfx"] {
  const bloom = { terminal: 0.7, editorial: 0.3, brutalist: 0.2, bento: 0.85, minimal: 0.45 }[arch];
  let chromatic = { terminal: 0.6, editorial: 0.15, brutalist: 0.5, bento: 0.4, minimal: 0.25 }[arch];
  let scanlines = arch === "terminal";
  if (has(v, "cyber", "hacker", "glitch", "retro", "crt", "vhs", "matrix")) {
    scanlines = true;
    chromatic = Math.max(chromatic, 0.6);
  }
  if (has(v, "clean", "minimal", "calm", "subtle", "elegant")) scanlines = false;
  return { bloom, chromatic, scanlines };
}

function cursorFor(v: string, arch: Archetype): DesignSpec["cursor"] {
  if (has(v, "no cursor", "default cursor")) return "none";
  if (has(v, "square")) return "square";
  if (has(v, "circle", "ring")) return "circle";
  if (has(v, "dot")) return "dot";
  return { terminal: "square", editorial: "circle", brutalist: "square", bento: "circle", minimal: "dot" }[arch] as DesignSpec["cursor"];
}

function bootFor(v: string, arch: Archetype): DesignSpec["boot"] {
  if (has(v, "no boot", "instant", "fast load")) return "off";
  if (has(v, "boot", "loading", "hacker", "cyber", "matrix", "terminal", "system")) return "system";
  return arch === "editorial" || arch === "minimal" ? "off" : "system";
}

function radiusGlass(arch: Archetype): { radius: DesignSpec["theme"]["radius"]; glass: number } {
  return {
    terminal: { radius: "sharp" as const, glass: 0.25 },
    editorial: { radius: "soft" as const, glass: 0.1 },
    brutalist: { radius: "sharp" as const, glass: 0 },
    bento: { radius: "round" as const, glass: 0.55 },
    minimal: { radius: "soft" as const, glass: 0.2 },
  }[arch];
}

function mockSpec(_data: ProfileData, vibe: string): DesignSpec {
  const v = vibe.toLowerCase();
  const arch = pickArchetype(v);
  const experience = pickExperience(v, arch);
  const mode = pickMode(v, arch);
  const accent = pickAccent(v, arch);
  const { radius, glass } = radiusGlass(arch);

  const spec: DesignSpec = {
    archetype: arch,
    experience,
    theme: { ...palette(mode, accent), radius, glass },
    typography: fontsFor(arch),
    background: { mode: pickBackground(v, arch), intensity: 0.6, speed: 0.5, parallax: 0.6 },
    webgl: webglFor(v, arch, experience),
    postfx: postfxFor(v, arch),
    cursor: cursorFor(v, arch),
    boot: bootFor(v, arch),
    motion: { terminal: "energetic", editorial: "cinematic", brutalist: "snappy", bento: "energetic", minimal: "subtle" }[arch] as DesignSpec["motion"],
    heroGimmick: { type: pickGimmick(v, arch) },
    sections: [{ type: "hero" }, { type: "stats" }, { type: "languages" }, { type: "projects" }, { type: "contact" }],
    skins: skinsFor(arch),
  };
  // Guarantee validity; fall back to default if anything is off.
  const parsed = designSpecSchema.safeParse(spec);
  return parsed.success ? parsed.data : DEFAULT_SPEC;
}

// ---- live (wired for next chunk; not exercised while MOCK_LLM=true) ----

const ART_SYSTEM = `You are an art-director for developer portfolios. Output ONLY a JSON DesignSpec (no prose, no code fences) that maps the user's vibe to a bold, cohesive design. Pick from the allowed enums; choose a striking, accessible palette as hex; optionally add a small CSS-only "signatureCss" flourish (<1KB). The hand-built engine renders it.

Experience packs: ${EXPERIENCE_PACKS.join(", ")}.
The experience pack controls the whole portfolio world. Prefer a distinctive pack over generic minimalism.`;

function stripFences(s: string): string {
  return s.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
}

async function liveDesignSpec(
  data: ProfileData,
  vibe: string,
): Promise<{ spec: DesignSpec; usage: UsageRecord }> {
  const msg = await anthropic().messages.create({
    model: MODELS.design,
    max_tokens: 2000,
    system: ART_SYSTEM,
    messages: [{ role: "user", content: `VIBE: ${vibe}\nNAME: ${data.identity.name}\nROLE: ${data.identity.role}\nReturn the DesignSpec JSON.` }],
  });
  const usage = buildUsageRecord("design (art)", MODELS.design, msg.usage);
  logUsage(usage);
  const raw: unknown = JSON.parse(stripFences(textOf(msg)));
  const spec = designSpecSchema.parse(raw);
  return { spec, usage };
}

export async function buildDesignSpec(
  data: ProfileData,
  vibe: string,
): Promise<{ spec: DesignSpec; usage: UsageRecord | null }> {
  if (isMock) return { spec: mockSpec(data, vibe), usage: null };
  try {
    return await liveDesignSpec(data, vibe);
  } catch (err) {
    console.warn("[design] fallback to mock spec:", err instanceof Error ? err.message : err);
    return { spec: mockSpec(data, vibe), usage: null };
  }
}
