"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";

interface GenEvent {
  stage: string;
  message?: string;
  slug?: string;
  error?: string;
}

function GenerateInner() {
  const params = useSearchParams();
  const username = params.get("u") ?? "";
  const vibe = params.get("v") ?? "";

  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!username || !vibe) {
      setError("Missing username or vibe.");
      return;
    }

    const ctrl = new AbortController();

    void (async () => {
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ username, vibe }),
          signal: ctrl.signal,
        });

        if (!res.ok || !res.body) {
          const data = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          setError(data?.error ?? `Request failed (${res.status}).`);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const blocks = buffer.split("\n\n");
          buffer = blocks.pop() ?? "";
          for (const block of blocks) {
            const line = block.trim();
            if (!line.startsWith("data:")) continue;
            const ev = JSON.parse(line.slice(5).trim()) as GenEvent;

            if (ev.stage === "error") {
              setError(ev.error ?? "Generation failed.");
              return;
            }
            if (ev.message) setLog((l) => [...l, ev.message!]);
            if (ev.stage === "done" && ev.slug) {
              window.location.href = `${window.location.protocol}//${ev.slug}.${ROOT_DOMAIN}`;
              return;
            }
          }
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setError((e as Error).message);
        }
      }
    })();

    return () => ctrl.abort();
  }, [username, vibe]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#08080c] px-6 text-white">
      <div className="w-full max-w-md">
        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-5">
            <p className="font-medium text-red-300">Couldn’t generate</p>
            <p className="mt-1 text-sm text-white/60">{error}</p>
            <Link
              href="/"
              className="mt-4 inline-block text-sm text-indigo-300 hover:underline"
            >
              ← Try again
            </Link>
          </div>
        ) : (
          <div>
            <p className="text-sm tracking-widest text-white/40 uppercase">
              Building {username}
            </p>
            <div className="mt-6 space-y-2 font-mono text-sm">
              {log.map((line, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 text-white/70"
                >
                  <span className="text-green-400">→</span> {line}
                </div>
              ))}
              <div className="flex items-center gap-2 text-white/40">
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
                working…
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function GeneratePage() {
  return (
    <Suspense>
      <GenerateInner />
    </Suspense>
  );
}
