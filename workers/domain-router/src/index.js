/**
 * PortHub custom-domain router.
 *
 * Cloudflare for SaaS terminates TLS for each user-owned custom hostname and
 * forwards the request to this Worker (its fallback origin). We proxy it to the
 * Railway app at UPSTREAM, preserving the path/query/method/body and tagging the
 * ORIGINAL visited host in `x-porthub-host`. The app's middleware reads that
 * header to route to the correct portfolio.
 *
 * Why the header? Railway's edge only serves hostnames it has explicitly
 * registered. We send the request to UPSTREAM (porthub.rami.co.nz — registered)
 * so Railway accepts it, and carry the real custom domain out-of-band.
 */
export default {
  /**
   * @param {Request} request
   * @param {{ UPSTREAM: string }} env
   */
  async fetch(request, env) {
    const incoming = new URL(request.url);
    const customHost = incoming.hostname; // e.g. john.com

    const upstreamBase = new URL(env.UPSTREAM);
    const target = new URL(request.url);
    target.protocol = upstreamBase.protocol;
    target.hostname = upstreamBase.hostname;
    target.port = upstreamBase.port;

    // Clone headers; drop the inbound Host so fetch derives it from the target
    // URL (= porthub.rami.co.nz, which Railway accepts). Carry the real host.
    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.set("x-porthub-host", customHost);
    // Standard forwarding hints (harmless, helps logging/analytics downstream).
    headers.set("x-forwarded-host", customHost);

    const init = {
      method: request.method,
      headers,
      redirect: "manual",
    };
    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = request.body;
    }

    return fetch(target.toString(), init);
  },
};
