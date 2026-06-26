"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { DomainModal } from "./domain-modal";

/**
 * Compact tile shown on the dashboard secondary toolbar. Three states:
 *
 *   no row              "Add custom domain"          → opens modal
 *   row pending/warn    "Connecting · your.domain"   → opens modal w/ recheck
 *   row active          "your.domain · Live"         → opens modal w/ manage
 *
 * The modal is the single management surface; the tile is just an indicator
 * + entry point so the dashboard stays glanceable.
 */
export function DomainTile() {
  const mine = api.domain.mine.useQuery();
  const [open, setOpen] = useState(false);

  const row = mine.data;

  let label = "Add custom domain";
  let hint = "Use your own .com";
  let dotClass = "bg-white/45";

  if (row) {
    label = row.hostname;
    if (row.status === "active") {
      hint = "Live";
      dotClass = "bg-emerald-400 shadow-[0_0_8px_#34d399]";
    } else if (row.status === "action_needed" || row.status === "error") {
      hint = "Action needed";
      dotClass = "bg-amber-400 shadow-[0_0_8px_#fbbf24]";
    } else {
      hint = "Connecting…";
      dotClass = "bg-indigo-400 shadow-[0_0_8px_#818cf8]";
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 min-w-0 items-center gap-3 rounded-xl border border-white/[0.06] bg-black/25 px-3 text-left backdrop-blur-md transition hover:bg-black/35"
      >
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} />
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-[12px] text-white">{label}</span>
          <span className="block truncate text-[10.5px] text-white/45">
            {hint}
          </span>
        </span>
      </button>

      {open && <DomainModal onClose={() => setOpen(false)} />}
    </>
  );
}
