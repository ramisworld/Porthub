import "server-only";
import type { ProfileData } from "~/server/profile/model";
import { anthropic, isMock, MODELS, textOf } from "./anthropic";
import { buildUsageRecord, logUsage, type UsageRecord } from "./cost";

/**
 * Layer 2 — Design. The creative call: ProfileData + vibe → ONE self-contained
 * interactive HTML page. The LLM writes the actual UI (this is the magic).
 *
 * ⚠️ REVIEW CHECKPOINT: the DESIGN_SYSTEM prompt below is what we review before
 * flipping MOCK_LLM=false. In mock mode this returns a tasteful inline-CSS
 * placeholder so the subdomain + sandbox + DATA-injection plumbing is testable
 * with zero token spend.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Inject the canonical DATA object so the page (and future edits) read from it. */
export function injectData(html: string, data: ProfileData): string {
  const tag = `<script>window.DATA = ${JSON.stringify(data)};</script>`;
  if (html.includes("</head>")) return html.replace("</head>", `${tag}</head>`);
  if (html.includes("<body")) {
    return html.replace(/<body[^>]*>/, (m) => `${m}${tag}`);
  }
  return tag + html;
}

// ---------- DRAFT design-DNA system prompt (REVIEW TARGET) ----------

const DESIGN_SYSTEM = `You are an award-winning creative front-end engineer. You generate a COMPLETE, single, self-contained HTML document for a developer's personal portfolio.

NON-NEGOTIABLE OUTPUT RULES
- Output ONLY the raw HTML document (start with <!DOCTYPE html>). No markdown, no code fences, no commentary.
- ONE file. ALL CSS in a single inline <style>. ALL JS in inline <script>. NO external requests of any kind — no CDNs, no external fonts, no remote images. It must render fully offline inside a sandboxed iframe (allow-scripts, no allow-same-origin) and be exportable as one file.
- Read all content from the injected global \`window.DATA\` (shape below). Render from it; do not hardcode the user's data. Degrade gracefully when optional fields are missing.

DESIGN DNA (always)
- Genuinely interactive and animated: a living, generative background (CSS/Canvas/WebGL via inline JS — your choice), scroll-driven reveals, and tactile micro-interactions on hover/focus.
- Strong, intentional layout with confident typography using expressive system/CSS font stacks (no web-font downloads). Real visual hierarchy.
- Fully responsive (mobile → desktop) and keyboard-accessible; respect prefers-reduced-motion.
- The page must feel hand-crafted and senior — NOT a generic template.

MATCH THE VIBE
- The user provides a free-text vibe. Let it drive everything: palette, mood, motion, type, background, layout. "dark hacker terminal, neon green" should look radically different from "warm editorial, serif".

ANTI-AI-SLOP (avoid)
- No Inter/Roboto/Arial/system-default-only looks, no purple-on-white gradients, no three generic feature cards, no cookie-cutter hero-then-cards. Be specific to THIS person and THIS vibe.

window.DATA shape:
{ identity:{name,headline,role,location?,links:{github?,site?,x?,email?}}, languages:[{label,share}], stats:[{value,label}], projects:[{name,blurb,tech[],stars?,demoUrl?,repoUrl}] }`;

function stripFences(html: string): string {
  return html
    .replace(/^\s*```(?:html)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

async function liveDesign(
  data: ProfileData,
  vibe: string,
): Promise<{ code: string; usage: UsageRecord }> {
  const msg = await anthropic().messages.create({
    model: MODELS.design,
    max_tokens: 16000,
    system: DESIGN_SYSTEM,
    messages: [
      {
        role: "user",
        content: `VIBE: ${vibe}\n\nwindow.DATA = ${JSON.stringify(data)}\n\nGenerate the portfolio now. The page must read from window.DATA at runtime.`,
      },
    ],
  });
  const usage = buildUsageRecord("design (Opus)", MODELS.design, msg.usage);
  logUsage(usage);
  return { code: injectData(stripFences(textOf(msg)), data), usage };
}

// ---------- mock placeholder (inline CSS, self-contained) ----------

function renderMock(data: ProfileData, vibe: string): string {
  const { identity, languages, stats, projects } = data;
  const chip = (t: string) =>
    `<span class="chip">${escapeHtml(t)}</span>`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(identity.name)} — Portfolio</title>
<style>
  :root { --bg:#0a0a0f; --fg:#e8e8ef; --muted:#8a8aa0; --accent:#6c7bff; --card:#13131c; --line:#23232f; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--fg); font:16px/1.6 ui-sans-serif,system-ui,-apple-system,sans-serif; }
  .wrap { max-width: 880px; margin: 0 auto; padding: 80px 24px 64px; }
  .tag { color:var(--muted); font-size:13px; letter-spacing:.18em; text-transform:uppercase; }
  h1 { font-size: clamp(40px, 8vw, 76px); line-height:1.02; letter-spacing:-.03em; margin:.3em 0 0; }
  .role { color:var(--accent); font-weight:600; margin-top:6px; }
  .headline { color:var(--muted); font-size:18px; max-width:48ch; margin-top:16px; }
  .stats { display:flex; flex-wrap:wrap; gap:14px; margin:36px 0; }
  .stat { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:14px 18px; }
  .stat b { font-size:24px; display:block; }
  .stat span { color:var(--muted); font-size:13px; }
  .chips { display:flex; flex-wrap:wrap; gap:8px; margin: 12px 0 40px; }
  .chip { background:var(--card); border:1px solid var(--line); border-radius:999px; padding:5px 12px; font-size:13px; color:var(--muted); }
  .grid { display:grid; grid-template-columns:1fr; gap:14px; }
  @media (min-width:680px){ .grid { grid-template-columns:1fr 1fr; } }
  .card { background:var(--card); border:1px solid var(--line); border-radius:16px; padding:20px; transition:transform .2s ease, border-color .2s ease; }
  .card:hover { transform:translateY(-3px); border-color:var(--accent); }
  .card h3 { margin:0 0 6px; font-size:18px; }
  .card p { color:var(--muted); font-size:14px; margin:0 0 12px; }
  .card .tech { display:flex; flex-wrap:wrap; gap:6px; }
  .links { display:flex; gap:18px; margin:44px 0 0; }
  .links a { color:var(--fg); text-decoration:none; border-bottom:1px solid var(--accent); padding-bottom:2px; }
  footer { margin-top:56px; color:var(--muted); font-size:12px; border-top:1px solid var(--line); padding-top:18px; }
  .pill { display:inline-block; background:var(--card); border:1px solid var(--line); border-radius:999px; padding:4px 10px; font-size:11px; color:var(--muted); }
</style>
</head>
<body>
  <div class="wrap">
    <div class="tag">${escapeHtml(identity.location ?? "Portfolio")}</div>
    <h1>${escapeHtml(identity.name)}</h1>
    <div class="role">${escapeHtml(identity.role)}</div>
    <p class="headline">${escapeHtml(identity.headline)}</p>

    <div class="stats">
      ${stats.map((s) => `<div class="stat"><b>${escapeHtml(s.value)}</b><span>${escapeHtml(s.label)}</span></div>`).join("")}
    </div>

    <div class="chips">${languages.map((l) => chip(`${l.label} ${l.share}%`)).join("")}</div>

    <div class="grid">
      ${projects
        .map(
          (p) => `<a class="card" href="${escapeHtml(p.repoUrl)}" target="_blank" rel="noreferrer" style="text-decoration:none;color:inherit">
        <h3>${escapeHtml(p.name)}${p.stars ? ` <span class="pill">★ ${p.stars}</span>` : ""}</h3>
        <p>${escapeHtml(p.blurb)}</p>
        <div class="tech">${p.tech.map(chip).join("")}</div>
      </a>`,
        )
        .join("")}
    </div>

    <div class="links">
      ${identity.links.github ? `<a href="${escapeHtml(identity.links.github)}" target="_blank" rel="noreferrer">GitHub</a>` : ""}
      ${identity.links.site ? `<a href="${escapeHtml(identity.links.site)}" target="_blank" rel="noreferrer">Website</a>` : ""}
      ${identity.links.x ? `<a href="${escapeHtml(identity.links.x)}" target="_blank" rel="noreferrer">X</a>` : ""}
      ${identity.links.email ? `<a href="mailto:${escapeHtml(identity.links.email)}">Email</a>` : ""}
    </div>

    <footer>
      <span class="pill">PortHub preview · MOCK</span>
      &nbsp; vibe: “${escapeHtml(vibe)}” — the live Opus design will render this bespoke to your vibe.
    </footer>
  </div>
</body>
</html>`;
  return injectData(html, data);
}

// ---------- public API ----------

export async function buildDesign(
  data: ProfileData,
  vibe: string,
): Promise<{ code: string; usage: UsageRecord | null }> {
  return isMock
    ? { code: renderMock(data, vibe), usage: null }
    : liveDesign(data, vibe);
}
