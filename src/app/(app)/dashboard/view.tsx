"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProfileData } from "~/server/profile/model";
import { EditModal } from "./edit-modal";
import { DomainTile } from "./domain-tile";

/**
 * Dashboard view — viewport-fit on desktop (no scroll), scrollable on mobile.
 *
 * Layout (desktop):
 *   row 1   header           — title, meta, [custom domain · Preview · Edit] (flex-none)
 *   row 2   preview iframe   — flex-1 min-h-0; fills the remaining height
 *
 * Edit opens a liquid-glass modal in the same screen instead of routing away.
 * The custom-domain tile lives in the header action cluster; the old bottom
 * bar (slug URL + copy + public/private toggle) was removed for a cleaner,
 * single-focus result screen.
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

  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  // Local mirror of the server-rendered profile data so the editor reflects
  // user edits immediately on reopen — without it, `props.profileData` is
  // the snapshot from the initial page load and stale until a hard refresh.
  const [profileData, setProfileData] = useState<ProfileData>(
    props.profileData,
  );

  // If the server prop changes (e.g. after router.refresh) but the editor is
  // closed, accept the new server state as the source of truth.
  useEffect(() => {
    if (!editorOpen) setProfileData(props.profileData);
  }, [props.profileData, editorOpen]);

  // Format deterministically so SSR (server locale) and CSR (browser locale)
  // produce identical strings. `toLocaleDateString(undefined, …)` is locale
  // dependent and was causing a hydration mismatch (en-NZ "26 Jun" on the
  // server vs en-US "Jun 26" in the browser).
  const created = (() => {
    const d = new Date(props.createdAt);
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    return `${d.getDate()} ${months[d.getMonth()]}`;
  })();

  const iframeSrc = `${props.embedUrl}?v=${reloadKey}`;

  // Saving in the modal triggers a preview refresh so the user sees their
  // edits reflected without leaving the dashboard. We also pull fresh server
  // data so the rest of the dashboard (updatedAt, etc.) stays in sync.
  const refreshPreview = () => {
    setPreviewLoaded(false);
    setReloadKey((k) => k + 1);
    router.refresh();
  };

  // Called by the editor on every successful save with the freshly-persisted
  // payload — keeps the local mirror in lock-step so re-opening the modal
  // shows the latest credentials, abilities, etc. without a full reload.
  const handleSaved = (saved: ProfileData) => {
    setProfileData(saved);
    refreshPreview();
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
          {/* Custom domain — moved up here from the old bottom bar. */}
          <DomainTile />
          <a
            href={props.publicUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3.5 text-[13px] font-medium text-white/85 transition hover:bg-white/[0.07] hover:text-white"
          >
            Preview
            <ExternalArrow />
          </a>
          <button
            type="button"
            onClick={() => setEditorOpen(true)}
            className="group inline-flex h-10 items-center gap-1.5 rounded-lg bg-white px-3.5 text-[13px] font-medium text-black transition hover:bg-white/90"
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

      {/* Modal --------------------------------------------------------------- */}
      {editorOpen && (
        <EditModal
          initial={profileData}
          githubUsername={props.githubUsername}
          onClose={() => setEditorOpen(false)}
          onSaved={handleSaved}
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
      <div className="relative min-h-[260px] flex-1 overflow-hidden">
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
            // Best-effort reset for the same-origin /sites wrapper. The
            // generated portfolio itself is sandboxed one frame deeper, so its
            // runtime must avoid doing anything that causes an initial scroll.
            try {
              e.currentTarget.contentWindow?.scrollTo(0, 0);
            } catch {
              /* cross-origin or detached — harmless */
            }
            onLoad();
          }}
          className={`absolute inset-0 h-full w-full bg-[#05060a] transition-opacity duration-300 ${
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
