# Apache Tika

![tika](docs/dashboard.png)

Content detection and extraction toolkit. Extracts text, metadata, and structured content from over 1000 file formats.

## Services

- **tika**: Apache Tika server

## Ports

- `9998`: Tika API endpoint

## Usage

```bash
make docker-up
```

## Examples

Extract text from a document:

```bash
curl -T document.pdf http://localhost:9998/tika --header "Accept: text/plain"
```

Extract metadata:

```bash
curl -T document.pdf http://localhost:9998/meta --header "Accept: application/json"
```

Detect file type:

```bash
curl -T document.pdf http://localhost:9998/detect/stream
```

## Running

```bash
docker compose up -d
```

Then hit the server at http://localhost:9998/ — the root serves a "Welcome to
the Apache Tika Server" HTML page listing all endpoints (this is what the
screenshot above shows).

Sample extraction:

```bash
curl -T file.pdf http://localhost:9998/tika
```

Bring the stack down with:

```bash
docker compose down
```

## Notes

- **API-first.** Tika is a REST server, not a web app. The root `/` page is a
  static welcome/endpoint listing (captured in the screenshot); real work is
  done by PUT/POST-ing files to endpoints like `/tika`, `/meta`, and
  `/detect/stream`.
- Boots quickly and returns HTTP 200 on `/` within a few seconds — no config
  or persistent state required.
- Default host port is `9998`. If it clashes with another running stack, add a
  gitignored `docker-compose.override.yml` remapping it (`ports: !override`).
