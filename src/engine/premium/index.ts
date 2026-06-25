import { mountBoot } from "./boot";
import { initCursor } from "./cursor";
import { mountVoid } from "./void";
import { initWebGL, type WebGLHandle } from "./webgl";
import { initReveals } from "./scroll";
import {
  lowPowerDevice,
  prefersReducedMotion,
  webglSupported,
} from "./support";

// Premium layer. Runs synchronously after the base runtime registers its
// DOMContentLoaded boot, so these flags are set before the engine builds the DOM.
(function premium() {
  const spec = window.SPEC;
  const data = window.DATA;
  if (!spec || !data) return;

  window.__PHP = true;
  document.body.classList.add("php-premium");

  const reduce = prefersReducedMotion();
  const boot = mountBoot(spec, data, { reduce });

  initCursor(spec);

  if (spec.postfx.scanlines && !reduce) {
    const sl = document.createElement("div");
    sl.id = "ph-scanlines";
    sl.style.cssText =
      "position:fixed;inset:0;z-index:998;pointer-events:none;opacity:.22;" +
      "background:repeating-linear-gradient(0deg,rgba(0,0,0,0) 0px,rgba(0,0,0,0) 2px,rgba(0,0,0,.18) 3px,rgba(0,0,0,0) 4px)";
    document.body.appendChild(sl);
  }

  // The deep-space void with hyperdrive on scroll. Always on — cheap, animated,
  // CSS atmosphere + canvas star projection. The WebGL hero composites over it.
  mountVoid();

  // Run the heavy WebGL scene (object on top of the void) only on capable,
  // non-touch, motion-OK devices. Everything else just keeps the void.
  const useWebGL =
    spec.webgl.scene !== "off" &&
    webglSupported() &&
    !reduce &&
    !lowPowerDevice();

  // The base engine calls this once it has built the DOM into #ph-app.
  let ran = false;
  const onReady = () => {
    if (ran) return;
    ran = true;
    let webgl: WebGLHandle | null = null;
    if (useWebGL) {
      try {
        // A pack may give the object a contained stage; else full-screen.
        const stage = document.getElementById("ph-stage");
        webgl = initWebGL(spec, stage);
      } catch {
        webgl = null; // void is already mounted underneath
      }
    }
    if (webgl && window.PH) {
      const wg = webgl;
      window.PH.onScroll((s) => wg.setProgress(s.progress, s.vel));
    }
    initReveals();
    boot.finish();
  };
  window.__PHP_domReady = onReady;

  // Safety net: if the engine never signals (e.g. error), reveal + drop boot.
  setTimeout(onReady, 4000);
})();
