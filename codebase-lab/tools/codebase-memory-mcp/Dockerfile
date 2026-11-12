FROM node:22.12-bookworm-slim

ARG TARGETARCH
ARG CBM_VERSION=v0.12.1
ARG SUPERGATEWAY_VERSION=4.2.1
# Portable (static) builds; checksums from the release's checksums.txt.
ARG SHA_AMD64=8c3d0341064301e78ecc84cf7348d4e2c6562a0f57448243ea560aaa34de36c1
ARG SHA_ARM64=ed0f1f548cd79b121c401c2e9f7841c189a001af26d3768368088c24f6a53533

RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates git \
 && rm -rf /var/lib/apt/lists/* \
 && case "$TARGETARCH" in arm64) A=arm64; S=$SHA_ARM64;; *) A=amd64; S=$SHA_AMD64;; esac \
 && curl -fsSL -o /tmp/cbm.tgz "https://github.com/DeusData/codebase-memory-mcp/releases/download/${CBM_VERSION}/codebase-memory-mcp-linux-${A}-portable.tar.gz" \
 && echo "$S  /tmp/cbm.tgz" | sha256sum -c - \
 && tar -xzf /tmp/cbm.tgz -C /usr/local/bin codebase-memory-mcp && rm /tmp/cbm.tgz \
 && chmod +x /usr/local/bin/codebase-memory-mcp \
 && npm install -g supergateway@${SUPERGATEWAY_VERSION}

ENV CBM_CACHE_DIR=/data
# Repos are mounted read-only and owned by another uid.
RUN git config --system --add safe.directory '*'
COPY index.sh watch.sh /usr/local/bin/
EXPOSE 4340
ENTRYPOINT ["watch.sh"]
CMD ["supergateway", "--stdio", "codebase-memory-mcp", "--outputTransport", "streamableHttp", "--port", "4340", "--streamableHttpPath", "/mcp"]
