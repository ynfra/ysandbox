# Thumbor

On-demand image processing server. Resize, crop, flip, and apply filters to images via URL parameters.

## Services

- **thumbor**: Thumbor image processing server

## Ports

- `8888`: Thumbor API endpoint

## Usage

```bash
make docker-up
```

## Examples

Resize an image to 300x200:

```bash
curl "http://localhost:8888/unsafe/300x200/https://example.com/image.jpg" -o resized.jpg
```

Smart crop (face detection):

```bash
curl "http://localhost:8888/unsafe/300x200/smart/https://example.com/photo.jpg" -o cropped.jpg
```

## Configuration

- `THUMBOR_SECURITY_KEY`: Key for generating signed URLs (default: `thumbor-sandbox-key`)
- `ALLOW_UNSAFE_URL`: Allow unsigned `/unsafe/` URLs (default: `True`)
- Image cache is persisted in `.docker/data/`
