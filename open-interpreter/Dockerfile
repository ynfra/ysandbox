FROM python:3.11-slim

# The server reads INTERPRETER_HOST (defaults to 127.0.0.1); bind to all
# interfaces so the published port is reachable from the host.
ENV INTERPRETER_HOST=0.0.0.0

# Build tools are required to compile the psutil C extension: the pinned
# version ships no prebuilt aarch64 wheel, so pip builds it from source.
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc python3-dev \
    && pip install --no-cache-dir "open-interpreter[server]" \
    && apt-get purge -y gcc python3-dev \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

EXPOSE 8000

ENTRYPOINT ["interpreter", "--server"]
