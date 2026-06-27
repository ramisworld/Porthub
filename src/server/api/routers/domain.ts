import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { CustomDomain } from "../../../../generated/prisma";
import type { db as DbType } from "~/server/db";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { env } from "~/env";
import { validateHostname } from "~/server/domains/validate";
import {
  RailwayApiError,
  RailwayDisabledError,
  railwayCreateDomain,
  railwayDeleteDomain,
  railwayGetDomain,
  rollupStatus,
  type RailwayDomain,
} from "~/server/domains/railway";
import { limit } from "~/server/ratelimit";

/**
 * Custom-domain management for the signed-in user's single portfolio.
 *
 * Backed by Railway's Custom Domains API: the app registers the user's domain
 * on the Railway service, then shows the user the CNAME + verification TXT to
 * add at their DNS provider. Railway issues the certificate automatically.
 *
 * Public surface:
 *   mine()     → current row (or null) + DNS instructions
 *   add()      → register hostname with Railway, persist locally
 *   recheck()  → poll Railway, persist new status
 *   remove()   → delete from Railway, drop the row
 *
 * Every mutation is rate-limited to keep API usage sane and to stop a client
 * from spamming registrations across many tabs/scripts.
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
      const rl = limit(`domain:add:${ctx.user.id}`, {
        window: "10m",
        max: 5,
      });
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

      let rw: RailwayDomain;
      try {
        rw = await railwayCreateDomain(hostname);
      } catch (err) {
        if (err instanceof RailwayDisabledError) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: err.message,
          });
        }
        if (err instanceof RailwayApiError) {
          throw new TRPCError({
            code: err.conflict ? "CONFLICT" : "BAD_GATEWAY",
            message: err.conflict
              ? "That domain is already registered. If it's yours, remove it from Railway first."
              : err.message,
          });
        }
        throw err;
      }

      const created = await ctx.db.customDomain.create({
        data: {
          portfolioId: portfolio.id,
          hostname,
          railwayDomainId: rw.id,
          cnameHost: rw.cnameHost,
          cnameTarget: rw.cnameTarget,
          verificationHost: rw.verificationHost,
          verificationToken: rw.verificationToken,
          status: rollupStatus(rw),
          ownershipStatus: rw.dnsStatus,
          sslStatus: rw.certificateStatus,
          errorReason: rw.certificateErrorMessage,
          lastCheckedAt: new Date(),
        },
      });
      return withInstructions(created);
    }),

  recheck: protectedProcedure.mutation(async ({ ctx }) => {
    const row = await ownRowOrThrow(ctx);

    if (!row.railwayDomainId) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "This domain wasn't registered with Railway. Remove and re-add it.",
      });
    }

    const rl = limit(`domain:recheck:${ctx.user.id}`, {
      window: "1m",
      max: 6,
    });
    if (!rl.ok) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Slow down — you can check again in a minute.",
      });
    }

    let rw: RailwayDomain | null;
    try {
      rw = await railwayGetDomain(row.hostname);
    } catch (err) {
      if (err instanceof RailwayDisabledError) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: err.message,
        });
      }
      throw err;
    }

    if (!rw) {
      // Removed at Railway (or expired). Mark + tell user.
      const updated = await ctx.db.customDomain.update({
        where: { id: row.id },
        data: {
          status: "error",
          errorReason: "Railway no longer has this domain registered.",
          lastCheckedAt: new Date(),
        },
      });
      return withInstructions(updated);
    }

    const status = rollupStatus(rw);
    const updated = await ctx.db.customDomain.update({
      where: { id: row.id },
      data: {
        // Refresh the per-domain DNS values too — Railway can re-issue them.
        cnameHost: rw.cnameHost ?? row.cnameHost,
        cnameTarget: rw.cnameTarget ?? row.cnameTarget,
        verificationHost: rw.verificationHost ?? row.verificationHost,
        verificationToken: rw.verificationToken ?? row.verificationToken,
        status,
        ownershipStatus: rw.dnsStatus,
        sslStatus: rw.certificateStatus,
        lastCheckedAt: new Date(),
        activatedAt:
          status === "active" && !row.activatedAt
            ? new Date()
            : row.activatedAt,
        errorReason:
          status === "error" || status === "action_needed"
            ? rw.certificateErrorMessage ?? row.errorReason ?? "unknown"
            : null,
      },
    });
    return withInstructions(updated);
  }),

  remove: protectedProcedure.mutation(async ({ ctx }) => {
    const row = await ownRowOrThrow(ctx);

    if (row.railwayDomainId) {
      try {
        await railwayDeleteDomain(row.railwayDomainId);
      } catch (err) {
        // A "not found" from Railway is fine — already gone there. Re-throw
        // everything else so the row doesn't get out of sync.
        if (
          !(
            err instanceof RailwayApiError &&
            (err.status === 404 || /not found/i.test(err.message))
          )
        ) {
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

/**
 * Decorate a DB row with the records the user must add at their DNS provider:
 * a CNAME (routes traffic) and a verification TXT (proves ownership). The
 * "Name / Host" values come straight from Railway (authoritative — it handles
 * public suffixes like `.co.nz` correctly). An empty CNAME host = apex = "@".
 */
export type DomainWithInstructions = CustomDomain & {
  instructions: {
    cname: { name: string; value: string };
    txt: { name: string; value: string } | null;
  };
};

function withInstructions(row: CustomDomain): DomainWithInstructions {
  const cnameValue =
    row.cnameTarget ??
    env.NEXT_PUBLIC_CUSTOM_DOMAIN_CNAME_TARGET ??
    env.NEXT_PUBLIC_ROOT_DOMAIN;

  // Railway returns "" for an apex domain; DNS UIs expect "@".
  const cnameName = row.cnameHost && row.cnameHost.length > 0 ? row.cnameHost : "@";

  const txt =
    row.verificationToken && row.verificationHost
      ? { name: row.verificationHost, value: row.verificationToken }
      : null;

  return {
    ...row,
    instructions: {
      cname: { name: cnameName, value: cnameValue },
      txt,
    },
  };
}
