import type { DesignSpec } from "../spec";
import type { ProfileData } from "../../server/profile/model";
import { escapeHtml } from "./support";

export interface BootHandle {
  finish: () => void;
}

/**
 * Boot overlay that covers the engine/WebGL load, then fades. Its STYLE follows
 * the rolled temperament so the pre-load matches the page it reveals — a serene
 * portfolio shouldn't open with fake BIOS logs.
 *   log     (engineered/cinematic/terminal) — GHOST decryption console: secure
 *           shell header, a name that decrypts out of glyph-noise, thematic boot
 *           log, and a green→cyan data-stream bar.
 *   minimal (serene/playful)               — centered name + hairline progress
 *   stark   (raw)                          — huge name + heavy accent bar
 */
export function mountBoot(
  spec: DesignSpec,
  data: ProfileData,
  opts: { reduce: boolean },
): BootHandle {
  if (spec.boot === "off") return { finish: () => undefined };

  const temp = spec.generative.temperament;
  const style =
    temp === "serene" || temp === "playful" ? "minimal" : temp === "raw" ? "stark" : "log";
  const rawName = data.identity.name ?? "user";
  const name = escapeHtml(rawName);

  const overlay = document.createElement("div");
  overlay.id = "ph-boot";
  const base =
    "position:fixed;inset:0;z-index:1000;background:var(--bg,#06060a);" +
    "transition:opacity .6s ease;display:flex;flex-direction:column;";

  const log = document.createElement("div");
  const bar = document.createElement("div");
  const pct = document.createElement("div");
  const nameEl = document.createElement("div");

  if (style === "log") {
    overlay.style.cssText =
      base +
      "justify-content:space-between;padding:clamp(26px,6vw,60px);" +
      "color:var(--accent,#39ff14);font-family:ui-monospace,Menlo,monospace;";

    // top — secure-shell header + the name decrypting out of glyph noise
    const top = document.createElement("div");
    const head = document.createElement("div");
    head.style.cssText =
      "font-size:12px;letter-spacing:.34em;color:var(--accent2,#00e5ff);opacity:.85;";
    head.textContent = "// GHOST_PROTOCOL :: SECURE SHELL";
    nameEl.style.cssText =
      "margin-top:16px;font-size:clamp(2.1rem,8vw,5rem);font-weight:800;letter-spacing:-.02em;" +
      "line-height:1;color:var(--fg,#d8ffe9);text-shadow:0 0 34px var(--accent,#39ff14);";
    top.append(head, nameEl);

    // bottom — boot log + data-stream bar + percentage
    log.style.cssText = "font-size:13px;line-height:1.85;";
    bar.style.cssText =
      "height:3px;width:0;margin-top:16px;border-radius:2px;transition:width .25s ease;" +
      "background:linear-gradient(90deg,var(--accent,#39ff14),var(--accent2,#00e5ff));" +
      "box-shadow:0 0 16px var(--accent,#39ff14);";
    pct.style.cssText =
      "font-size:11px;letter-spacing:.22em;color:var(--accent,#39ff14);opacity:.7;margin-top:9px;";
    const bottom = document.createElement("div");
    bottom.append(log, bar, pct);

    overlay.append(top, bottom);

    // decrypt the name: glyph-noise that resolves left→right
    const GLYPHS = "01<>/\\[]{}#$%&*+=ABCDEF░▒▓§¥";
    const target = rawName.toUpperCase();
    const totalFrames = 26;
    let frame = 0;
    const tick = () => {
      frame++;
      const revealed = Math.floor((frame / totalFrames) * target.length);
      let out = "";
      for (let c = 0; c < target.length; c++) {
        if (target[c] === " ") out += " ";
        else out += c < revealed ? target[c] : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      nameEl.textContent = out;
      if (frame >= totalFrames) {
        nameEl.textContent = target;
        clearInterval(decrypt);
      }
    };
    const decrypt = setInterval(tick, 45);
    if (opts.reduce) {
      clearInterval(decrypt);
      nameEl.textContent = target;
    }
  } else if (style === "stark") {
    overlay.style.cssText =
      base + "justify-content:center;padding:clamp(24px,7vw,90px);color:var(--fg,#111);";
    log.style.cssText =
      "font-family:var(--font-display);font-weight:800;text-transform:uppercase;" +
      "letter-spacing:-.03em;line-height:.9;font-size:clamp(2.6rem,9vw,7rem);";
    log.innerHTML = name;
    bar.style.cssText =
      "height:10px;width:0;margin-top:28px;max-width:560px;background:var(--accent);transition:width .3s ease";
    overlay.append(log, bar);
  } else {
    // minimal
    overlay.style.cssText =
      base + "justify-content:center;align-items:center;text-align:center;color:var(--fg,#111);";
    log.style.cssText =
      "font-family:var(--font-display);font-weight:700;letter-spacing:-.02em;" +
      "text-transform:uppercase;font-size:clamp(1.3rem,3vw,2rem);margin-bottom:18px;opacity:.92;";
    log.innerHTML = name;
    bar.style.cssText =
      "height:2px;width:0;max-width:200px;background:var(--accent);transition:width .35s ease;border-radius:2px;";
    overlay.append(log, bar);
  }
  document.body.appendChild(overlay);

  const logLines =
    style === "log"
      ? [
          "&gt; establishing encrypted tunnel ......... OK",
          "&gt; bypassing ICE firewall ............... OK",
          "&gt; decrypting identity payload .......... OK",
          `&gt; pulling repositories [${name}] ....... OK`,
          "&gt; compiling render surface ............. OK",
          "&gt; <span style='color:var(--accent2,#00e5ff)'>ACCESS GRANTED</span>",
        ]
      : ["", "", "", "", ""];
  const steps = logLines.length;

  let i = 0;
  const step = () => {
    if (i >= steps) return;
    if (style === "log") {
      log.innerHTML += (i ? "<br>" : "") + logLines[i];
      pct.textContent = Math.round(((i + 1) / steps) * 100) + "% // DECRYPTING DATA-STREAM";
    }
    bar.style.width = Math.round(((i + 1) / steps) * 100) + "%";
    i++;
    if (opts.reduce) step();
    else setTimeout(step, style === "log" ? 165 : 150);
  };
  step();

  let done = false;
  return {
    finish() {
      if (done) return;
      done = true;
      setTimeout(
        () => {
          overlay.style.opacity = "0";
          setTimeout(() => overlay.remove(), 650);
        },
        opts.reduce ? 0 : 350,
      );
    },
  };
}
