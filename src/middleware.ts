import { NextResponse, type NextRequest } from "next/server";

// Root domain (with port in dev). NEXT_PUBLIC_* is inlined at build, so it's
// safe to read directly here without importing the env helper into the Edge runtime.
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";

// Subdomains that should serve the PortHub app, not a portfolio.
const RESERVED = new Set(["www", "app", "api"]);

/**
 * Multi-tenant routing (see docs/ARCHITECTURE.md §2).
 * `<slug>.<root>` → rewrite to `/sites/<slug>` (the URL bar keeps the subdomain).
 * The bare root domain serves the app.
 */
export function middleware(req: NextRequest) {
  // Pass the current pathname to server components via header (Next 15 doesn't
  // expose it directly in RSCs). Used by the (app) auth guard to compute `next`.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", req.nextUrl.pathname);

  // The shared engine bundle must serve on every host (incl. portfolio
  // subdomains) — never rewrite it to a /sites/<slug> route.
  if (req.nextUrl.pathname.startsWith("/engine/")) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const host = (req.headers.get("host") ?? "").toLowerCase();

  // Not our root domain (e.g. a Vercel preview URL) → serve the app as-is.
  if (host === ROOT_DOMAIN || !host.endsWith(`.${ROOT_DOMAIN}`)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const subdomain = host.slice(0, host.length - ROOT_DOMAIN.length - 1);
  if (!subdomain || RESERVED.has(subdomain)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Portfolio subdomain → render the generated page. Portfolios are single-page,
  // so we map the whole subdomain host to one slug route.
  const url = req.nextUrl.clone();
  url.pathname = `/sites/${subdomain}`;
  return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
}

// Exclude Next internals, API routes, and static assets so rewriting never touches them.
export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$).*)",
  ],
};
