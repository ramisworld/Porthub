import "server-only";

import { Prisma } from "../../generated/prisma";
import { db } from "~/server/db";

const GENERATION_LOCK_TTL_MS = 15 * 60 * 1000;
const QUOTA_REACHED = "QUOTA_REACHED";

type LockDeniedCode = "generation_in_progress" | "quota_reached";

export type GenerationLockResult =
  | { ok: true }
  | {
      ok: false;
      code: LockDeniedCode;
      error: string;
      status: 409;
      retryAfter?: number;
    };

function isUniqueConflict(err: unknown) {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "P2002"
  );
}

export async function acquireGenerationLock(
  ownerId: string,
  githubUsername: string,
): Promise<GenerationLockResult> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + GENERATION_LOCK_TTL_MS);

  try {
    await db.$transaction(
      async (tx) => {
        await tx.generationLock.deleteMany({
          where: { expiresAt: { lt: now } },
        });

        const existing = await tx.portfolio.count({ where: { ownerId } });
        if (existing >= 1) {
          throw new Error(QUOTA_REACHED);
        }

        await tx.generationLock.create({
          data: {
            ownerId,
            githubUsername: githubUsername.toLowerCase(),
            expiresAt,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message === QUOTA_REACHED) {
      return {
        ok: false,
        code: "quota_reached",
        status: 409,
        error:
          "You already have a portfolio. PortHub is in beta — only one portfolio per account for now.",
      };
    }

    if (isUniqueConflict(err)) {
      const lock = await db.generationLock.findUnique({
        where: { ownerId },
        select: { expiresAt: true },
      });
      const retryAfter = lock
        ? Math.max(1, Math.ceil((lock.expiresAt.getTime() - Date.now()) / 1000))
        : undefined;

      return {
        ok: false,
        code: "generation_in_progress",
        status: 409,
        retryAfter,
        error:
          "A generation is already running for this account. Wait for it to finish before starting another.",
      };
    }

    throw err;
  }
}

export async function releaseGenerationLock(ownerId: string) {
  await db.generationLock.deleteMany({ where: { ownerId } });
}
