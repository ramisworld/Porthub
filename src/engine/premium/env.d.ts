import type { DesignSpec } from "../spec";
import type { ProfileData } from "../../server/profile/model";

// The portfolio page injects these globals before the engine script runs.
declare global {
  interface PHScroll {
    progress: number;
    vel: number;
    y: number;
  }
  interface PHGlobal {
    scroll: PHScroll;
    onScroll: (fn: (s: PHScroll) => void) => void;
  }
  interface Window {
    SPEC: DesignSpec;
    DATA: ProfileData;
    PH?: PHGlobal;
    __PHP?: boolean; // premium layer present
    __PHP_FALLBACK_BG?: boolean; // premium asked the base engine to run its 2D background
    __PHP_domReady?: () => void; // base engine calls this once the DOM is built
    __PHP_TIER?: "high" | "medium" | "low"; // perf tier set early by index.ts
  }
}

export {};
