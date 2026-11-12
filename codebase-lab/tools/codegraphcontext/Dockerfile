FROM python:3.12-slim
ARG CGC_VERSION=0.6.13
ARG SUPERGATEWAY_VERSION=4.2.1
RUN apt-get update && apt-get install -y --no-install-recommends git curl ca-certificates nodejs npm \
 && rm -rf /var/lib/apt/lists/* \
 && pip install --no-cache-dir "codegraphcontext==${CGC_VERSION}" \
 && npm install -g "supergateway@${SUPERGATEWAY_VERSION}" && npm cache clean --force
ENV HOME=/data
WORKDIR /data
