import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// GSAP plugin policy: core + ScrollTrigger are required and ship with the npm
// package. Register defensively so a missing/blocked plugin degrades to plain
// reveals instead of crashing the page.
let scrollTriggerReady = false;
try {
  gsap.registerPlugin(ScrollTrigger);
  scrollTriggerReady = true;
} catch {
  scrollTriggerReady = false;
}

/** Staggered reveal of every `.reveal` element the base engine produced. */
export function initReveals(): void {
  const els = Array.from(
    document.querySelectorAll<HTMLElement>("#ph-app .reveal"),
  );
  if (!els.length) return;

  if (!scrollTriggerReady) {
    gsap.to(els, { opacity: 1, y: 0, duration: 0.6, stagger: 0.05 });
    return;
  }

  gsap.set(els, { opacity: 0, y: 34 });
  ScrollTrigger.batch(els, {
    start: "top 88%",
    onEnter: (batch) =>
      gsap.to(batch, {
        opacity: 1,
        y: 0,
        duration: 0.7,
        stagger: 0.08,
        ease: "power3.out",
        overwrite: true,
      }),
  });
  ScrollTrigger.refresh();
}
