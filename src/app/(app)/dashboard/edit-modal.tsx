"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  profileDataSchema,
  type Ability,
  type Credential,
  type ProfileData,
  type Project,
  type Stat,
} from "~/server/profile/model";
import { ISSUERS, ISSUER_BY_KEY } from "~/lib/issuers";
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
  /** Called after a successful save with the freshly-persisted payload. */
  onSaved: (saved: ProfileData) => void;
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
    onError: (e) => setError(e.message),
  });

  // Centralized "save succeeded" handler. Takes the validated ProfileData
  // (output of zod parse, defaults applied) so callers don't pay the cost
  // of re-narrowing the input-shape variables.
  const handleSaveSuccess = (next: ProfileData) => {
    setBaseline(structuredClone(next));
    setSaved(true);
    window.clearTimeout(savedTimer.current);
    savedTimer.current = window.setTimeout(() => setSaved(false), 2400);
    setConfirmClose(false);
    onSaved(next);
  };

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
      credentials: (data.credentials ?? []).map((c) => ({
        ...c,
        issuerKey: blankToUndef(c.issuerKey),
        issuedAt: blankToUndef(c.issuedAt),
        expiresAt: blankToUndef(c.expiresAt),
        credentialId: blankToUndef(c.credentialId),
        url: blankToUndef(c.url),
        skills: c.skills?.length
          ? c.skills.map((s) => s.trim()).filter(Boolean)
          : undefined,
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

    const next = parsed.data;
    update.mutate(
      { profileData: next },
      { onSuccess: () => handleSaveSuccess(next) },
    );
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
            {tab === "credentials" && (
              <CredentialsSection
                items={data.credentials ?? []}
                onChange={(credentials) => setData({ ...data, credentials })}
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

type TabId =
  | "identity"
  | "abilities"
  | "stats"
  | "projects"
  | "credentials";
const TABS: Array<{ id: TabId; label: string }> = [
  { id: "identity", label: "Identity" },
  { id: "abilities", label: "Abilities" },
  { id: "stats", label: "Stats" },
  { id: "projects", label: "Projects" },
  { id: "credentials", label: "Credentials" },
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
    <SectionShell title="Projects" subtitle="Up to 9 — reorder with the arrows">
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
        disabled={items.length >= 9}
      >
        + Add project ({items.length}/9)
      </AddButton>
    </SectionShell>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Credentials
// ───────────────────────────────────────────────────────────────────────────

function CredentialsSection({
  items,
  onChange,
}: {
  items: Credential[];
  onChange: (next: Credential[]) => void;
}) {
  return (
    <SectionShell
      title="Credentials"
      subtitle="Certifications & licenses — up to 20, newest shown first"
    >
      {items.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center">
          <p className="text-[13px] text-white/65">
            No credentials yet. Add one to display it in a dedicated section
            on your portfolio.
          </p>
          <p className="mt-1 text-[11.5px] text-white/40">
            Choose a known issuer to get its logo, or pick{" "}
            <em>Other</em> to enter a custom name.
          </p>
        </div>
      )}

      <ul className="space-y-3">
        {items.map((c, i) => (
          <CredentialCardEditor
            key={i}
            value={c}
            index={i}
            total={items.length}
            onChange={(next) => {
              const arr = [...items];
              arr[i] = next;
              onChange(arr);
            }}
            onRemove={() => onChange(items.filter((_, j) => j !== i))}
            onMove={(dir) => onChange(move(items, i, dir))}
          />
        ))}
      </ul>

      <AddButton
        onClick={() =>
          onChange([
            ...items,
            {
              title: "",
              issuer: "",
              issuerKey: undefined,
              issuedAt: undefined,
              expiresAt: undefined,
              credentialId: undefined,
              url: undefined,
              skills: undefined,
            },
          ])
        }
        disabled={items.length >= 20}
      >
        + Add credential ({items.length}/20)
      </AddButton>
    </SectionShell>
  );
}

// Tri-state for the issuer field UX:
//   "unset"  – nothing chosen yet (default for new rows; placeholder shown)
//   "known"  – a registered issuer was picked (logo + locked label)
//   "other"  – user picked "Other…" and types a free-form issuer name
type IssuerMode = "unset" | "known" | "other";

function deriveIssuerMode(value: Credential): IssuerMode {
  if (value.issuerKey && ISSUER_BY_KEY[value.issuerKey]) return "known";
  if (value.issuer && value.issuer.trim().length > 0) return "other";
  return "unset";
}

function CredentialCardEditor({
  value,
  index,
  total,
  onChange,
  onRemove,
  onMove,
}: {
  value: Credential;
  index: number;
  total: number;
  onChange: (next: Credential) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const [noExpiry, setNoExpiry] = useState<boolean>(() => !value.expiresAt);
  const [skillsInput, setSkillsInput] = useState<string>(() =>
    (value.skills ?? []).join(", "),
  );
  // Mode is derived from the credential, but kept in local state so picking
  // "Other…" sticks even before the user types anything (a freshly-clicked
  // "Other…" has empty issuer text, which would otherwise fall back to
  // "unset" via deriveIssuerMode).
  const [mode, setMode] = useState<IssuerMode>(() => deriveIssuerMode(value));

  // Whenever the parent reassigns this credential (e.g. after reorder) keep
  // local state in sync — but don't clobber a sticky "other" mode if the
  // user picked it before typing.
  useEffect(() => {
    setNoExpiry(!value.expiresAt);
    setSkillsInput((value.skills ?? []).join(", "));
    setMode((current) => {
      const derived = deriveIssuerMode(value);
      // A "sticky" Other selection (no key yet, mode already other) wins so
      // the dropdown doesn't snap back to "Choose issuer…" while typing.
      if (current === "other" && !value.issuerKey) return "other";
      return derived;
    });
  }, [value]);

  const meta = value.issuerKey ? ISSUER_BY_KEY[value.issuerKey] : undefined;

  return (
    <li className="space-y-3 rounded-xl bg-black/20 p-3 ring-1 ring-white/[0.04]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {meta ? (
            <IssuerLogo svg={meta.svg} size={16} />
          ) : (
            <span
              aria-hidden
              className="inline-block h-2 w-2 shrink-0 rounded-full bg-white/30"
            />
          )}
          <p className="truncate font-mono text-[11px] tracking-[0.14em] text-white/40 uppercase">
            Credential {index + 1}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <ReorderControls index={index} total={total} onMove={onMove} />
          <RemoveButton onClick={onRemove} />
        </div>
      </div>

      <Field label="Title">
        <TextInput
          value={value.title}
          onChange={(v) => onChange({ ...value, title: v })}
          maxLength={140}
          placeholder="Microsoft Certified: Azure AI Engineer Associate"
        />
      </Field>

      <Field label="Issuer">
        <IssuerCombobox
          mode={mode}
          selectedKey={value.issuerKey ?? ""}
          freeformText={value.issuer}
          onPickKnown={(key, label) => {
            setMode("known");
            onChange({ ...value, issuerKey: key, issuer: label });
          }}
          onPickOther={() => {
            setMode("other");
            // Clear the bound issuerKey; keep whatever the user already typed
            // as the freeform issuer label.
            onChange({ ...value, issuerKey: undefined });
          }}
          onClear={() => {
            setMode("unset");
            onChange({ ...value, issuerKey: undefined, issuer: "" });
          }}
        />
        {mode === "other" && (
          <input
            value={value.issuer}
            onChange={(e) => onChange({ ...value, issuer: e.target.value })}
            maxLength={80}
            placeholder="Issuer name (e.g. Acme Institute)"
            autoFocus
            className="mt-2 h-9 w-full rounded-lg border border-white/10 bg-black/30 px-2.5 text-[13.5px] outline-none placeholder:text-white/25 focus:border-indigo-400/40"
          />
        )}
      </Field>

      <Row>
        <Field label="Issued">
          <MonthInput
            value={value.issuedAt ?? ""}
            onChange={(v) => onChange({ ...value, issuedAt: v })}
            max={isoYearMonthNow()}
          />
        </Field>
        <Field
          label="Expires"
          hint={
            <span className="inline-flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={noExpiry}
                onChange={(e) => {
                  setNoExpiry(e.target.checked);
                  if (e.target.checked) {
                    onChange({ ...value, expiresAt: undefined });
                  }
                }}
                className="h-3 w-3 accent-white"
              />
              <span>No expiry</span>
            </span>
          }
        >
          <MonthInput
            value={value.expiresAt ?? ""}
            onChange={(v) => onChange({ ...value, expiresAt: v })}
            disabled={noExpiry}
            min={value.issuedAt}
          />
        </Field>
      </Row>

      <Row>
        <Field label="Credential ID" hint="Optional">
          <TextInput
            value={value.credentialId ?? ""}
            onChange={(v) => onChange({ ...value, credentialId: v })}
            maxLength={80}
            placeholder="FA88A4F6EA27B4CD"
          />
        </Field>
        <Field label="Verify URL" hint="Optional">
          <TextInput
            value={value.url ?? ""}
            onChange={(v) => onChange({ ...value, url: v })}
            inputType="url"
            placeholder="https://learn.microsoft.com/…"
          />
        </Field>
      </Row>

      <Field label="Skills" hint="Comma separated, max 15">
        <TextInput
          value={skillsInput}
          onChange={(v) => {
            setSkillsInput(v);
            const skills = v
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
              .slice(0, 15);
            onChange({
              ...value,
              skills: skills.length ? skills : undefined,
            });
          }}
          placeholder="Azure AI, Cognitive Services, Python"
        />
      </Field>
    </li>
  );
}

/** Renders an issuer's icon-only SVG safely from the registry. */
function IssuerLogo({ svg, size = 18 }: { svg: string; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[5px] bg-white/[0.04] ring-1 ring-white/[0.06]"
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

/**
 * IssuerCombobox — searchable dropdown of known issuers.
 *
 * • Default state shows "Choose issuer…" — no implicit "Other" selection.
 * • Each row renders the issuer's real icon-only logo (no color swatch).
 * • A divider + "Other (custom issuer)" row at the bottom switches the
 *   parent into freeform-text mode; the text input is rendered by the
 *   caller right below this control.
 * • A small ✕ on the trigger lets the user clear the picked issuer.
 */
function IssuerCombobox({
  mode,
  selectedKey,
  freeformText,
  onPickKnown,
  onPickOther,
  onClear,
}: {
  mode: IssuerMode;
  selectedKey: string;
  freeformText: string;
  onPickKnown: (key: string, label: string) => void;
  onPickOther: () => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const selected = selectedKey ? ISSUER_BY_KEY[selectedKey] : undefined;

  // Display logic for the trigger.
  let triggerLabel: string;
  let triggerLogo: React.ReactNode;
  let labelTone = "text-white/85";
  if (mode === "known" && selected) {
    triggerLabel = selected.label;
    triggerLogo = <IssuerLogo svg={selected.svg} size={18} />;
  } else if (mode === "other") {
    triggerLabel = freeformText.trim() || "Other…";
    triggerLogo = (
      <span
        aria-hidden
        className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border border-dashed border-white/25 text-[10px] text-white/55"
      >
        +
      </span>
    );
  } else {
    triggerLabel = "Choose issuer…";
    labelTone = "text-white/40";
    triggerLogo = (
      <span
        aria-hidden
        className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] bg-white/[0.03] ring-1 ring-white/[0.05] text-[10px] text-white/30"
      >
        ?
      </span>
    );
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ISSUERS;
    return ISSUERS.filter((i) => i.label.toLowerCase().includes(q));
  }, [query]);

  // Outside-click + Escape close.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Reset the search query whenever the menu reopens, so the next time the
  // user opens it they see the full list instead of the last filter.
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-full items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-2.5 text-left text-[13.5px] outline-none transition hover:border-white/15 focus:border-indigo-400/40"
      >
        {triggerLogo}
        <span className={`min-w-0 flex-1 truncate ${labelTone}`}>
          {triggerLabel}
        </span>
        {mode !== "unset" && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Clear issuer"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
              setOpen(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onClear();
                setOpen(false);
              }
            }}
            className="flex h-5 w-5 items-center justify-center rounded text-[12px] text-white/40 transition hover:bg-white/[0.06] hover:text-white"
          >
            ×
          </span>
        )}
        <span
          aria-hidden
          className={`text-[10px] text-white/40 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        >
          ▾
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute top-full left-0 z-20 mt-1 w-full overflow-hidden rounded-lg border border-white/10 bg-[#0e1014]/95 shadow-2xl backdrop-blur-xl"
        >
          <div className="p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search issuers…"
              className="h-8 w-full rounded-md border border-white/10 bg-black/40 px-2 text-[12.5px] outline-none placeholder:text-white/30 focus:border-indigo-400/40"
            />
          </div>
          <ul className="max-h-64 overflow-y-auto pb-1">
            {filtered.map((i) => (
              <li key={i.key}>
                <button
                  type="button"
                  onClick={() => {
                    onPickKnown(i.key, i.label);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[12.5px] transition hover:bg-white/[0.06] ${
                    selectedKey === i.key
                      ? "bg-white/[0.05] text-white"
                      : "text-white/80"
                  }`}
                >
                  <IssuerLogo svg={i.svg} size={20} />
                  <span className="truncate">{i.label}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-[12px] text-white/40">No matches.</li>
            )}
            <li className="mt-1 border-t border-white/[0.05]">
              <button
                type="button"
                onClick={() => {
                  onPickOther();
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[12.5px] transition hover:bg-white/[0.06] ${
                  mode === "other" ? "text-white" : "text-white/55 hover:text-white"
                }`}
              >
                <span
                  aria-hidden
                  className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border border-dashed border-white/25 text-[11px] text-white/55"
                >
                  +
                </span>
                Other (custom issuer)
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

/** Native month input — value is `YYYY-MM`. */
function MonthInput({
  value,
  onChange,
  disabled,
  min,
  max,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  min?: string;
  max?: string;
}) {
  return (
    <input
      type="month"
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="h-9 w-full rounded-lg border border-white/10 bg-black/30 px-2.5 text-[13.5px] outline-none focus:border-indigo-400/40 disabled:cursor-not-allowed disabled:opacity-40"
    />
  );
}

function isoYearMonthNow(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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
  hint?: React.ReactNode;
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
