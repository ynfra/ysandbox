FROM python:3.12-slim
ARG CGR_VERSION=0.3.13
ARG SUPERGATEWAY_VERSION=3.4.3
RUN apt-get update && apt-get install -y --no-install-recommends nodejs npm git ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g supergateway@${SUPERGATEWAY_VERSION} \
    && pip install --no-cache-dir "code-graph-rag[treesitter-full,sqlite-vec]==${CGR_VERSION}"
WORKDIR /app
