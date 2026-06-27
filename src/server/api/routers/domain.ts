import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { CustomDomain } from "../../../../generated/prisma";
import type { db as DbType } from "~/server/db";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { env } from "~/env";
import { validateHostname } from "~/server/domains/validate";
import {
  CloudflareApiError,
  CloudflareDisabledError,
  cfCreateHostname,
  cfDeleteHostname,
  cfGetHostname,
  rollupStatus,
  type CfHostname,
} from "~/server/domains/cloudflare";
import { limit } from "~/server/ratelimit";

/**
 * Custom-domain management for the signed-in user's single portfolio.
 *
 * Backed by Cloudflare for SaaS (Custom Hostnames). Cloudflare issues a cert
 * for each user-owned domain and routes its traffic to our fallback origin —
 * a Cloudflare Worker that proxies to the Railway app (see
 * workers/domain-router). This scales to unlimited domains (100 free) without
 * touching Railway's per-service custom-domain limit.
 *
 * Public surface:
 *   mine()     → current row (or null) + DNS instructions
 *   add()      → register hostname with Cloudflare, persist locally
 *   recheck()  → poll Cloudflare, persist new status (+ fetch DCV TXT)
 *   remove()   → delete from Cloudflare, drop the row
 */
export const domainRouter = createTRPCRouter({
  mine: protectedProcedure.query(async ({ ctx }) => {
    const portfolio = await ctx.db.portfolio.findUnique({
      where: { ownerId: ctx.user.id },
      select: { id: true },
    });
    if (!portfolio) return null;

    const row = await ctx.db.customDomain.findUnique({
      where: { portfolioId: portfolio.id },
    });
    return row ? withInstructions(row) : null;
  }),

  add: protectedProcedure
    .input(z.object({ hostname: z.string().min(1).max(253) }))
    .mutation(async ({ ctx, input }) => {
      const portfolio = await ctx.db.portfolio.findUnique({
        where: { ownerId: ctx.user.id },
        select: { id: true },
      });
      if (!portfolio) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Generate a portfolio first.",
        });
      }

      // Beta cap: one custom domain per portfolio.
      const existing = await ctx.db.customDomain.findUnique({
        where: { portfolioId: portfolio.id },
        select: { id: true },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Remove your existing custom domain before adding another.",
        });
      }

      // Rate-limit: 5 add attempts / 10 minutes / user.
      const rl = limit(`domain:add:${ctx.user.id}`, { window: "10m", max: 5 });
      if (!rl.ok) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many attempts. Wait a few minutes and try again.",
        });
      }

      const v = validateHostname(input.hostname, env.NEXT_PUBLIC_ROOT_DOMAIN);
      if (!v.ok) {
        throw new TRPCError({ code: "BAD_REQUEST", message: v.reason });
      }
      const hostname = v.hostname;

      // Another user already claims this hostname → tell them clearly.
      const claimed = await ctx.db.customDomain.findUnique({
        where: { hostname },
        select: { id: true },
      });
      if (claimed) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "That domain is already connected to another portfolio.",
        });
      }

      let cf: CfHostname;
      try {
        cf = await cfCreateHostname(hostname);
      } catch (err) {
        if (err instanceof CloudflareDisabledError) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: err.message });
        }
        if (err instanceof CloudflareApiError) {
          throw new TRPCError({
            code: err.status === 409 ? "CONFLICT" : "BAD_GATEWAY",
            message: err.message,
          });
        }
        throw err;
      }

      const txt = extractTxt(cf);
      const created = await ctx.db.customDomain.create({
        data: {
          portfolioId: portfolio.id,
          hostname,
          cfHostnameId: cf.id,
          cnameTarget: cnameTarget(),
          verificationHost: txt?.host ?? null,
          verificationToken: txt?.value ?? null,
          status: rollupStatus({ status: cf.status, sslStatus: cf.sslStatus }),
          ownershipStatus: cf.status,
          sslStatus: cf.sslStatus,
          lastCheckedAt: new Date(),
        },
      });
      return withInstructions(created);
    }),

  recheck: protectedProcedure.mutation(async ({ ctx }) => {
    const row = await ownRowOrThrow(ctx);

    // Legacy/externally-managed rows (e.g. a domain set up directly on Railway)
    // have no Cloudflare hostname — nothing to poll, so just return as-is
    // instead of erroring.
    if (!row.cfHostnameId) {
      return withInstructions(row);
    }

    const rl = limit(`domain:recheck:${ctx.user.id}`, { window: "1m", max: 6 });
    if (!rl.ok) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Slow down — you can check again in a minute.",
      });
    }

    let cf: CfHostname;
    try {
      cf = await cfGetHostname(row.cfHostnameId);
    } catch (err) {
      if (err instanceof CloudflareApiError && err.status === 404) {
        const updated = await ctx.db.customDomain.update({
          where: { id: row.id },
          data: {
            status: "error",
            errorReason: "Cloudflare no longer has this hostname registered.",
            lastCheckedAt: new Date(),
          },
        });
        return withInstructions(updated);
      }
      throw err;
    }

    const txt = extractTxt(cf);
    const status = rollupStatus({ status: cf.status, sslStatus: cf.sslStatus });
    const updated = await ctx.db.customDomain.update({
      where: { id: row.id },
      data: {
        // Cloudflare generates the DCV TXT lazily — capture it once it appears.
        verificationHost: txt?.host ?? row.verificationHost,
        verificationToken: txt?.value ?? row.verificationToken,
        status,
        ownershipStatus: cf.status,
        sslStatus: cf.sslStatus,
        lastCheckedAt: new Date(),
        activatedAt:
          status === "active" && !row.activatedAt ? new Date() : row.activatedAt,
        errorReason: status === "error" ? row.errorReason ?? "unknown" : null,
      },
    });
    return withInstructions(updated);
  }),

  remove: protectedProcedure.mutation(async ({ ctx }) => {
    const row = await ownRowOrThrow(ctx);

    if (row.cfHostnameId) {
      try {
        await cfDeleteHostname(row.cfHostnameId);
      } catch (err) {
        // 404 from CF is fine — already gone there. Re-throw everything else.
        if (!(err instanceof CloudflareApiError && err.status === 404)) {
          throw err;
        }
      }
    }

    await ctx.db.customDomain.delete({ where: { id: row.id } });
    return { ok: true };
  }),
});

// ───────────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────────

type Ctx = {
  db: typeof DbType;
  user: { id: string };
};

async function ownRowOrThrow(ctx: Ctx) {
  const portfolio = await ctx.db.portfolio.findUnique({
    where: { ownerId: ctx.user.id },
    select: { id: true },
  });
  if (!portfolio) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Generate a portfolio first.",
    });
  }
  const row = await ctx.db.customDomain.findUnique({
    where: { portfolioId: portfolio.id },
  });
  if (!row) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "No custom domain on this portfolio.",
    });
  }
  return row;
}

/** The hostname users CNAME their domain to (our Cloudflare fallback origin). */
function cnameTarget(): string {
  return (
    env.NEXT_PUBLIC_CUSTOM_DOMAIN_CNAME_TARGET ?? env.NEXT_PUBLIC_ROOT_DOMAIN
  );
}

/** Pull the DCV TXT record Cloudflare wants (cert validation, or ownership). */
function extractTxt(cf: CfHostname): { host: string; value: string } | null {
  const ssl = cf.sslValidationRecords.find((r) => r.txtName && r.txtValue);
  if (ssl?.txtName && ssl.txtValue) {
    return { host: ssl.txtName, value: ssl.txtValue };
  }
  const ov = cf.ownershipVerification;
  if (ov?.type === "txt" && ov.name && ov.value) {
    return { host: ov.name, value: ov.value };
  }
  return null;
}

/**
 * Decorate a DB row with the records the user must add at their DNS provider:
 * a CNAME (routes traffic to our fallback origin) and — once Cloudflare emits
 * it — a TXT for certificate validation. Names are shown in full; users map
 * them to their provider (apex domains need CNAME-flattening / ALIAS support).
 */
export type DomainWithInstructions = CustomDomain & {
  instructions: {
    cname: { name: string; value: string };
    txt: { name: string; value: string } | null;
  };
};

function withInstructions(row: CustomDomain): DomainWithInstructions {
  const txt =
    row.verificationHost && row.verificationToken
      ? { name: row.verificationHost, value: row.verificationToken }
      : null;

  return {
    ...row,
    instructions: {
      cname: {
        name: row.hostname,
        value: row.cnameTarget ?? cnameTarget(),
      },
      txt,
    },
  };
}
