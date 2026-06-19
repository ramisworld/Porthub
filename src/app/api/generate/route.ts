import { type NextRequest } from "next/server";
import { z } from "zod";
import { rateLimit } from "~/server/ratelimit";
import { runGeneration } from "~/server/portfolio/generate";

// Prisma / Octokit / Anthropic are Node-only — do NOT run on the Edge runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  username: z
    .string()
    .trim()
    .regex(/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i, "Invalid GitHub username"),
  vibe: z.string().trim().min(1, "Describe a vibe").max(300),
});

function json(data: unknown, status: number, headers?: HeadersInit) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

export async function POST(req: NextRequest) {
  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch (e) {
    const msg = e instanceof z.ZodError ? e.issues[0]?.message : "Invalid request";
    return json({ error: msg ?? "Invalid request" }, 400);
  }
  const { username, vibe } = parsed;

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const rl = rateLimit(`${ip}:${username.toLowerCase()}`);
  if (!rl.ok) {
    return json({ error: "Too many requests. Slow down." }, 429, {
      "retry-after": String(rl.retryAfter),
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of runGeneration(username, vibe)) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        }
      } catch (err) {
        const error = err instanceof Error ? err.message : "Generation failed.";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ stage: "error", error })}\n\n`),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
