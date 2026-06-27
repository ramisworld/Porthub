-- Store Railway's authoritative CNAME host label (empty string = apex / "@").
-- Public suffixes like .co.nz make client-side label derivation unreliable, so
-- we trust the value Railway returns instead.
ALTER TABLE "CustomDomain" ADD COLUMN "cnameHost" TEXT;
