import gsap from "gsap";
import type { DesignSpec } from "../spec";
import { isTouch } from "./support";

/** Custom cursor: a square/circle/dot that trails the pointer and grows on links.
 *
 * Skips entirely on:
 *   • opt-out via spec (`cursor: "none"`),
 *   • touch devices (`pointer:coarse`), and
 *   • narrow viewports (≤ 720px) — covers DevTools mobile emulation and any
 *     small embedded preview where a pointer cursor wouldn't make sense
 *     visually (the floating square was the worst offender on phone-width
 *     previews of the dashboard).
 */
export function initCursor(spec: DesignSpec): void {
  if (spec.cursor === "none" || isTouch()) return;
  if (typeof window !== "undefined" && window.innerWidth <= 720) return;

  const shape = spec.cursor;
  const size = shape === "dot" ? 9 : 26;
  const radius = shape === "square" ? "4px" : "50%";

  const el = document.createElement("div");
  el.id = "ph-cursor";
  el.style.cssText =
    `position:fixed;left:0;top:0;z-index:9999;width:${size}px;height:${size}px;` +
    `border:1.5px solid var(--accent,#fff);border-radius:${radius};` +
    `background:${shape === "dot" ? "var(--accent,#fff)" : "transparent"};` +
    "pointer-events:none;mix-blend-mode:difference;will-change:transform";
  document.body.appendChild(el);
  gsap.set(el, { xPercent: -50, yPercent: -50 });
  document.documentElement.style.cursor = "none";

  const xTo = gsap.quickTo(el, "x", { duration: 0.22, ease: "power3" });
  const yTo = gsap.quickTo(el, "y", { duration: 0.22, ease: "power3" });
  window.addEventListener(
    "pointermove",
    (e) => {
      xTo(e.clientX);
      yTo(e.clientY);
    },
    { passive: true },
  );

  const hot = "a,button,.ph-card,[data-cursor]";
  document.addEventListener("pointerover", (e) => {
    if ((e.target as HTMLElement).closest(hot))
      gsap.to(el, { scale: 2.1, duration: 0.2 });
  });
  document.addEventListener("pointerout", (e) => {
    if ((e.target as HTMLElement).closest(hot))
      gsap.to(el, { scale: 1, duration: 0.2 });
  });
}
