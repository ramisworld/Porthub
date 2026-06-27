/**
 * Credential logo registry.
 *
 * Brand entries point to sanitized local SVG assets in
 * public/brand/credentials. Entries marked `generic` intentionally use the
 * neutral certificate fallback because we do not have an exact approved
 * icon-mark asset for that issuer yet.
 */

const CREDENTIAL_LOGO_BASE = "/brand/credentials";
const GENERIC_CERTIFICATE_SRC = `${CREDENTIAL_LOGO_BASE}/fallback-certificate.svg`;

export type CredentialLogoKind = "brand" | "generic";
export type CredentialLogoMark = "square" | "wide" | "tall";
export type CredentialLogoTile = "neutral" | "light";

export type IssuerMeta = {
  key: string;
  label: string;
  name: string;
  color: string;
  src: string;
  alt: string;
  type: "svg";
  logoKind: CredentialLogoKind;
  mark: CredentialLogoMark;
  tile: CredentialLogoTile;
  source: string;
};

const brandLogo = (
  key: string,
  label: string,
  color: string,
  source: string,
  options: {
    name?: string;
    alt?: string;
    mark?: CredentialLogoMark;
    tile?: CredentialLogoTile;
  } = {},
): IssuerMeta => ({
  key,
  label,
  name: options.name ?? label,
  color,
  src: `${CREDENTIAL_LOGO_BASE}/${key}.svg`,
  alt: options.alt ?? `${label} logo`,
  type: "svg",
  logoKind: "brand",
  mark: options.mark ?? "square",
  tile: options.tile ?? "neutral",
  source,
});

const genericLogo = (
  key: string,
  label: string,
  color: string,
  source = "Explicit generic credential fallback; exact approved icon asset not committed yet.",
): IssuerMeta => ({
  key,
  label,
  name: label,
  color,
  src: GENERIC_CERTIFICATE_SRC,
  alt: `${label} credential issuer`,
  type: "svg",
  logoKind: "generic",
  mark: "square",
  tile: "neutral",
  source,
});

export const ISSUERS = [
  brandLogo(
    "aws",
    "AWS",
    "#FF9900",
    "https://raw.githubusercontent.com/devicons/devicon/v2.17.0/icons/amazonwebservices/amazonwebservices-original-wordmark.svg",
    { mark: "wide", tile: "light" },
  ),
  brandLogo(
    "microsoft",
    "Microsoft",
    "#0078D4",
    "https://commons.wikimedia.org/wiki/File:Microsoft_icon.svg",
  ),
  brandLogo(
    "azure",
    "Microsoft Azure",
    "#0078D4",
    "https://raw.githubusercontent.com/devicons/devicon/v2.17.0/icons/azure/azure-original.svg",
  ),
  brandLogo(
    "google",
    "Google",
    "#4285F4",
    "https://fonts.gstatic.com/s/i/productlogos/googleg/v6/24px.svg",
  ),
  brandLogo(
    "google-cloud",
    "Google Cloud",
    "#4285F4",
    "https://raw.githubusercontent.com/devicons/devicon/v2.17.0/icons/googlecloud/googlecloud-original.svg",
  ),
  brandLogo(
    "meta",
    "Meta",
    "#0668E1",
    "https://cdn.simpleicons.org/meta/0668E1",
  ),
  brandLogo(
    "github",
    "GitHub",
    "#181616",
    "https://raw.githubusercontent.com/devicons/devicon/v2.17.0/icons/github/github-original.svg",
    { tile: "light" },
  ),
  brandLogo(
    "databricks",
    "Databricks",
    "#FF3621",
    "https://cdn.simpleicons.org/databricks/FF3621",
  ),
  brandLogo(
    "nvidia",
    "NVIDIA",
    "#76B900",
    "https://cdn.simpleicons.org/nvidia/76B900",
  ),
  brandLogo(
    "ibm",
    "IBM",
    "#1F70C1",
    "https://commons.wikimedia.org/wiki/File:IBM_logo.svg",
    { mark: "wide" },
  ),
  brandLogo(
    "oracle",
    "Oracle",
    "#EA1B22",
    "https://raw.githubusercontent.com/devicons/devicon/master/icons/oracle/oracle-original.svg",
    { mark: "wide" },
  ),
  brandLogo(
    "salesforce",
    "Salesforce",
    "#00A1E0",
    "https://www.salesforce.com/content/dam/sfdc-docs/www/logos/logo-salesforce.svg",
    { mark: "wide" },
  ),
  brandLogo(
    "cisco",
    "Cisco",
    "#1BA0D7",
    "https://cdn.simpleicons.org/cisco/1BA0D7",
    { mark: "wide" },
  ),
  brandLogo(
    "docker",
    "Docker",
    "#2496ED",
    "https://raw.githubusercontent.com/devicons/devicon/v2.17.0/icons/docker/docker-original.svg",
  ),
  brandLogo(
    "kubernetes",
    "Kubernetes (CNCF)",
    "#326CE5",
    "https://raw.githubusercontent.com/devicons/devicon/v2.17.0/icons/kubernetes/kubernetes-plain.svg",
  ),
  brandLogo(
    "mongodb",
    "MongoDB",
    "#47A248",
    "https://raw.githubusercontent.com/devicons/devicon/v2.17.0/icons/mongodb/mongodb-original.svg",
    { mark: "tall" },
  ),
  brandLogo(
    "postgresql",
    "PostgreSQL",
    "#336791",
    "https://raw.githubusercontent.com/devicons/devicon/v2.17.0/icons/postgresql/postgresql-original.svg",
  ),
  brandLogo(
    "redis",
    "Redis",
    "#DC382D",
    "https://raw.githubusercontent.com/devicons/devicon/v2.17.0/icons/redis/redis-original.svg",
  ),
  brandLogo(
    "linkedin",
    "LinkedIn Learning",
    "#0A66C2",
    "https://raw.githubusercontent.com/devicons/devicon/v2.17.0/icons/linkedin/linkedin-original.svg",
  ),
  brandLogo(
    "snowflake",
    "Snowflake",
    "#29B5E8",
    "https://cdn.simpleicons.org/snowflake/29B5E8",
  ),
  brandLogo(
    "hashicorp",
    "HashiCorp",
    "#000000",
    "https://cdn.simpleicons.org/hashicorp/000000",
    { tile: "light" },
  ),
  brandLogo(
    "hubspot",
    "HubSpot",
    "#FF7A59",
    "https://cdn.simpleicons.org/hubspot/FF7A59",
  ),
  brandLogo(
    "comptia",
    "CompTIA",
    "#C8202F",
    "https://cdn.simpleicons.org/comptia/C8202F",
  ),
  brandLogo(
    "openai",
    "OpenAI",
    "#111111",
    "https://raw.githubusercontent.com/twbs/icons/main/icons/openai.svg",
    { tile: "light" },
  ),
  brandLogo(
    "anthropic",
    "Anthropic",
    "#191919",
    "https://cdn.simpleicons.org/anthropic/191919",
    { tile: "light" },
  ),
  brandLogo("edx", "edX", "#02262B", "https://cdn.simpleicons.org/edx/02262B", {
    mark: "wide",
    tile: "light",
  }),
  brandLogo(
    "udacity",
    "Udacity",
    "#02B3E4",
    "https://cdn.simpleicons.org/udacity/02B3E4",
  ),
  brandLogo(
    "coursera",
    "Coursera",
    "#0056D2",
    "https://cdn.simpleicons.org/coursera/0056D2",
  ),
  genericLogo("pmi", "PMI", "#1F2A5C"),
  genericLogo("scrum-org", "Scrum.org", "#244270"),
  genericLogo("deeplearning-ai", "DeepLearning.AI", "#E5484D"),
  genericLogo("stanford", "Stanford Online", "#8C1515"),
] as const satisfies ReadonlyArray<IssuerMeta>;

export type CredentialLogoSlug = (typeof ISSUERS)[number]["key"];

export const credentialLogos = Object.fromEntries(
  ISSUERS.map((issuer) => [issuer.key, issuer]),
) as Record<CredentialLogoSlug, IssuerMeta>;

export const ISSUER_BY_KEY = credentialLogos;

export const MISSING_CREDENTIAL_LOGO_PROVIDERS = ISSUERS.filter(
  (issuer) => issuer.logoKind === "generic",
).map((issuer) => issuer.key);

const normalizedAliases: Record<string, CredentialLogoSlug> = {
  "amazon web services": "aws",
  "amazon aws": "aws",
  aws: "aws",
  "aws certified": "aws",
  "aws certification": "aws",

  microsoft: "microsoft",
  "microsoft learn": "microsoft",
  "microsoft certified": "microsoft",
  "microsoft certification": "microsoft",

  azure: "azure",
  "azure ai": "azure",
  "azure ai services": "azure",
  "microsoft azure": "azure",
  "microsoft azure ai": "azure",

  google: "google",
  "google career certificates": "google",
  "google certificate": "google",
  "google certificates": "google",

  gcp: "google-cloud",
  "google cloud": "google-cloud",
  "google cloud platform": "google-cloud",
  "google cloud certified": "google-cloud",

  meta: "meta",
  facebook: "meta",
  "facebook blueprint": "meta",
  "meta blueprint": "meta",

  github: "github",
  "git hub": "github",

  databricks: "databricks",
  "databricks certified": "databricks",
  "databricks certification": "databricks",

  nvidia: "nvidia",
  ibm: "ibm",
  oracle: "oracle",
  salesforce: "salesforce",
  cisco: "cisco",
  docker: "docker",
  kubernetes: "kubernetes",
  k8s: "kubernetes",
  cncf: "kubernetes",
  mongodb: "mongodb",
  mongo: "mongodb",
  postgresql: "postgresql",
  postgres: "postgresql",
  redis: "redis",
  linkedin: "linkedin",
  "linkedin learning": "linkedin",
  snowflake: "snowflake",
  hashicorp: "hashicorp",
  hubspot: "hubspot",
  comptia: "comptia",
  "comp tia": "comptia",
  openai: "openai",
  "open ai": "openai",
  anthropic: "anthropic",
  edx: "edx",
  udacity: "udacity",
  coursera: "coursera",
  pmi: "pmi",
  "project management institute": "pmi",
  "scrum org": "scrum-org",
  "scrum.org": "scrum-org",
  "deeplearning ai": "deeplearning-ai",
  "deep learning ai": "deeplearning-ai",
  stanford: "stanford",
  "stanford online": "stanford",
};

const prefixAliases: ReadonlyArray<[RegExp, CredentialLogoSlug]> = [
  [/^aws certified\b/, "aws"],
  [/^databricks certified\b/, "databricks"],
  [/^google cloud certified\b/, "google-cloud"],
  [/^microsoft certified\b/, "microsoft"],
  [/^azure\b/, "azure"],
];

export type CredentialIssuerInput =
  | string
  | {
      issuerKey?: string | null;
      provider?: string | null;
      issuer?: string | null;
      title?: string | null;
    };

export function normalizeCredentialProviderName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[._]/g, " ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9+#]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeCredentialIssuerSlug(
  value: string | null | undefined,
): CredentialLogoSlug | undefined {
  const normalized = normalizeCredentialProviderName(value ?? "");
  if (!normalized) return undefined;

  const exact = normalizedAliases[normalized];
  if (exact) return exact;

  for (const [pattern, slug] of prefixAliases) {
    if (pattern.test(normalized)) return slug;
  }

  return undefined;
}

export function resolveCredentialIssuerKey(
  input: CredentialIssuerInput,
): CredentialLogoSlug | undefined {
  if (typeof input === "string") return normalizeCredentialIssuerSlug(input);

  const key = input.issuerKey?.trim().toLowerCase();
  if (key && key in credentialLogos) return key;

  return (
    normalizeCredentialIssuerSlug(input.provider) ??
    normalizeCredentialIssuerSlug(input.issuer) ??
    normalizeCredentialIssuerSlug(input.title)
  );
}

export function getCredentialLogo(
  input: CredentialIssuerInput,
): IssuerMeta | undefined {
  const key = resolveCredentialIssuerKey(input);
  return key ? credentialLogos[key] : undefined;
}
