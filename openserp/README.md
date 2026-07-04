# OpenSERP

![openserp](docs/dashboard.png)

Search engine results API. Fetches results from Google, Yandex, Baidu, Bing, and DuckDuckGo via a REST API.

## Services

- **openserp**: OpenSERP API server

## Ports

- `7000`: OpenSERP REST API

## Usage

```bash
make docker-up
```

## Examples

Google search:

```bash
curl "http://localhost:7000/google/search?text=hello+world&lang=en"
```

Multi-engine search:

```bash
curl "http://localhost:7000/mega/search?text=hello+world"
```

Image search:

```bash
curl "http://localhost:7000/google/image?text=cats"
```

Health check:

```bash
curl "http://localhost:7000/health"
```

## Running

```bash
docker compose up -d
```

- **Swagger UI**: the interactive API docs render at `/docs` (not
  `/swagger/index.html`) — e.g. `http://localhost:7000/docs`. The OpenAPI
  spec is served at `/openapi.yaml`.
- **Health**: `curl http://localhost:7000/health` → `200`.
- Sample search request:

  ```bash
  curl "http://localhost:7000/google/search?text=docker&lang=EN"
  ```

## Notes

- **AirPlay / port 7000 clash (macOS):** the macOS AirPlay Receiver
  (Control Center) binds host port `7000` and answers with an
  `AirTunes/...` `403`. When testing this stack locally a gitignored
  `docker-compose.override.yml` was used to remap the host port to `7070`
  (`ports: !override` → `"7070:7000"`); all URLs above then use `7070`.
  The override is never committed. Either disable AirPlay Receiver or use
  such an override.
- **Swagger path:** the UI lives at `/docs`, and the root path `/`
  returns `404` — use `/docs`.
- **Live search needs a browser backend.** The engines drive a headless
  Chromium (container ports `9222`/`9223`). Under `linux/amd64` emulation
  on Apple Silicon, `/google/search` may return
  `{"error":"engine_internal","code":502, ... browser connect failed}` if
  the bundled browser can't be reached — this is a runtime/emulation
  limitation, not a compose-config issue. The server itself boots healthy
  and the Swagger UI (screenshot above) renders correctly.
