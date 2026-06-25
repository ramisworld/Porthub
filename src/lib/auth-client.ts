"use client";

import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";

/**
 * Client-side BetterAuth wrapper. Used in client components to trigger
 * sign-in (`signIn.social`, `signIn.magicLink`) and read session state.
 *
 * The baseURL is relative — the auth handler lives at /api/auth on the same
 * origin the app is served from, so we don't need to hardcode it here.
 */
export const authClient = createAuthClient({
  plugins: [magicLinkClient()],
});

export const { signIn, signOut, signUp, useSession, getSession } = authClient;
