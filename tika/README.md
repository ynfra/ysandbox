# Apache Tika

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
