import { notFound } from "next/navigation";
import { db } from "~/server/db";
import { renderPortfolioPage } from "~/engine/render";
import { DEFAULT_SPEC, designSpecSchema } from "~/engine/spec";
import { ENGINE_VERSION } from "~/engine/version";
import type { ProfileData } from "~/server/profile/model";

// Always read the latest data + re-render via the engine (engine upgrades apply
// to all existing portfolios).
export const dynamic = "force-dynamic";

export default async function SitePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // MVP: render any existing slug — do NOT gate on isPublic (avoids 404-on-preview).
  const portfolio = await db.portfolio.findUnique({ where: { slug } });
  if (!portfolio) notFound();

  let html: string | null = null;
  if (portfolio.designSpec) {
    const parsed = designSpecSchema.safeParse(portfolio.designSpec);
    const spec = parsed.success ? parsed.data : DEFAULT_SPEC;
    // Reference the shared engine; default to the current version for older rows.
    const version = portfolio.engineVersion ?? ENGINE_VERSION;
    html = renderPortfolioPage(
      spec,
      portfolio.profileData as unknown as ProfileData,
      version,
    );
  } else if (portfolio.code) {
    html = portfolio.code; // legacy pre-engine portfolios
  }
  if (!html) notFound();

  // The generated page is untrusted → sandbox it. allow-scripts (its animations
  // need JS), allow-popups-to-escape-sandbox so clicked links open as real tabs;
  // NOT allow-same-origin, so it can't reach the app or its storage.
  return (
    <iframe
      title="portfolio"
      srcDoc={html}
      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
      className="fixed inset-0 h-screen w-screen border-0"
    />
  );
}
