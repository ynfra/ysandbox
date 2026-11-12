# celld's release image ships only the binary; `celld deploy` also needs esbuild
# (bundles the TypeScript worker) and npm (installs the worker's dependencies).
FROM ghcr.io/denoland/celld:0.6.3 AS celld

FROM node:22-bookworm-slim
RUN npm install -g esbuild@0.24.2 \
 && apt-get update && apt-get install -y --no-install-recommends ca-certificates curl \
 && rm -rf /var/lib/apt/lists/*
COPY --from=celld /usr/local/bin/celld /usr/local/bin/celld
ENTRYPOINT ["celld"]
