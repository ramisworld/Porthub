"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function CheckEmailInner() {
  const email = useSearchParams().get("email") ?? "";

  return (
    <div className="w-full max-w-md text-center">
      <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-md">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M3 7l9 6 9-6M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-white/70"
          />
        </svg>
      </div>

      <h1 className="text-3xl font-medium tracking-tight">Check your email</h1>
      <p className="mt-3 text-pretty text-[15px] text-white/55">
        We sent a sign-in link to{" "}
        <span className="text-white">{email || "your inbox"}</span>. Click it to
        finish signing in.
      </p>

      <div
        className="mt-8 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 text-left text-[12.5px] leading-relaxed text-white/45 backdrop-blur-xl"
        style={{
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.08), 0 20px 40px -20px rgba(0,0,0,0.5)",
        }}
      >
        <p className="mb-2 font-medium text-white/70">Didn&apos;t get it?</p>
        <ul className="list-inside list-disc space-y-1">
          <li>Check spam or promotions.</li>
          <li>The link expires after 10 minutes.</li>
          <li>You can request another from the sign-in page.</li>
        </ul>
      </div>

      <Link
        href="/sign-in"
        className="mt-8 inline-block text-sm text-white/50 transition hover:text-white"
      >
        ← Use a different email
      </Link>
    </div>
  );
}
