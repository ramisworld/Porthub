"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import type { ProfileData } from "~/server/profile/model";
import { EditModal } from "./edit-modal";
import { DomainTile } from "./domain-tile";

/**
 * Dashboard view — viewport-fit on desktop (no scroll), scrollable on mobile.
 *
 * Layout (desktop):
 *   row 1   header           — title, meta, primary CTAs (flex-none)
 *   row 2   preview iframe   — flex-1 min-h-0; fills the remaining height
 *   row 3   secondary bar    — URL · copy · visibility (flex-none)
 *
 * Edit opens a liquid-glass modal in the same screen instead of routing away.
 * Delete intentionally absent from the dashboard (keeps the success screen
 * single-purposed; the backend route is still there for future flows).
 */
export function DashboardView(props: {
  id: string;
  slug: string;
  githubUsername: string;
  isPublic: boolean;
  views: number;
  createdAt: string;
  updatedAt: string;
  publicUrl: string;
  embedUrl: string;
  profileData: ProfileData;
}) {
  const router = useRouter();

  const [copied, setCopied] = useState(false);
  const [isPublic, setIsPublic] = useState(props.isPublic);
  const [visError, setVisError] = useState<string | null>(null);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);

  const setPublicMut = api.portfolio.setPublic.useMutation({
    onError: (err) => {
      // Roll back the optimistic flip and surface the reason — silent failure
      // is what made the toggle feel "stuck" before.
      setIsPublic((v) => !v);
      setVisError(err.message);
      window.setTimeout(() => setVisError(null), 3000);
    },
    onSuccess: () => {
      setVisError(null);
      router.refresh();
    },
  });

  const toggleVisibility = () => {
    // Use the functional setter so two fast clicks resolve against the latest
    // value, not a captured-closure stale value.
    setIsPublic((current) => {
      const next = !current;
      setPublicMut.mutate({ isPublic: next });
      return next;
    });
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(props.publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* noop */
    }
  };

  const created = new Date(props.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  const iframeSrc = `${props.embedUrl}?v=${reloadKey}`;

  // Saving in the modal triggers a preview refresh so the user sees their
  // edits reflected without leaving the dashboard.
  const refreshPreview = () => {
    setPreviewLoaded(false);
    setReloadKey((k) => k + 1);
  };

  return (
    <div className="flex h-full w-full flex-col gap-3 py-3 md:gap-4 md:py-4">
      {/* Row 1 — header ------------------------------------------------------ */}
      <header className="flex flex-none flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.025] px-2.5 py-0.5 text-[9.5px] font-medium tracking-[0.18em] text-white/55 uppercase backdrop-blur-md">
            <span className="h-1 w-1 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
            Beta · 1 per account
          </div>
          <h1 className="text-balance text-2xl font-medium leading-[1.05] tracking-tight md:text-3xl">
            <span className="text-white">Your portfolio,</span>{" "}
            <span className="bg-gradient-to-b from-white to-white/55 bg-clip-text text-transparent">
              live.
            </span>
          </h1>
          <p className="mt-0.5 text-[11.5px] text-white/40">
            <span className="font-mono text-white/65">
              @{props.githubUsername}
            </span>{" "}
            · {created} · {props.views} view{props.views === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={props.publicUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3.5 text-[13px] font-medium text-white/85 transition hover:bg-white/[0.07] hover:text-white"
          >
            Preview
            <ExternalArrow />
          </a>
          <button
            type="button"
            onClick={() => setEditorOpen(true)}
            className="group inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3.5 text-[13px] font-medium text-black transition hover:bg-white/90"
          >
            Edit
            <Arrow />
          </button>
        </div>
      </header>

      {/* Row 2 — preview iframe --------------------------------------------- */}
      <PreviewFrame
        src={iframeSrc}
        loaded={previewLoaded}
        onLoad={() => setPreviewLoaded(true)}
        onReload={refreshPreview}
        publicUrl={props.publicUrl}
      />

      {/* Row 3 — secondary bar ---------------------------------------------- */}
      <div className="flex flex-none flex-col items-stretch gap-2 sm:flex-row">
        {/* URL */}
        <div className="flex h-10 min-w-0 flex-1 items-center gap-1 rounded-xl border border-white/[0.06] bg-black/30 px-1 backdrop-blur-md">
          <span className="px-2 font-mono text-[12.5px] text-white/35 select-none">
            ↳
          </span>
          <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-white/80">
            {props.publicUrl}
          </span>
          <button
            type="button"
            onClick={copy}
            className="inline-flex h-8 items-center rounded-md px-2.5 text-[11.5px] text-white/55 transition hover:bg-white/[0.04] hover:text-white"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        {/* Visibility — the whole tile is clickable so the affordance never
            relies on hitting the small toggle exactly. */}
        <button
          type="button"
          onClick={toggleVisibility}
          aria-pressed={isPublic}
          className="flex h-10 items-center gap-3 rounded-xl border border-white/[0.06] bg-black/25 px-3 text-left backdrop-blur-md transition hover:bg-black/35"
        >
          <div className="leading-tight">
            <p className="text-[12px] text-white">
              {visError
                ? "Try again"
                : isPublic
                  ? "Public"
                  : "Private"}
            </p>
            <p className="text-[10.5px] text-white/45">
              {visError ??
                (isPublic ? "Indexable" : "Hidden · only direct link works")}
            </p>
          </div>
          <Toggle checked={isPublic} />
        </button>

        {/* Custom domain — opens a modal for add/manage. */}
        <DomainTile />
      </div>

      {/* Modal --------------------------------------------------------------- */}
      {editorOpen && (
        <EditModal
          initial={props.profileData}
          githubUsername={props.githubUsername}
          onClose={() => setEditorOpen(false)}
          onSaved={refreshPreview}
        />
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Preview frame
// ───────────────────────────────────────────────────────────────────────────

function PreviewFrame({
  src,
  loaded,
  onLoad,
  onReload,
  publicUrl,
}: {
  src: string;
  loaded: boolean;
  onLoad: () => void;
  onReload: () => void;
  publicUrl: string;
}) {
  return (
    <div
      className="relative flex min-h-[55vh] flex-1 flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-xl sm:min-h-[260px]"
      style={{
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.10), 0 30px 60px -20px rgba(0,0,0,0.65)",
      }}
    >
      {/* Faux browser chrome */}
      <div className="relative flex flex-none items-center gap-3 border-b border-white/[0.06] bg-black/40 px-4 py-2">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
        </span>
        <span className="flex-1 truncate text-center font-mono text-[11px] text-white/45">
          {publicUrl.replace(/^https?:\/\//, "")}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Reload preview"
            onClick={onReload}
            className="inline-flex h-6 items-center justify-center rounded-md px-1.5 text-[11px] text-white/55 transition hover:bg-white/[0.05] hover:text-white"
          >
            ↻
          </button>
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Open in new tab"
            className="inline-flex h-6 items-center justify-center rounded-md px-1.5 text-[11px] text-white/55 transition hover:bg-white/[0.05] hover:text-white"
          >
            ↗
          </a>
        </div>
      </div>

      {/* Render area — flex-1 makes the iframe fill the available height on
          desktop without scroll; on mobile it's tall enough to be useful. */}
      <div className="relative min-h-[260px] flex-1">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-2 text-[12px] text-white/45">
              <Spinner />
              Rendering preview…
            </div>
          </div>
        )}
        <iframe
          key={src}
          src={src}
          title="Portfolio preview"
          loading="lazy"
          sandbox="allow-scripts allow-same-origin"
          referrerPolicy="no-referrer"
          onLoad={(e) => {
            // Force the preview to start at the top of the rendered portfolio.
            // The engine's intro animations sometimes drag scroll position off
            // before reveal, leaving the user staring at the middle of the
            // page on first paint. Same-origin so we can poke contentWindow.
            try {
              e.currentTarget.contentWindow?.scrollTo(0, 0);
            } catch {
              /* cross-origin or detached — harmless */
            }
            onLoad();
          }}
          className={`h-full w-full bg-[#05060a] transition-opacity duration-300 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Subcomponents
// ───────────────────────────────────────────────────────────────────────────

function Toggle({ checked }: { checked: boolean }) {
  // Pure presentational chip — the parent tile (a button) owns the click.
  return (
    <span
      aria-hidden
      className={`relative inline-block h-5 w-9 shrink-0 rounded-full border transition ${
        checked
          ? "border-emerald-400/40 bg-emerald-400/25"
          : "border-white/10 bg-white/[0.04]"
      }`}
    >
      <span
        className={`absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)] transition-all ${
          checked ? "left-[20px]" : "left-0.5"
        }`}
      />
    </span>
  );
}

function Arrow() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden
      className="transition-transform group-hover:translate-x-0.5"
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

function ExternalArrow() {
  return (
    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M5 3h6v6M11 3L4 10"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/15 border-t-white/70"
    />
  );
}

