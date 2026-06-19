import {
  createCallerFactory,
  createTRPCRouter,
  publicProcedure,
} from "~/server/api/trpc";

/**
 * The primary tRPC router. Minimal in Phase 1 (generation runs through the
 * streaming /api/generate Route Handler). Phase 2+ adds portfolio/gallery routers.
 */
export const appRouter = createTRPCRouter({
  health: publicProcedure.query(() => ({ ok: true })),
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 */
export const createCaller = createCallerFactory(appRouter);
