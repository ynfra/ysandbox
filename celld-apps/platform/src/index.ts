import { serveApp } from "./serve";
import { handleRoot } from "./rest";
import type { Env } from "./types";

export { Registry } from "./registry";
export { AppHost } from "./apphost";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // URL.hostname never includes the port.
    const host = new URL(request.url).hostname.toLowerCase();
    const domains = env.APPS_DOMAINS.split(",").map((d) => d.trim().toLowerCase()).filter(Boolean);
    // Links handed out use the domain the request arrived on, so one deploy answers
    // on apps.localhost inside the VM and on apps.<vm>.orb.local from the Mac.
    for (const domain of domains) {
      const scoped = { ...env, APPS_DOMAIN: domain };
      if (host === domain) return handleRoot(request, scoped);
      if (host.endsWith(`.${domain}`)) return serveApp(request, scoped, host.slice(0, -domain.length - 1));
    }
    if (host === "localhost") return handleRoot(request, { ...env, APPS_DOMAIN: domains[0] });
    return new Response("Unknown host", { status: 404 });
  },
};
