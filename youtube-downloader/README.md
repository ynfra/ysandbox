# Youtube Downloaders

![youtube-downloader](docs/dashboard.png)

This is a simple docker compose file to run both Pinchflat and Metube.

To use it, simply run the following command:

```bash
docker compose up -d
```

## Running

```bash
docker compose up -d
```

Two web UIs become available:

- **Pinchflat** — http://localhost:8945 (channel/playlist archiver, the richer dashboard)
- **MeTube** — http://localhost:8081 (single URL downloader)

No login is required by default. Bring the stack down with `docker compose down`.

## Notes

- **Pinchflat has no `arm64` image.** `ghcr.io/kieraneglin/pinchflat:latest`
  publishes only a `linux/amd64` manifest, so on Apple-silicon / arm64 hosts a
  plain `docker compose up -d` fails with
  `no matching manifest for linux/arm64/v8`. The compose file pins
  `platform: linux/amd64` on the `pinchflat` service so it runs under
  emulation (OrbStack Rosetta / Docker Desktop QEMU). This is a no-op on amd64
  hosts. MeTube ships a native `arm64` image and needs no pin.
- Both services persist downloads under `.docker/` (gitignored). Pinchflat also
  keeps its config in `.docker/pinchflat/config`.

