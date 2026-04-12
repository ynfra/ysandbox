# Pandoc

Universal document format converter. Converts between Markdown, DOCX, EPUB, HTML, LaTeX, PDF, and many more formats.

## Services

- **pandoc**: Pandoc server (HTTP API mode)

## Ports

- `3030`: Pandoc server API endpoint

## Usage

```bash
make docker-up
```

## Examples

Convert Markdown to HTML:

```bash
curl -X POST http://localhost:3030 \
    -H "Content-Type: application/json" \
    -d '{"from": "markdown", "to": "html", "text": "# Hello World"}'
```

List supported formats:

```bash
curl http://localhost:3030
```
