import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "~/server/auth";
import {
  buildPortfolioIframe,
  findPortfolioForCustomHost,
} from "~/server/portfolio/render-iframe";
import { buildPortfolioMetadata } from "~/server/portfolio/metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ host: string }>;
}): Promise<Metadata> {
  const { host } = await params;
  const hostname = decodeURIComponent(host);
  const portfolio = await findPortfolioForCustomHost(hostname);
  if (!portfolio) return {};
  const proto =
    (await headers()).get("x-forwarded-proto") ?? "https";
  return buildPortfolioMetadata({
    profileData: portfolio.profileData,
    githubUsername: portfolio.githubUsername,
    isPublic: portfolio.isPublic,
    canonicalUrl: `${proto}://${hostname}`,
  });
}

/**
 * Public renderer for user-owned hostnames. Middleware forwards any request
 * whose host isn't our root or a `*.<root>` subdomain to this route.
 */
export default async function SiteByHostPage({
  params,
}: {
  params: Promise<{ host: string }>;
}) {
  const { host } = await params;
  const hostname = decodeURIComponent(host);

  const portfolio = await findPortfolioForCustomHost(hostname);
  if (!portfolio) notFound();

  if (!portfolio.isPublic) {
    const session = await getSession(await headers());
    if (session?.user?.id !== portfolio.ownerId) {
      notFound();
    }
  }

  const frame = buildPortfolioIframe(portfolio);
  if (!frame) notFound();
  return frame;
}
