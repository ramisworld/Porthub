"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  profileDataSchema,
  type Ability,
  type ProfileData,
  type Project,
  type Stat,
} from "~/server/profile/model";
import { api } from "~/trpc/react";

/**
 * Edit modal — a liquid-glass overlay that lives on top of the dashboard.
 *
 *   ● Section nav (Identity · Abilities · Stats · Projects) on the left
 *   ● Scrollable form on the right
 *   ● Sticky footer: status + Save
 *   ● Closing with unsaved changes prompts: Save · Discard · Cancel
 *   ● Saving keeps the modal open (and refreshes the preview behind it);
 *     only the ✕ in the header closes it.
 *
 * `githubUsername` is read-only during beta — changing it would invalidate
 * the LLM-curated facts without a re-scrape, which the beta cap forbids.
 */
export function EditModal({
  initial,
  githubUsername,
  onClose,
  onSaved,
}: {
  initial: ProfileData;
  githubUsername: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [data, setData] = useState<ProfileData>(() => structuredClone(initial));
  const [baseline, setBaseline] = useState<ProfileData>(() =>
    structuredClone(initial),
  );
  const [tab, setTab] = useState<TabId>("identity");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const savedTimer = useRef<number | undefined>(undefined);

  // Dirty = current form != last-saved baseline.
  const dirty = useMemo(
    () => JSON.stringify(data) !== JSON.stringify(baseline),
    [data, baseline],
  );

  const update = api.portfolio.updateProfileData.useMutation({
    onSuccess: () => {
      setBaseline(structuredClone(data)); // new clean baseline
      setSaved(true);
      window.clearTimeout(savedTimer.current);
      savedTimer.current = window.setTimeout(() => setSaved(false), 2400);
      setConfirmClose(false);
      onSaved();
    },
    onError: (e) => setError(e.message),
  });

  const save = (): void => {
    setError(null);

    // Coerce optional blanks → undefined, then validate.
    const blankToUndef = (s: string | null | undefined): string | undefined => {
      const t = s?.trim();
      if (!t) return undefined;
      return t;
    };

    const payload: ProfileData = {
      ...data,
      identity: {
        ...data.identity,
        location: blankToUndef(data.identity.location),
        links: {
          ...data.identity.links,
          // GitHub link is derived from the (locked) username on save.
          github: `https://github.com/${githubUsername}`,
          site: blankToUndef(data.identity.links.site),
          x: blankToUndef(data.identity.links.x),
          email: blankToUndef(data.identity.links.email),
        },
      },
      projects: data.projects.map((p) => ({
        ...p,
        demoUrl: blankToUndef(p.demoUrl),
      })),
    };

    const parsed = profileDataSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      const path = first?.path.join(".");
      const where = path && path.length > 0 ? path : "form";
      setError(`Couldn't save (${where}): ${first?.message ?? "invalid"}`);
      return;
    }

    update.mutate({ profileData: parsed.data });
  };

  // ✕ click: clean → close immediately; dirty → ask first.
  const requestClose = () => {
    if (dirty) setConfirmClose(true);
    else onClose();
  };

  // Esc key mirrors the ✕ behavior.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty]);

  // Lock body scroll while the modal is mounted.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center px-3 py-4 sm:px-6 sm:py-8"
    >
      {/* Scrim — clicking it follows the same dirty-prompt path as ✕. */}
      <button
        type="button"
        aria-label="Close editor"
        onClick={requestClose}
        className="absolute inset-0 bg-black/65 backdrop-blur-md"
      />

      {/* The card */}
      <div
        className="relative flex h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/[0.10] bg-white/[0.04] backdrop-blur-2xl sm:h-[min(720px,90vh)]"
        style={{
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.14), 0 50px 80px -25px rgba(0,0,0,0.75)",
        }}
      >
        {/* Top hairline highlight */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
        />
        {/* Soft inner glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-x-10 -top-10 h-40 opacity-70"
          style={{
            background:
              "radial-gradient(60% 70% at 50% 0%, rgba(140,150,255,0.18), transparent 70%)",
          }}
        />

        {/* Header --------------------------------------------------------- */}
        <header className="relative flex flex-none items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-medium tracking-[0.18em] text-indigo-200/70 uppercase">
              Editor
            </p>
            <h2
              id="edit-modal-title"
              className="text-[15px] font-medium tracking-tight text-white"
            >
              {confirmClose ? "Unsaved changes" : "Edit your portfolio"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {dirty && !confirmClose && (
              <span className="text-[11px] text-amber-300/80">
                ● Unsaved
              </span>
            )}
            <button
              type="button"
              onClick={requestClose}
              aria-label="Close"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/55 transition hover:bg-white/[0.06] hover:text-white"
            >
              <CloseIcon />
            </button>
          </div>
        </header>

        {/* Body ----------------------------------------------------------- */}
        <div className="relative grid min-h-0 flex-1 grid-cols-1 sm:grid-cols-[160px_1fr]">
          {/* Section nav */}
          <nav className="flex flex-none gap-1 overflow-x-auto border-b border-white/[0.06] px-3 py-3 sm:flex-col sm:gap-0.5 sm:overflow-visible sm:border-r sm:border-b-0 sm:py-4">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-left text-[12.5px] transition sm:py-2 ${
                  tab === t.id
                    ? "bg-white/[0.08] text-white"
                    : "text-white/55 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {/* Section content */}
          <div className="min-h-0 overflow-y-auto px-5 py-4">
            {tab === "identity" && (
              <IdentitySection
                data={data.identity}
                onChange={(identity) => setData({ ...data, identity })}
                githubUsername={githubUsername}
              />
            )}
            {tab === "abilities" && (
              <AbilitiesSection
                items={data.abilities}
                onChange={(abilities) => setData({ ...data, abilities })}
              />
            )}
            {tab === "stats" && (
              <StatsSection
                items={data.stats}
                onChange={(stats) => setData({ ...data, stats })}
              />
            )}
            {tab === "projects" && (
              <ProjectsSection
                items={data.projects}
                onChange={(projects) => setData({ ...data, projects })}
              />
            )}
          </div>
        </div>

        {/* Footer --------------------------------------------------------- */}
        <footer className="relative flex flex-none items-center justify-between gap-3 border-t border-white/[0.06] bg-black/20 px-5 py-3 backdrop-blur-xl">
          {confirmClose ? (
            <>
              <p className="text-[12.5px] text-amber-200/85">
                Save your changes before closing?
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmClose(false)}
                  disabled={update.isPending}
                  className="inline-flex h-9 items-center rounded-lg px-3 text-[12.5px] text-white/65 transition hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setData(structuredClone(baseline));
                    setConfirmClose(false);
                    onClose();
                  }}
                  disabled={update.isPending}
                  className="inline-flex h-9 items-center rounded-lg border border-white/10 bg-white/[0.04] px-3 text-[12.5px] text-white/80 transition hover:bg-white/[0.08] disabled:opacity-50"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={update.isPending}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-[12.5px] font-medium text-black transition hover:bg-white/90 disabled:opacity-50"
                >
                  {update.isPending ? (
                    <>
                      <Spinner dark />
                      Saving
                    </>
                  ) : (
                    "Save & close"
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="min-w-0 text-[12px]">
                {error ? (
                  <span role="alert" className="text-red-300/90">
                    {error}
                  </span>
                ) : saved ? (
                  <span className="text-emerald-300/90">
                    Saved · your live site is updated.
                  </span>
                ) : dirty ? (
                  <span className="text-white/55">
                    Changes ready to save.
                  </span>
                ) : (
                  <span className="text-white/35">
                    Tweak anything — saves are instant, no regeneration.
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setData(structuredClone(baseline))}
                  disabled={!dirty || update.isPending}
                  className="inline-flex h-9 items-center rounded-lg px-3 text-[12.5px] text-white/65 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={!dirty || update.isPending}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3.5 text-[12.5px] font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {update.isPending ? (
                    <>
                      <Spinner dark />
                      Saving
                    </>
                  ) : (
                    "Save changes"
                  )}
                </button>
              </div>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Tabs
// ───────────────────────────────────────────────────────────────────────────

type TabId = "identity" | "abilities" | "stats" | "projects";
const TABS: Array<{ id: TabId; label: string }> = [
  { id: "identity", label: "Identity" },
  { id: "abilities", label: "Abilities" },
  { id: "stats", label: "Stats" },
  { id: "projects", label: "Projects" },
];

// ───────────────────────────────────────────────────────────────────────────
// Sections
// ───────────────────────────────────────────────────────────────────────────

function IdentitySection({
  data,
  onChange,
  githubUsername,
}: {
  data: ProfileData["identity"];
  onChange: (next: ProfileData["identity"]) => void;
  githubUsername: string;
}) {
  return (
    <SectionShell
      title="Identity"
      subtitle="How you read across the site"
    >
      <Row>
        <Field label="Name">
          <TextInput
            value={data.name}
            onChange={(v) => onChange({ ...data, name: v })}
            maxLength={60}
          />
        </Field>
        <Field label="Role">
          <TextInput
            value={data.role}
            onChange={(v) => onChange({ ...data, role: v })}
            maxLength={60}
            placeholder="Software engineer"
          />
        </Field>
      </Row>

      <Field label="Headline">
        <TextArea
          value={data.headline}
          onChange={(v) => onChange({ ...data, headline: v })}
          maxLength={200}
          rows={2}
        />
      </Field>

      <Row>
        <Field label="Location">
          <TextInput
            value={data.location ?? ""}
            onChange={(v) => onChange({ ...data, location: v })}
            maxLength={60}
            placeholder="Auckland, NZ"
          />
        </Field>
        <Field
          label="GitHub username"
          hint="Locked during beta"
        >
          <TextInput value={githubUsername} onChange={() => undefined} disabled />
        </Field>
      </Row>

      <Row>
        <Field label="Public email">
          <TextInput
            value={data.links.email ?? ""}
            onChange={(v) =>
              onChange({ ...data, links: { ...data.links, email: v } })
            }
            inputType="email"
            placeholder="you@domain.com"
          />
        </Field>
        <Field label="Website">
          <TextInput
            value={data.links.site ?? ""}
            onChange={(v) =>
              onChange({ ...data, links: { ...data.links, site: v } })
            }
            inputType="url"
            placeholder="https://your.site"
          />
        </Field>
      </Row>

      <Field label="X / Twitter URL">
        <TextInput
          value={data.links.x ?? ""}
          onChange={(v) =>
            onChange({ ...data, links: { ...data.links, x: v } })
          }
          inputType="url"
          placeholder="https://x.com/you"
        />
      </Field>
    </SectionShell>
  );
}

function AbilitiesSection({
  items,
  onChange,
}: {
  items: Ability[];
  onChange: (next: Ability[]) => void;
}) {
  return (
    <SectionShell title="Abilities" subtitle="Short labels shown as skills">
      <ul className="space-y-2">
        {items.map((a, i) => (
          <li
            key={i}
            className="flex items-center gap-1 rounded-xl bg-black/25 p-1 ring-1 ring-white/[0.04]"
          >
            <ReorderControls
              index={i}
              total={items.length}
              onMove={(dir) => onChange(move(items, i, dir))}
            />
            <input
              value={a.label}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...a, label: e.target.value };
                onChange(next);
              }}
              maxLength={40}
              placeholder="React interfaces"
              className="h-9 flex-1 bg-transparent px-2 text-[13.5px] outline-none placeholder:text-white/25"
            />
            <RemoveButton
              onClick={() => onChange(items.filter((_, j) => j !== i))}
            />
          </li>
        ))}
      </ul>
      <AddButton
        onClick={() => onChange([...items, { label: "" }])}
        disabled={items.length >= 24}
      >
        + Add ability
      </AddButton>
    </SectionShell>
  );
}

function StatsSection({
  items,
  onChange,
}: {
  items: Stat[];
  onChange: (next: Stat[]) => void;
}) {
  return (
    <SectionShell title="Stats" subtitle="Three to six punchy numbers">
      <ul className="space-y-2">
        {items.map((s, i) => (
          <li
            key={i}
            className="grid grid-cols-[auto_1fr_2fr_auto] items-center gap-1 rounded-xl bg-black/25 p-1 ring-1 ring-white/[0.04]"
          >
            <ReorderControls
              index={i}
              total={items.length}
              onMove={(dir) => onChange(move(items, i, dir))}
            />
            <input
              value={s.value}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...s, value: e.target.value };
                onChange(next);
              }}
              maxLength={12}
              placeholder="1.2k"
              className="h-9 bg-transparent px-2 font-mono text-[13.5px] outline-none placeholder:text-white/25"
            />
            <input
              value={s.label}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...s, label: e.target.value };
                onChange(next);
              }}
              maxLength={24}
              placeholder="GitHub stars"
              className="h-9 bg-transparent px-2 text-[13.5px] outline-none placeholder:text-white/25"
            />
            <RemoveButton
              onClick={() => onChange(items.filter((_, j) => j !== i))}
            />
          </li>
        ))}
      </ul>
      <AddButton
        onClick={() => onChange([...items, { value: "", label: "" }])}
        disabled={items.length >= 8}
      >
        + Add stat
      </AddButton>
    </SectionShell>
  );
}

function ProjectsSection({
  items,
  onChange,
}: {
  items: Project[];
  onChange: (next: Project[]) => void;
}) {
  return (
    <SectionShell title="Projects" subtitle="Up to 8 — reorder with the arrows">
      <ul className="space-y-3">
        {items.map((p, i) => (
          <li
            key={i}
            className="space-y-2 rounded-xl bg-black/20 p-3 ring-1 ring-white/[0.04]"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[11px] tracking-[0.14em] text-white/40 uppercase">
                Project {i + 1}
              </p>
              <div className="flex items-center gap-1">
                <ReorderControls
                  index={i}
                  total={items.length}
                  onMove={(dir) => onChange(move(items, i, dir))}
                />
                <RemoveButton
                  onClick={() => onChange(items.filter((_, j) => j !== i))}
                />
              </div>
            </div>

            <Row>
              <Field label="Name">
                <TextInput
                  value={p.name}
                  onChange={(v) => {
                    const next = [...items];
                    next[i] = { ...p, name: v };
                    onChange(next);
                  }}
                  maxLength={60}
                />
              </Field>
              <Field label="Repo URL">
                <TextInput
                  value={p.repoUrl}
                  onChange={(v) => {
                    const next = [...items];
                    next[i] = { ...p, repoUrl: v };
                    onChange(next);
                  }}
                  inputType="url"
                  placeholder="https://github.com/you/repo"
                />
              </Field>
            </Row>

            <Field label="Blurb" hint="1–2 sentences">
              <TextArea
                value={p.blurb}
                onChange={(v) => {
                  const next = [...items];
                  next[i] = { ...p, blurb: v };
                  onChange(next);
                }}
                maxLength={280}
                rows={2}
              />
            </Field>

            <Row>
              <Field label="Tech" hint="Comma separated">
                <TextInput
                  value={p.tech.join(", ")}
                  onChange={(v) => {
                    const tech = v
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean)
                      .slice(0, 12);
                    const next = [...items];
                    next[i] = { ...p, tech };
                    onChange(next);
                  }}
                  placeholder="TypeScript, Next.js"
                />
              </Field>
              <Field label="Demo URL" hint="Optional">
                <TextInput
                  value={p.demoUrl ?? ""}
                  onChange={(v) => {
                    const next = [...items];
                    next[i] = { ...p, demoUrl: v };
                    onChange(next);
                  }}
                  inputType="url"
                  placeholder="https://demo.your.site"
                />
              </Field>
            </Row>
          </li>
        ))}
      </ul>
      <AddButton
        onClick={() =>
          onChange([
            ...items,
            { name: "", blurb: "", tech: [], repoUrl: "https://github.com/" },
          ])
        }
        disabled={items.length >= 8}
      >
        + Add project ({items.length}/8)
      </AddButton>
    </SectionShell>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Layout primitives
// ───────────────────────────────────────────────────────────────────────────

function SectionShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[14px] font-medium tracking-tight text-white">
          {title}
        </h3>
        {subtitle && (
          <p className="mt-0.5 text-[11.5px] text-white/40">{subtitle}</p>
        )}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-[11px] tracking-wide text-white/55">
        <span>{label}</span>
        {hint && <span className="text-white/30">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  maxLength,
  placeholder,
  disabled,
  inputType = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
  placeholder?: string;
  disabled?: boolean;
  inputType?: "text" | "email" | "url";
}) {
  return (
    <input
      type={inputType}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      maxLength={maxLength}
      placeholder={placeholder}
      disabled={disabled}
      spellCheck={inputType === "text"}
      autoCapitalize="off"
      autoCorrect="off"
      className="h-9 w-full rounded-lg border border-white/10 bg-black/30 px-2.5 text-[13.5px] outline-none placeholder:text-white/25 focus:border-indigo-400/40 disabled:cursor-not-allowed disabled:opacity-50"
    />
  );
}

function TextArea({
  value,
  onChange,
  maxLength,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      maxLength={maxLength}
      rows={rows}
      className="w-full resize-y rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-[13.5px] leading-relaxed outline-none placeholder:text-white/25 focus:border-indigo-400/40"
    />
  );
}

function ReorderControls({
  index,
  total,
  onMove,
}: {
  index: number;
  total: number;
  onMove: (dir: -1 | 1) => void;
}) {
  return (
    <div className="flex shrink-0 flex-col">
      <button
        type="button"
        aria-label="Move up"
        disabled={index === 0}
        onClick={() => onMove(-1)}
        className="flex h-4 w-7 items-center justify-center rounded text-[9px] text-white/45 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
      >
        ▲
      </button>
      <button
        type="button"
        aria-label="Move down"
        disabled={index >= total - 1}
        onClick={() => onMove(1)}
        className="flex h-4 w-7 items-center justify-center rounded text-[9px] text-white/45 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
      >
        ▼
      </button>
    </div>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Remove"
      onClick={onClick}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/45 transition hover:bg-red-500/10 hover:text-red-200"
    >
      ×
    </button>
  );
}

function AddButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mt-3 inline-flex h-8 items-center rounded-lg border border-white/10 bg-white/[0.03] px-3 text-[12px] text-white/70 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
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
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden
    >
      <path
        d="M3 3l8 8M11 3l-8 8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────────

function move<T>(arr: T[], from: number, dir: -1 | 1): T[] {
  const to = from + dir;
  if (to < 0 || to >= arr.length) return arr;
  const next = [...arr];
  const [item] = next.splice(from, 1);
  if (item === undefined) return arr;
  next.splice(to, 0, item);
  return next;
}
