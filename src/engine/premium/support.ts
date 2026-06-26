export function webglSupported(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext("webgl2") ?? c.getContext("webgl"))
    );
  } catch {
    return false;
  }
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function isTouch(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer:coarse)").matches
  );
}

/**
 * Heuristic for devices that shouldn't run the heavy WebGL scene (thermals +
 * compatibility): phones/tablets (coarse pointer), few CPU cores, low memory,
 * or no WebGL2 (older GPUs). These fall back to a static CSS starfield void.
 */
export function lowPowerDevice(): boolean {
  return perfTier() === "low";
}

export type PerfTier = "high" | "medium" | "low";

/**
 * Three-tier device classification used by the engine to scale GPU/CPU work.
 *
 *   high   — desktop / dGPU / 6+ cores / 8+ GB RAM        → full particles, full postfx
 *   medium — average laptop / iGPU / 4–6 cores / 4–6 GB   → half particles, dimmed postfx
 *   low    — touch, few cores, no WebGL2, reduced-motion  → no WebGL hero at all
 *
 * Honors a `?perf=high|medium|low` URL override for testing; cached after the
 * first call so every module sees the same answer for the lifetime of the page.
 */
let cachedTier: PerfTier | null = null;
export function perfTier(): PerfTier {
  if (cachedTier) return cachedTier;
  try {
    // Test override — append `?perf=low` to the slug URL to simulate.
    const param = new URLSearchParams(window.location.search).get("perf");
    if (param === "high" || param === "medium" || param === "low") {
      cachedTier = param;
      return cachedTier;
    }

    if (prefersReducedMotion()) {
      cachedTier = "low";
      return cachedTier;
    }

    const c = document.createElement("canvas");
    const noWebGL2 = !c.getContext("webgl2");
    if (noWebGL2) {
      cachedTier = "low";
      return cachedTier;
    }

    const nav = navigator as Navigator & {
      deviceMemory?: number;
      hardwareConcurrency?: number;
    };
    const cores = nav.hardwareConcurrency ?? 8;
    const mem = nav.deviceMemory ?? 8;
    const touch = isTouch();

    // Touch + weak specs → low. Touch alone (modern tablet/iPad with 8+ cores)
    // gets medium so we don't kill the hero on a perfectly capable iPad.
    if (touch && (cores <= 4 || mem <= 4)) {
      cachedTier = "low";
      return cachedTier;
    }
    if (cores <= 4 || mem <= 4) {
      cachedTier = "low";
      return cachedTier;
    }
    if (touch || cores <= 6 || mem <= 6) {
      cachedTier = "medium";
      return cachedTier;
    }
    cachedTier = "high";
    return cachedTier;
  } catch {
    cachedTier = "low";
    return cachedTier;
  }
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
