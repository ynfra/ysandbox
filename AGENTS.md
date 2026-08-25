# ysandbox — Agent Guide

Local reference library of **self-contained Docker Compose stacks** for
prototyping. Each subdirectory is independent and copy-pasteable — no shared
networks, no cross-stack dependencies. Proven stacks get promoted to
`ydocker/` (the production server).

## Stack layout

```
<stack>/
  docker-compose.yml   # required
  Makefile             # `make docker-up` → `docker compose up`
  README.md            # what it is, ports, how to use
  docs/*.png           # FullHD screenshot referenced from README
  .docker/             # runtime state — gitignored, never commit
```

Run with `docker compose up` (add `--build` for stacks with local `build:`
directives). `terraform-r2` is the one non-Docker stack — use `terraform apply`.

## Rules

1. **Stacks are independent.** Never change one stack to satisfy another.
2. **Never commit `.docker/` or `.env`.** Hardcoded credentials inside
   compose files are intentional sandbox-only defaults — leave them.
3. **Host ports are not unique across stacks.** To run two clashing stacks at
   once, remap one in a gitignored `docker-compose.override.yml` using
   `ports: !override` (a bare list merges, it does not replace).
4. **Reset = delete `.docker/`** and recreate containers. Stacks with named
   volumes (e.g. `supabase`) also need `docker compose down -v`.
5. **New stack:** create a subdirectory with the layout above, capture a
   1920×1080 dashboard screenshot into `docs/` (use the `agent-browser`
   skill), and add the stack to the catalog in `README.md`.

## Gotchas

- **Pin image versions.** `:latest` drifts and silently breaks stale compose
  files (bit `agenta` and `langflow-mcp` before).
- **stdio-only MCP servers** are wrapped via `supercorp/supergateway`
  (→ SSE/HTTP) or `mcpo` (→ OpenAPI/REST). The wrapped package is fetched by
  `npx`/`uvx` at container start, so first boot needs internet. Verify the
  npm/PyPI package name — it often differs from the repo name.
- **Healthchecks fail forever** when the probe binary (`curl`/`wget`) is
  missing from the image. Check before trusting `service_healthy`.
  Fallbacks: busybox `wget`, `python -c` urllib, a node TCP probe.
- **Browser-facing URLs** baked into frontends must be the public
  `http://localhost:<port>` address, never an internal service hostname.
- **Docker-socket mounts are host-root-equivalent** (`agentregistry`,
  `mcp-gateway-registry`); `:ro` does not make them safe.
