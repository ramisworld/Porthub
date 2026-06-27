import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ISSUERS,
  MISSING_CREDENTIAL_LOGO_PROVIDERS,
  normalizeCredentialIssuerSlug,
} from "./credentialLogos";

const publicDir = join(process.cwd(), "public");

describe("credential logo manifest", () => {
  it("points every issuer at a valid local SVG asset or explicit generic fallback", () => {
    for (const issuer of ISSUERS) {
      expect(issuer.src.startsWith("/brand/credentials/")).toBe(true);
      expect(issuer.type).toBe("svg");

      const filePath = join(publicDir, issuer.src);
      expect(existsSync(filePath), `${issuer.key} missing ${issuer.src}`).toBe(
        true,
      );

      if (issuer.logoKind === "generic") {
        expect(issuer.src).toBe("/brand/credentials/fallback-certificate.svg");
        expect(MISSING_CREDENTIAL_LOGO_PROVIDERS).toContain(issuer.key);
      } else {
        expect(issuer.src).toBe(`/brand/credentials/${issuer.key}.svg`);
      }
    }
  });

  it("keeps SVG assets sanitized and script-free", () => {
    const checked = new Set(ISSUERS.map((issuer) => issuer.src));
    checked.add("/brand/credentials/fallback-certificate.svg");

    for (const src of checked) {
      const svg = readFileSync(join(publicDir, src), "utf8");
      expect(svg.trim().startsWith("<svg"), `${src} must start with svg`).toBe(
        true,
      );
      expect(svg).toMatch(/\bviewBox=(["']).+?\1/);
      expect(svg).not.toMatch(/<script\b/i);
      expect(svg).not.toMatch(/<foreignObject\b/i);
      expect(svg).not.toMatch(/\son[a-z]+\s*=/i);
      expect(svg).not.toMatch(/javascript:/i);
    }
  });

  it("uses brand assets for the required credential examples", () => {
    for (const slug of ["microsoft", "google", "aws", "meta", "databricks"]) {
      const issuer = ISSUERS.find((item) => item.key === slug);
      expect(issuer?.logoKind).toBe("brand");
      expect(issuer?.src).toBe(`/brand/credentials/${slug}.svg`);
    }
  });
});

describe("credential issuer normalization", () => {
  it.each([
    ["Amazon Web Services", "aws"],
    ["AWS Certified", "aws"],
    ["AWS Certified Solutions Architect", "aws"],
    ["AWS", "aws"],
    ["Microsoft", "microsoft"],
    ["Microsoft Azure", "azure"],
    ["Azure", "azure"],
    ["Azure AI", "azure"],
    ["Google", "google"],
    ["Google Cloud", "google-cloud"],
    ["GCP", "google-cloud"],
    ["Meta", "meta"],
    ["Facebook", "meta"],
    ["Databricks Certified", "databricks"],
    ["Databricks", "databricks"],
  ])("%s -> %s", (input, expected) => {
    expect(normalizeCredentialIssuerSlug(input)).toBe(expected);
  });

  it("does not guess unrelated names from vague substrings", () => {
    expect(normalizeCredentialIssuerSlug("Acme Cloud Guild")).toBeUndefined();
    expect(
      normalizeCredentialIssuerSlug("Database Certificate"),
    ).toBeUndefined();
  });
});
