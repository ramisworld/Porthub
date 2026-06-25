import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "~/server/auth";

// BetterAuth's handler covers /api/auth/sign-in, /sign-out, /callback/<provider>,
// /magic-link/verify, /session, etc. — all routed under a single catch-all.
export const runtime = "nodejs";

export const { GET, POST } = toNextJsHandler(auth);
