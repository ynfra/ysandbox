# OpenSERP

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
