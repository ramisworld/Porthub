import type { DesignSpec } from "../spec";
import type { ProfileData } from "../../server/profile/model";
import { escapeHtml } from "./support";

export interface BootHandle {
  finish: () => void;
}

/** Fake "system boot" overlay — covers the engine/WebGL load, then fades. */
export function mountBoot(
  spec: DesignSpec,
  data: ProfileData,
  opts: { reduce: boolean },
): BootHandle {
  if (spec.boot === "off") return { finish: () => undefined };

  const overlay = document.createElement("div");
  overlay.id = "ph-boot";
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:1000;background:var(--bg,#06060a);" +
    "color:var(--accent,#39ff14);font-family:ui-monospace,Menlo,monospace;" +
    "display:flex;flex-direction:column;justify-content:flex-end;padding:48px;" +
    "font-size:13px;line-height:1.8;transition:opacity .6s ease";

  const log = document.createElement("div");
  const bar = document.createElement("div");
  bar.style.cssText =
    "height:2px;width:0;margin-top:18px;background:var(--accent,#39ff14);" +
    "box-shadow:0 0 14px var(--accent,#39ff14);transition:width .25s ease";
  overlay.append(log, bar);
  document.body.appendChild(overlay);

  const lines = [
    "INIT BIOS... OK",
    "MOUNTING VFS... OK",
    "CONNECTING TO DATA_CORE... OK",
    `FETCHING REPOS FOR [${escapeHtml(data.identity.name ?? "user")}]... OK`,
    "RENDERING UI... OK",
  ];

  let i = 0;
  const step = () => {
    if (i >= lines.length) return;
    log.innerHTML += (i ? "<br>" : "") + lines[i];
    bar.style.width = Math.round(((i + 1) / lines.length) * 100) + "%";
    i++;
    if (opts.reduce) step();
    else setTimeout(step, 170);
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
