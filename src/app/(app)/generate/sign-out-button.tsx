"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "~/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        if (pending) return;
        setPending(true);
        await signOut();
        // Hard refresh so server components re-resolve the (now empty) session.
        router.replace("/");
        router.refresh();
      }}
      disabled={pending}
      className="text-[12px] text-white/45 transition hover:text-white disabled:opacity-50"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
