import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "~/server/auth";

export const dynamic = "force-dynamic";

/**
 * Everything in the (app) group requires a signed-in user. Unauthenticated
 * requests get bounced to /sign-in with a `next` param so post-auth we land
 * them right back where they were trying to go.
 */
export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const h = await headers();
  const session = await getSession(h);
  if (!session?.user) {
    const path = h.get("x-pathname") ?? "/generate";
    redirect(`/sign-in?next=${encodeURIComponent(path)}`);
  }
  return <>{children}</>;
}
