# Yellow Lab Tools

![yellowlabtools](docs/dashboard.png)

Web page analysis tool that detects performance and front-end code quality issues. Scores pages on performance, code complexity, and best practices.

## Services

- **yellowlabtools**: Yellow Lab Tools web application

## Ports

- `8383`: Yellow Lab Tools web UI

## Usage

```bash
make docker-up
```

## Examples

Open `http://localhost:8383` and enter a URL to analyze. Results include scores for page weight, requests, DOM complexity, CSS complexity, JavaScript complexity, and more.

## Running

```bash
docker compose up -d
```

- UI: <http://localhost:8383>
- Run an analysis: type a URL (e.g. `https://example.com`) into the input box on
  the home page and click **Launch test**. The job goes through a short queue
  (`/queue/<id>`) and then redirects to the results dashboard (`/result/<id>`)
  showing the global grade and per-category score details.

Bring the stack down with `docker compose down`.

## Notes

- **Chromium sandbox / `security_opt`.** Yellow Lab Tools runs each audit with a
  headless Chromium (via Phantomas/Puppeteer). The default Docker seccomp
  profile blocks the syscalls Chromium needs to create its sandbox namespaces,
  so every analysis fails with `Failed to move to new namespace ... Operation
  not permitted` and the run never leaves the queue. The compose file sets
  `security_opt: [seccomp:unconfined]` so the browser can launch. The web UI
  itself boots fine without it — only the analysis step needs it.
