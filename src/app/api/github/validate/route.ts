import { type NextRequest } from "next/server";
import { z } from "zod";
import { headers as nextHeaders } from "next/headers";
import { getSession } from "~/server/auth";
import { githubUserExists } from "~/server/github/fetch";
import { rateLimit } from "~/server/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  username: z
    .string()
    .trim()
    .regex(
      /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i,
      "Invalid GitHub username",
    ),
});

function json(data: unknown, status: number, headers?: HeadersInit) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

/**
 * Pre-flight check used by /generate before we kick off the SSE pipeline.
 * Returns { exists: boolean }; an invalid format is a 400.
 *
 * Auth required — anonymous callers can't grind through GitHub via this.
 * Per-user rate-limited (5 / 60s) to discourage typo-bursting.
 */
export async function POST(req: NextRequest) {
  const session = await getSession(await nextHeaders());
  if (!session?.user) return json({ error: "Unauthorized" }, 401);

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch (e) {
    const msg = e instanceof z.ZodError ? e.issues[0]?.message : "Invalid request";
    return json({ error: msg ?? "Invalid request", exists: false }, 400);
  }

  const rl = rateLimit(`validate:${session.user.id}`);
  if (!rl.ok) {
    return json({ error: "Too many requests" }, 429, {
      "retry-after": String(rl.retryAfter),
    });
  }

  const exists = await githubUserExists(parsed.username);
  return json({ exists }, 200);
}
