"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "~/trpc/react";
import type { DomainWithInstructions } from "~/server/api/routers/domain";

/**
 * "Add custom domain" modal. Same liquid-glass language as the editor.
 *
 * Flow:
 *   Step 1   Input hostname           (portfolio.max.com)
 *   Step 2   Show two DNS records     (CNAME + ownership TXT) with Copy
 *   Step 3   "Check now" polls Railway ("waiting on DNS", "active!", ...)
 *
 * The user can close at any time; the row stays in the DB and the dashboard
 * tile keeps the current status. The only destructive button here is
 * "Remove" in the records step, which deletes the in-progress hostname.
 */
export function DomainModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const utils = api.useUtils();
  const mine = api.domain.mine.useQuery();

  // Current state derives from whether we already have a row:
  //   no row → input view
  //   row exists → records view (which also shows status + Recheck)
  const existing = mine.data;

  const [hostname, setHostname] = useState("");
  const [error, setError] = useState<string | null>(null);

  const add = api.domain.add.useMutation({
    onSuccess: async () => {
      setError(null);
      await utils.domain.mine.invalidate();
    },
    onError: (e) => setError(e.message),
  });

  const recheck = api.domain.recheck.useMutation({
    onSuccess: async () => {
      await utils.domain.mine.invalidate();
    },
  });

  const remove = api.domain.remove.useMutation({
    onSuccess: async () => {
      await utils.domain.mine.invalidate();
      setHostname("");
    },
  });

  // Auto-poll while the domain is connecting so the user never has to sit
  // there clicking "Check now". Every 20s (well under the 6/min rate limit,
  // leaving room for a manual click). Stops automatically once it's live.
  const recheckRef = useRef(recheck);
  recheckRef.current = recheck;
  const connecting = !!existing && existing.status !== "active";
  useEffect(() => {
    if (!connecting) return;
    const id = window.setInterval(() => {
      const r = recheckRef.current;
      if (!r.isPending) r.mutate();
    }, 20000);
    return () => window.clearInterval(id);
    // Re-arm only when the domain id or its status changes — not on every poll.
  }, [connecting, existing?.id, existing?.status]);

  // Lock body scroll while open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Esc to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!hostname.trim()) {
      setError("Enter a domain.");
      return;
    }
    add.mutate({ hostname: hostname.trim() });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="domain-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center px-3 py-4 sm:px-6 sm:py-8"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/65 backdrop-blur-md"
      />

      <div
        className="relative flex w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-white/[0.10] bg-white/[0.04] backdrop-blur-2xl"
        style={{
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.14), 0 50px 80px -25px rgba(0,0,0,0.75)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-x-10 -top-10 h-40 opacity-70"
          style={{
            background:
              "radial-gradient(60% 70% at 50% 0%, rgba(140,150,255,0.18), transparent 70%)",
          }}
        />

        {/* Header */}
        <header className="relative flex flex-none items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-medium tracking-[0.18em] text-indigo-200/70 uppercase">
              Custom domain
            </p>
            <h2
              id="domain-modal-title"
              className="text-[15px] font-medium tracking-tight text-white"
            >
              {existing ? "Connect your domain" : "Add your own domain"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/55 transition hover:bg-white/[0.06] hover:text-white"
          >
            <CloseIcon />
          </button>
        </header>

        {/* Body */}
        <div className="relative px-5 py-5">
          {mine.isLoading ? (
            <div className="flex items-center gap-2 text-[12.5px] text-white/55">
              <Spinner />
              Loading…
            </div>
          ) : existing ? (
            <RecordsStep
              domain={existing}
              onRecheck={() => recheck.mutate()}
              rechecking={recheck.isPending}
              onRemove={() => remove.mutate()}
              removing={remove.isPending}
            />
          ) : (
            <form onSubmit={submit} noValidate className="space-y-4">
              <p className="text-[13px] leading-relaxed text-white/65">
                Enter the domain (or subdomain) where you&apos;d like your
                portfolio to live. You&apos;ll add two records at your domain
                provider in the next step.
              </p>
              <label className="block">
                <span className="mb-1.5 block text-[11.5px] tracking-wide text-white/55">
                  Your domain
                </span>
                <input
                  value={hostname}
                  onChange={(e) => setHostname(e.target.value)}
                  placeholder="portfolio.your-domain.com"
                  autoFocus
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                  className="h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 font-mono text-[14px] outline-none placeholder:text-white/25 focus:border-indigo-400/40"
                />
              </label>
              {error && (
                <p role="alert" className="text-[12.5px] text-red-300/90">
                  {error}
                </p>
              )}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-10 items-center rounded-lg px-3 text-[13px] text-white/65 transition hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={add.isPending}
                  className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-white px-4 text-[13px] font-medium text-black transition hover:bg-white/90 disabled:opacity-50"
                >
                  {add.isPending ? (
                    <>
                      <Spinner dark />
                      Connecting
                    </>
                  ) : (
                    "Continue"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Records step
// ───────────────────────────────────────────────────────────────────────────

type DomainRow = DomainWithInstructions;

function RecordsStep({
  domain,
  onRecheck,
  rechecking,
  onRemove,
  removing,
}: {
  domain: DomainRow;
  onRecheck: () => void;
  rechecking: boolean;
  onRemove: () => void;
  removing: boolean;
}) {
  const { cname, txt } = domain.instructions;

  const banner =
    domain.status === "active"
      ? {
          tone: "ok" as const,
          title: `Live at ${domain.hostname}`,
          body: "DNS verified and SSL issued. Visitors can use this domain now.",
        }
      : domain.status === "action_needed"
        ? {
            tone: "warn" as const,
            title: "Something's not quite right",
            body:
              domain.errorReason ??
              "We can't verify these records yet. Double-check both lines below and try again.",
          }
          : domain.status === "error"
          ? {
              tone: "err" as const,
              title: "Connection error",
              body:
                domain.errorReason ??
                "Cloudflare reported an error. Try removing the domain and re-adding it.",
            }
          : {
              tone: "pending" as const,
              title: "Waiting for DNS",
              body: explainPending(domain),
            };

  return (
    <div className="space-y-4">
      <Banner tone={banner.tone} title={banner.title} body={banner.body} />

      {domain.status !== "active" && (
        <CheckingStrip checking={rechecking} lastCheckedAt={domain.lastCheckedAt} />
      )}

      <div>
        <p className="mb-2 text-[11.5px] font-medium tracking-[0.14em] text-white/55 uppercase">
          Add these records at your domain provider
        </p>
        <p className="mb-3 text-[12.5px] text-white/45">
          Open your registrar&apos;s DNS settings (GoDaddy, Namecheap,
          Cloudflare, etc.) and paste each value below. Use the{" "}
          <kbd className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[11px] text-white/75">
            Copy
          </kbd>{" "}
          buttons.
        </p>

        <div className="space-y-2.5">
          <RecordRow
            type="CNAME"
            name={cname.name}
            value={cname.value}
            purpose="Forwards visitors to your portfolio"
          />
          {txt && (
            <RecordRow
              type="TXT"
              name={txt.name}
              value={txt.value}
              purpose="Proves you own this domain"
            />
          )}
        </div>

        {!txt && (
          <p className="mt-2 text-[11.5px] text-white/40">
            Add the CNAME first — the verification record appears here
            automatically once your domain is detected.
          </p>
        )}

        <p className="mt-3 text-[11.5px] text-white/40">
          Using a <span className="text-white/65">root domain</span> (like
          your.com)? Some providers can&apos;t point it with a CNAME — use a
          subdomain such as{" "}
          <span className="font-mono text-white/65">me.your.com</span>, or an
          ALIAS/ANAME record if your provider supports it.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-4">
        <button
          type="button"
          onClick={onRemove}
          disabled={removing}
          className="inline-flex h-9 items-center rounded-lg border border-red-500/25 bg-red-500/[0.05] px-3 text-[12.5px] font-medium text-red-200 transition hover:bg-red-500/[0.10] disabled:opacity-50"
        >
          {removing ? "Removing…" : "Remove domain"}
        </button>

        {domain.status !== "active" && (
          <button
            type="button"
            onClick={onRecheck}
            disabled={rechecking}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-4 text-[12.5px] font-medium text-black transition hover:bg-white/90 disabled:opacity-50"
          >
            {rechecking ? (
              <>
                <Spinner dark />
                Checking
              </>
            ) : (
              "Check now"
            )}
          </button>
        )}
      </div>
    </div>
  );
}

/** Live "we're working on it" strip shown while a domain is connecting, so the
 *  UI never looks frozen. Ticks a relative "last checked" time each second. */
function CheckingStrip({
  checking,
  lastCheckedAt,
}: {
  checking: boolean;
  lastCheckedAt: Date | null;
}) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  const ago = lastCheckedAt ? relativeTime(lastCheckedAt) : null;
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[11.5px] text-white/60">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400/60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-400" />
      </span>
      <span>
        {checking
          ? "Checking now…"
          : "Checking automatically every 20s"}
        {ago && !checking ? ` · last checked ${ago}` : ""}
      </span>
    </div>
  );
}

function relativeTime(d: Date): string {
  const secs = Math.max(
    0,
    Math.round((Date.now() - new Date(d).getTime()) / 1000),
  );
  if (secs < 5) return "just now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  return `${mins}m ago`;
}

function explainPending(domain: DomainRow): string {
  // `ownershipStatus` caches Cloudflare's hostname status; `sslStatus` the cert.
  const own = (domain.ownershipStatus ?? "").toLowerCase();
  const ssl = (domain.sslStatus ?? "").toLowerCase();
  if (!own || own.startsWith("pending")) {
    return "We're waiting for your CNAME to resolve to PortHub. DNS changes can take a few minutes.";
  }
  if (ssl.startsWith("pending") || ssl === "initializing") {
    return "DNS looks good. Cloudflare is validating and issuing your certificate (usually under a minute).";
  }
  return "Waiting on DNS propagation. Make sure both records are saved at your provider.";
}

// ───────────────────────────────────────────────────────────────────────────
// Atoms
// ───────────────────────────────────────────────────────────────────────────

function RecordRow({
  type,
  name,
  value,
  purpose,
}: {
  type: string;
  name: string;
  value: string;
  purpose: string;
}) {
  const [copied, setCopied] = useState<"" | "name" | "value">("");
  const copy = async (kind: "name" | "value", text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(""), 1400);
    } catch {
      /* noop */
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-black/30">
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.04] px-3 py-1.5">
        <span className="font-mono text-[11px] tracking-[0.14em] text-indigo-200/80 uppercase">
          {type}
        </span>
        <span className="text-[11px] text-white/40">{purpose}</span>
      </div>
      <RecordField
        label="Name / Host"
        value={name}
        copied={copied === "name"}
        onCopy={() => copy("name", name)}
      />
      <RecordField
        label="Value / Target"
        value={value}
        copied={copied === "value"}
        onCopy={() => copy("value", value)}
      />
    </div>
  );
}

function RecordField({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-white/[0.04] px-3 py-2 last:border-b-0">
      <span className="w-24 shrink-0 text-[11px] tracking-wide text-white/45">
        {label}
      </span>
      <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-white/85">
        {value}
      </span>
      <button
        type="button"
        onClick={onCopy}
        className="inline-flex h-8 items-center rounded-md px-2.5 text-[11.5px] text-white/55 transition hover:bg-white/[0.05] hover:text-white"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

function Banner({
  tone,
  title,
  body,
}: {
  tone: "ok" | "warn" | "err" | "pending";
  title: string;
  body: string;
}) {
  const style =
    tone === "ok"
      ? "border-emerald-400/25 bg-emerald-400/[0.05] text-emerald-100"
      : tone === "warn"
        ? "border-amber-400/25 bg-amber-400/[0.05] text-amber-100"
        : tone === "err"
          ? "border-red-500/25 bg-red-500/[0.05] text-red-100"
          : "border-white/10 bg-white/[0.025] text-white/85";
  const dot =
    tone === "ok"
      ? "bg-emerald-300"
      : tone === "warn"
        ? "bg-amber-300"
        : tone === "err"
          ? "bg-red-400"
          : "bg-white/55";
  return (
    <div className={`rounded-xl border px-3.5 py-3 ${style}`}>
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        <p className="text-[13px] font-medium">{title}</p>
      </div>
      <p className="mt-1 ml-3.5 text-[12px] leading-relaxed opacity-80">
        {body}
      </p>
    </div>
  );
}

function Spinner({ dark = false }: { dark?: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 ${
        dark ? "border-black/30 border-t-black" : "border-white/30 border-t-white"
      }`}
    />
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M3 3l8 8M11 3l-8 8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
