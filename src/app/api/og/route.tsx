import { headers } from "next/headers";
import { db } from "~/server/db";
import { renderPorthubLandingOgImage } from "~/server/og/porthub-landing";
import { findPortfolioForCustomHost } from "~/server/portfolio/render-iframe";
import { renderPortfolioOgImage } from "~/server/portfolio/og-image";

export const runtime = "nodejs";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";
const RESERVED = new Set(["www", "app", "api"]);

function hostnameFromHeaders(h: Headers): string {
  const forwarded = (h.get("x-porthub-host") ?? "")
    .toLowerCase()
    .replace(/:\d+$/, "");
  if (forwarded) return forwarded;
  return (h.get("host") ?? "").toLowerCase().replace(/:\d+$/, "");
}

function rootDomain(): string {
  return ROOT_DOMAIN.toLowerCase().replace(/:\d+$/, "");
}

/** PortHub app hosts (marketing, dashboard, auth) — not a user portfolio. */
function isPorthubAppHost(hostname: string): boolean {
  const root = rootDomain();
  if (!hostname || hostname === root) return true;
  if (hostname.endsWith(`.${root}`)) {
    const sub = hostname.slice(0, hostname.length - root.length - 1);
    return !sub || RESERVED.has(sub);
  }
  return false;
}

async function portfolioForHost(hostname: string) {
  const root = rootDomain();
  if (!hostname || hostname === root) return null;

  if (hostname.endsWith(`.${root}`)) {
    const slug = hostname.slice(0, hostname.length - root.length - 1);
    if (!slug || RESERVED.has(slug)) return null;
    return db.portfolio.findUnique({ where: { slug } });
  }

  return findPortfolioForCustomHost(hostname);
}

/**
 * Link-preview image for every host:
 *   • porthub.rami.co.nz (+ www/app) → marketing hero
 *   • <slug>.porthub.rami.co.nz, rami.co.nz, john.com → portfolio hero
 */
export async function GET() {
  const hostname = hostnameFromHeaders(await headers());

  if (isPorthubAppHost(hostname)) {
    return renderPorthubLandingOgImage();
  }

  const portfolio = await portfolioForHost(hostname);
  return renderPortfolioOgImage(
    portfolio?.profileData,
    portfolio?.designSpec,
    portfolio?.githubUsername ?? hostname,
  );
}
