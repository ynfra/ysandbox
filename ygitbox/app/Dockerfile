# ygitbox: MCP server that changes Git repos on people's behalf via a service user.
FROM oven/bun:1.4.4-debian

# git >= 2.40 is required (merge-tree --merge-base); Debian 13 ships 2.47.
RUN apt-get update \
    && apt-get install -y --no-install-recommends git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/ygitbox
COPY package.json bun.lock* tsconfig.json ./
RUN bun install --frozen-lockfile --production
COPY src/ src/

RUN mkdir -p /data && chown -R bun:bun /data
USER bun
ENV YGITBOX_PORT=8790 YGITBOX_DATA_DIR=/data YGITBOX_REPOS_FILE=/config/repos.yaml
EXPOSE 8790
ENTRYPOINT ["bun", "run", "/opt/ygitbox/src/server.ts"]
