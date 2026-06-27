-- Railway Custom Domains API support. We register user domains with Railway
-- (instead of Cloudflare for SaaS), so persist Railway's per-domain values:
-- its domain id, the CNAME target, and the ownership-verification TXT pair.
ALTER TABLE "CustomDomain" ADD COLUMN "railwayDomainId" TEXT;
ALTER TABLE "CustomDomain" ADD COLUMN "cnameTarget" TEXT;
ALTER TABLE "CustomDomain" ADD COLUMN "verificationHost" TEXT;
ALTER TABLE "CustomDomain" ADD COLUMN "verificationToken" TEXT;

CREATE UNIQUE INDEX "CustomDomain_railwayDomainId_key" ON "CustomDomain"("railwayDomainId");
