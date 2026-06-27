import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "~/server/db";
import { getSession } from "~/server/auth";
import { buildPortfolioIframe } from "~/server/portfolio/render-iframe";
import { buildPortfolioMetadata } from "~/server/portfolio/metadata";

export const dynamic = "force-dynamic";

function canonicalFromHeaders(h: Headers): string {
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = await db.portfolio.findUnique({
    where: { slug },
    select: { isPublic: true, githubUsername: true, profileData: true },
  });
  if (!p) return {};
  const h = await headers();
  return buildPortfolioMetadata({
    profileData: p.profileData,
    githubUsername: p.githubUsername,
    isPublic: p.isPublic,
    canonicalUrl: canonicalFromHeaders(h),
  });
}

export default async function SitePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const portfolio = await db.portfolio.findUnique({ where: { slug } });
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
