import { renderPortfolioOgImage } from "~/server/portfolio/og-image";
import { findPortfolioForCustomHost } from "~/server/portfolio/render-iframe";

export const runtime = "nodejs";
export const alt = "Portfolio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({
  params,
}: {
  params: Promise<{ host: string }>;
}) {
  const { host } = await params;
  const hostname = decodeURIComponent(host);
  const portfolio = await findPortfolioForCustomHost(hostname);
  if (!portfolio) {
    return renderPortfolioOgImage(undefined, undefined, hostname);
  }
  return renderPortfolioOgImage(
    portfolio.profileData,
    portfolio.designSpec,
    portfolio.githubUsername,
  );
}
