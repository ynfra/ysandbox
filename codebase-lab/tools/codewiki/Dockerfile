FROM python:3.12-slim
# Pinned: tag v2.0.0 (2026-09-18, latest release). Its pyproject depends on
# coding-agent-wrapper@fix/codex-exec-robustness (a branch), so the line is rewritten to a fixed commit.
ARG CODEWIKI_REF=v2.0.0
ARG CAW_SHA=9ec22af22a32ee50392443ae00ca401c3ec4e46b
ARG SUPERGATEWAY_VERSION=4.2.1
RUN apt-get update && apt-get install -y --no-install-recommends git curl ca-certificates build-essential nodejs npm \
 && rm -rf /var/lib/apt/lists/* \
 && git clone --depth 1 --branch "${CODEWIKI_REF}" https://github.com/FSoft-AI4Code/CodeWiki.git /opt/codewiki \
 && sed -i "s#caw@fix/codex-exec-robustness#caw@${CAW_SHA}#" /opt/codewiki/pyproject.toml \
 && grep -q "caw@${CAW_SHA}" /opt/codewiki/pyproject.toml \
 && pip install --no-cache-dir /opt/codewiki \
 && npm install -g "supergateway@${SUPERGATEWAY_VERSION}" && npm cache clean --force
COPY entrypoint.sh /usr/local/bin/cw-entrypoint
RUN chmod +x /usr/local/bin/cw-entrypoint
ENV HOME=/data CODEWIKI_NO_KEYRING=1
WORKDIR /data
ENTRYPOINT ["cw-entrypoint"]
