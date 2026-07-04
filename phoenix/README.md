# Phoenix

![phoenix](docs/dashboard.png)

Open-source LLM observability platform by Arize. Provides tracing, evals, and a UI for inspecting LLM application runs via OpenTelemetry.

## Services

- **phoenix**: Phoenix server with OTLP collector and web UI

## Ports

- `6006`: Phoenix web UI
- `4317`: OpenTelemetry gRPC collector (OTLP)

## Usage

```bash
make docker-up
```

Access the UI at http://localhost:6006

## Sending Traces

Install the SDK in your Python project:

```bash
pip install arize-phoenix-otel opentelemetry-sdk
```

Configure your app to send traces:

```python
from phoenix.otel import register

tracer_provider = register(
    project_name="my-project",
    endpoint="http://localhost:4317",
)
```

Or use the standard OTLP exporter:

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
OTEL_EXPORTER_OTLP_PROTOCOL=grpc
```

## Configuration

Key settings in `.env`:

- `PHOENIX_WORKING_DIR`: Path for persisted trace data (default: `/mnt/data`)
- `PHOENIX_SECRET` / `PHOENIX_ENABLE_AUTH`: Enable authentication
- Data is persisted in `.docker/data/`
