import "server-only";
import { env } from "~/env";

/**
 * Thin Railway Custom Domains API client.
 * Docs: https://docs.railway.com/integrations/api/manage-domains
 *
 * Why Railway (not Cloudflare for SaaS)? The app is hosted on Railway, and
 * Railway's edge only routes hostnames that are explicitly registered on the
 * service — arbitrary customer domains pointed at it get a 404 fallback. So
 * the supported way to onboard user domains is to register each one through
 * this API; Railway then issues the Let's Encrypt cert automatically.
 *
 * Four operations cover the whole flow:
 *   create  — register a user domain, returns CNAME target + verify TXT
 *   get     — poll DNS + certificate status for one domain
 *   delete  — remove the domain (user remove / failed creation cleanup)
 *
 * Every export returns a normalized object so the rest of the app never sees
 * Railway's raw GraphQL shape.
 */

const RAILWAY_API = "https://backboard.railway.com/graphql/v2";

/** Normalized view of a Railway custom domain. Stable shape callers rely on. */
export interface RailwayDomain {
  id: string;
  domain: string;
  /** CNAME the user must add. `cnameHost` is Railway's authoritative host
   *  label — empty string means the apex ("@"). */
  cnameHost: string | null;
  cnameTarget: string | null;
  /** Ownership-proof TXT record. `verificationHost` is already zone-relative
   *  (e.g. "_railway-verify" for an apex). Null until Railway returns them. */
  verificationHost: string | null;
  verificationToken: string | null;
  /** Whether Railway has verified domain ownership. */
  verified: boolean;
  /** Raw Railway statuses, cached for the UI. */
  dnsStatus: string | null;
  certificateStatus: string;
  certificateErrorMessage: string | null;
}

/** Thrown when Railway isn't configured (token / ids missing). */
export class RailwayDisabledError extends Error {
  constructor() {
    super("Custom domains are not enabled on this deployment yet.");
    this.name = "RailwayDisabledError";
  }
}

/** Thrown for any Railway API / GraphQL error, with the message extracted. */
export class RailwayApiError extends Error {
  status: number;
  /** True when Railway says this domain is already registered. */
  conflict: boolean;
  constructor(status: number, message: string, conflict = false) {
    super(message);
    this.name = "RailwayApiError";
    this.status = status;
    this.conflict = conflict;
  }
}

interface RailwayConfig {
  token: string;
  projectId: string;
  serviceId: string;
  environmentId: string;
  targetPort: number | null;
}

function ensureConfig(): RailwayConfig {
  if (
    !env.RAILWAY_API_TOKEN ||
    !env.RAILWAY_PROJECT_ID ||
    !env.RAILWAY_SERVICE_ID ||
    !env.RAILWAY_ENVIRONMENT_ID
  ) {
    throw new RailwayDisabledError();
  }
  return {
    token: env.RAILWAY_API_TOKEN,
    projectId: env.RAILWAY_PROJECT_ID,
    serviceId: env.RAILWAY_SERVICE_ID,
    environmentId: env.RAILWAY_ENVIRONMENT_ID,
    targetPort: env.RAILWAY_TARGET_PORT ?? null,
  };
}

// ── Raw GraphQL shapes ──────────────────────────────────────────────────────

interface RawDnsRecord {
  hostlabel: string;
  recordType: string;
  requiredValue: string;
  currentValue: string;
  status: string;
  zone: string;
}

interface RawStatus {
  dnsRecords: RawDnsRecord[];
  certificateStatus: string;
  certificateErrorMessage: string | null;
  verified: boolean;
  verificationDnsHost: string | null;
  verificationToken: string | null;
}

interface RawCustomDomain {
  id: string;
  domain: string;
  status: RawStatus;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

const STATUS_SELECTION = `
  status {
    dnsRecords { hostlabel recordType requiredValue currentValue status zone }
    certificateStatus
    certificateErrorMessage
    verified
    verificationDnsHost
    verificationToken
  }
`;

async function railwayRequest<T>(
  token: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(RAILWAY_API, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  const text = await res.text();
  let body: GraphQLResponse<T> | null = null;
  try {
    body = text ? (JSON.parse(text) as GraphQLResponse<T>) : null;
  } catch {
    // fall through to status-based error
  }

  if (body?.errors?.length) {
    const msg = body.errors[0]?.message ?? "Railway API error";
    const conflict = /already|exist|in use|taken/i.test(msg);
    throw new RailwayApiError(conflict ? 409 : 502, msg, conflict);
  }
  if (!res.ok || !body?.data) {
    throw new RailwayApiError(res.status || 502, `Railway error ${res.status}`);
  }
  return body.data;
}

function normalize(raw: RawCustomDomain): RailwayDomain {
  const cname = raw.status.dnsRecords.find(
    (r) => r.recordType === "DNS_RECORD_TYPE_CNAME",
  );
  return {
    id: raw.id,
    domain: raw.domain,
    cnameHost: cname?.hostlabel ?? null,
    cnameTarget: cname?.requiredValue ?? null,
    verificationHost: raw.status.verificationDnsHost,
    verificationToken: raw.status.verificationToken,
    verified: raw.status.verified,
    dnsStatus: cname?.status ?? null,
    certificateStatus: raw.status.certificateStatus,
    certificateErrorMessage: raw.status.certificateErrorMessage,
  };
}

// ── Public operations ────────────────────────────────────────────────────────

export async function railwayCreateDomain(
  domain: string,
): Promise<RailwayDomain> {
  const cfg = ensureConfig();
  const data = await railwayRequest<{ customDomainCreate: RawCustomDomain }>(
    cfg.token,
    `mutation Create($input: CustomDomainCreateInput!) {
      customDomainCreate(input: $input) {
        id
        domain
        ${STATUS_SELECTION}
      }
    }`,
    {
      input: {
        domain,
        projectId: cfg.projectId,
        serviceId: cfg.serviceId,
        environmentId: cfg.environmentId,
        ...(cfg.targetPort ? { targetPort: cfg.targetPort } : {}),
      },
    },
  );
  return normalize(data.customDomainCreate);
}

/** Find one custom domain on our service by hostname. null if not present. */
export async function railwayGetDomain(
  domain: string,
): Promise<RailwayDomain | null> {
  const cfg = ensureConfig();
  const data = await railwayRequest<{
    domains: { customDomains: RawCustomDomain[] };
  }>(
    cfg.token,
    `query Domains($projectId: String!, $environmentId: String!, $serviceId: String!) {
      domains(projectId: $projectId, environmentId: $environmentId, serviceId: $serviceId) {
        customDomains {
          id
          domain
          ${STATUS_SELECTION}
        }
      }
    }`,
    {
      projectId: cfg.projectId,
      environmentId: cfg.environmentId,
      serviceId: cfg.serviceId,
    },
  );
  const match = data.domains.customDomains.find(
    (d) => d.domain.toLowerCase() === domain.toLowerCase(),
  );
  return match ? normalize(match) : null;
}

export async function railwayDeleteDomain(id: string): Promise<void> {
  const cfg = ensureConfig();
  await railwayRequest<{ customDomainDelete: boolean }>(
    cfg.token,
    `mutation Delete($id: String!) { customDomainDelete(id: $id) }`,
    { id },
  );
}

/**
 * Roll Railway's certificate + ownership state up to our four UI states.
 * Exported for unit testing.
 *
 * "active" requires BOTH ownership verified AND a fully-issued cert. We match
 * the cert status exactly (not a substring) because intermediate states like
 * `CERTIFICATE_STATUS_TYPE_VALIDATING_OWNERSHIP` contain the substring "VALID"
 * but are NOT live — matching loosely was a real bug.
 */
export function rollupStatus(input: {
  certificateStatus: string;
  certificateErrorMessage: string | null;
  verified: boolean;
}): "pending" | "active" | "action_needed" | "error" {
  const cert = input.certificateStatus.toUpperCase();
  const issued =
    cert === "CERTIFICATE_STATUS_TYPE_VALID" ||
    cert === "CERTIFICATE_STATUS_TYPE_ISSUED";
  if (input.verified && issued) return "active";
  if (cert.includes("ERROR") || cert.includes("FAIL")) {
    return input.certificateErrorMessage ? "action_needed" : "error";
  }
  return "pending";
}
