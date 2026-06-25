"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Rendered when the signed-in user already owns the maximum number of
 * portfolios (currently 1, beta cap). The Generate CTA is intentionally
 * present but disabled — it telegraphs that more generations exist as a
 * concept while making it clear they're not available right now.
 */
export function BetaCap({
  slug,
  githubUsername,
  createdAt,
  rootDomain,
}: {
  slug: string;
  githubUsername: string;
  createdAt: string;
  rootDomain: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  // Same cursor-tracked sheen as the form so the two screens read as one
  // surface — even when the form isn't here.
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      el.style.setProperty("--mx", `${x}%`);
      el.style.setProperty("--my", `${y}%`);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  const protocol =
    rootDomain.startsWith("localhost") || rootDomain.startsWith("127.")
      ? "http://"
      : "https://";
  const publicUrl = `${protocol}${slug}.${rootDomain}`;

  const created = new Date(createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard unavailable — silent */
    }
  };

  return (
    <div className="w-full">
      <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.025] px-3 py-1 text-[10.5px] font-medium tracking-[0.18em] text-white/55 uppercase backdrop-blur-md">
        <span className="h-1 w-1 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
        Beta · 1 portfolio per account
      </div>

      <h1 className="text-balance text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl">
        You&apos;ve built your portfolio.
        <br />
        <span className="bg-gradient-to-b from-white to-white/55 bg-clip-text text-transparent">
          That&apos;s all for now.
        </span>
      </h1>
      <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/55">
        PortHub is in early beta. Each account can create one portfolio while we
        tune the system. More generations and editing are coming soon.
      </p>

      <div
        ref={cardRef}
        className="relative mt-10 w-full"
        style={
          {
            "--mx": "50%",
            "--my": "0%",
          } as React.CSSProperties
        }
      >
        {/* Outer aura — amber to telegraph "limit reached" without alarming */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-6 rounded-[28px] opacity-80 blur-2xl"
          style={{
            background:
              "radial-gradient(420px circle at var(--mx) var(--my), rgba(251,191,36,0.16), transparent 60%)",
          }}
        />

        <div
          className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5 backdrop-blur-xl"
          style={{
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.10), inset 0 0 0 1px rgba(255,255,255,0.02), 0 30px 60px -20px rgba(0,0,0,0.65)",
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-2xl"
            style={{
              background:
                "radial-gradient(280px circle at var(--mx) var(--my), rgba(255,255,255,0.06), transparent 60%)",
            }}
          />

          {/* Existing portfolio summary */}
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10.5px] font-medium tracking-[0.18em] text-white/45 uppercase">
                Your portfolio
              </p>
              <p className="mt-1 truncate font-mono text-[15px] text-white">
                @{githubUsername}
              </p>
              <p className="mt-0.5 text-[12px] text-white/40">
                Created {created}
              </p>
            </div>
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-white px-4 text-[13.5px] font-medium text-black transition hover:bg-white/90"
            >
              Open
              <Arrow />
            </a>
          </div>

          {/* URL row */}
          <div className="relative mt-4 flex items-center gap-1 rounded-xl bg-black/35 p-1 ring-1 ring-white/[0.04]">
            <span className="flex h-10 items-center px-3 font-mono text-[13px] text-white/35 select-none">
              ↳
            </span>
            <span className="h-10 flex-1 truncate self-center font-mono text-[13.5px] text-white/80">
              {publicUrl}
            </span>
            <button
              type="button"
              onClick={copy}
              className="inline-flex h-10 items-center rounded-lg px-3 text-[12px] text-white/55 transition hover:bg-white/[0.04] hover:text-white"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          {/* Disabled Generate CTA — present, but does nothing */}
          <div className="relative mt-5 border-t border-white/[0.06] pt-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11.5px] text-white/40">
                Generating a new portfolio is paused while PortHub is in beta.
              </p>
              <button
                type="button"
                disabled
                aria-disabled
                title="Limited during beta"
                className="inline-flex h-10 shrink-0 cursor-not-allowed items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-4 text-[13.5px] font-medium text-white/40"
              >
                Generate
                <Arrow muted />
              </button>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-[11px] tracking-wide text-white/30">
        Editing &amp; multiple portfolios coming soon
      </p>
    </div>
  );
}

function Arrow({ muted = false }: { muted?: boolean }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden
      className={muted ? "" : "transition-transform group-hover:translate-x-0.5"}
    >
      <path
        d="M2 7h9m0 0L7 3m4 4l-4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
