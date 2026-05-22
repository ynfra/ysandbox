# Traceloop

Open-source LLM observability platform built on OpenTelemetry. Instruments LLM calls automatically and provides a UI for tracing, monitoring, and debugging AI applications.

## Services

- **traceloop**: Traceloop server with OTLP HTTP collector and web UI

## Ports

- `3000`: Traceloop web UI
- `4318`: OpenTelemetry HTTP collector (OTLP/HTTP)

## Usage

```bash
make docker-up
```

Access the UI at http://localhost:3000

## Sending Traces

Install the SDK in your Python project:

```bash
pip install traceloop-sdk
```

Initialize in your app:

```python
from traceloop.sdk import Traceloop

Traceloop.init(
    app_name="my-app",
    api_endpoint="http://localhost:4318",
    disable_batch=True,
)
```

Or instrument with standard OTLP:

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
```

## Configuration

Key settings in `.env`:

- `TRACELOOP_SECRET_KEY`: Secret for signing authentication tokens
- `TRACELOOP_TELEMETRY`: Opt out of usage telemetry (set to `false`)
- Data is persisted in `.docker/data/`
