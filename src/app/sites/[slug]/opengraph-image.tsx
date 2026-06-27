import { db } from "~/server/db";
import { renderPortfolioOgImage } from "~/server/portfolio/og-image";

export const runtime = "nodejs";
export const alt = "Portfolio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const portfolio = await db.portfolio.findUnique({ where: { slug } });
  if (!portfolio) {
    return renderPortfolioOgImage(undefined, undefined, slug);
  }
  return renderPortfolioOgImage(
    portfolio.profileData,
    portfolio.designSpec,
    portfolio.githubUsername,
  );
}
