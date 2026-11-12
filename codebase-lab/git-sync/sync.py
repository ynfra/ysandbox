"""Mirror every repo of one Forgejo org into /repos/<name>, and keep it current.

Two triggers: a poll every SYNC_INTERVAL seconds (catches anything), and a
Forgejo push webhook on POST /hook (makes a push visible in about a second).
Working copies, not bare clones, because the indexers read files.

GET /status reports per repo: HEAD, last sync, last change, last error.
After a repo's HEAD moves, every URL in NOTIFY_URLS gets a JSON POST.
"""

import json
import os
import subprocess
import threading
import time
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

FORGEJO = os.environ.get("FORGEJO_URL", "http://forgejo:3000").rstrip("/")
ORG = os.environ.get("FORGEJO_ORG", "lab")
INTERVAL = int(os.environ.get("SYNC_INTERVAL", "60"))
NOTIFY = [u for u in os.environ.get("NOTIFY_URLS", "").split(",") if u.strip()]
ROOT = "/repos"

state: dict[str, dict] = {}
locks: dict[str, threading.Lock] = {}
guard = threading.Lock()


def git(*args: str, cwd: str | None = None) -> str:
    return subprocess.run(
        ["git", *args], cwd=cwd, check=True, capture_output=True, text=True
    ).stdout.strip()


def list_repos() -> list[str]:
    url = f"{FORGEJO}/api/v1/orgs/{ORG}/repos?limit=100"
    with urllib.request.urlopen(url, timeout=10) as r:
        return [repo["name"] for repo in json.load(r)]


def notify(name: str, head: str) -> None:
    body = json.dumps({"repo": name, "head": head, "path": f"{ROOT}/{name}"}).encode()
    for url in NOTIFY:
        try:
            req = urllib.request.Request(url, body, {"Content-Type": "application/json"})
            urllib.request.urlopen(req, timeout=10).close()
        except Exception as e:  # a down indexer must not stop the sync loop
            print(f"notify {url} failed: {e}")


def sync(name: str) -> None:
    with guard:
        lock = locks.setdefault(name, threading.Lock())
    if not lock.acquire(blocking=False):
        return  # a sync of this repo is already running; it will pick this up
    try:
        path = f"{ROOT}/{name}"
        remote = f"{FORGEJO}/{ORG}/{name}.git"
        entry = state.setdefault(name, {"head": None, "changed_at": None})
        started = time.time()
        if not os.path.isdir(f"{path}/.git"):
            git("clone", "--quiet", remote, path)
        else:
            git("fetch", "--quiet", "--prune", "origin", cwd=path)
            branch = git("symbolic-ref", "--short", "refs/remotes/origin/HEAD", cwd=path)
            git("reset", "--quiet", "--hard", branch, cwd=path)
        head = git("rev-parse", "HEAD", cwd=path)
        entry.update(last_sync=time.strftime("%FT%TZ", time.gmtime()), error=None,
                     sync_seconds=round(time.time() - started, 2))
        if head != entry["head"]:
            entry.update(head=head, changed_at=entry["last_sync"])
            print(f"{name}: now at {head[:12]}")
            notify(name, head)
    except Exception as e:
        state.setdefault(name, {})["error"] = str(e)
        print(f"{name}: sync failed: {e}")
    finally:
        lock.release()


def sync_all() -> None:
    try:
        names = list_repos()
    except Exception as e:
        print(f"listing {ORG} failed: {e}")
        return
    for name in names:
        sync(name)


def poll_loop() -> None:
    while True:
        sync_all()
        time.sleep(INTERVAL)


class Handler(BaseHTTPRequestHandler):
    def _json(self, code: int, obj) -> None:
        body = json.dumps(obj, indent=2).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path in ("/status", "/"):
            self._json(200, {"org": ORG, "interval": INTERVAL, "repos": state})
        else:
            self._json(404, {"error": "not found"})

    def do_POST(self):
        if self.path != "/hook":
            return self._json(404, {"error": "not found"})
        raw = self.rfile.read(int(self.headers.get("Content-Length", 0)) or 0)
        try:
            name = json.loads(raw or b"{}").get("repository", {}).get("name")
        except ValueError:
            name = None
        target = (lambda: sync(name)) if name else sync_all
        threading.Thread(target=target, daemon=True).start()
        self._json(202, {"queued": name or "all"})

    def log_message(self, *_):
        pass


if __name__ == "__main__":
    os.makedirs(ROOT, exist_ok=True)
    threading.Thread(target=poll_loop, daemon=True).start()
    print(f"git-sync: {FORGEJO}/{ORG} -> {ROOT}, every {INTERVAL}s, hook on :8080/hook")
    ThreadingHTTPServer(("0.0.0.0", 8080), Handler).serve_forever()
