"""Tiny notify endpoint: git-sync POSTs {"repo","head","path"}; for the served
repo, re-run the incremental (hash-cache) LLM-free graph sync. Stdlib only."""
import json, os, subprocess, threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

REPO = os.environ["CGR_REPO"]
lock = threading.Lock()
state = {"last": None, "rc": None}

def update():
    with lock:  # serialize; a burst of pushes queues behind one run
        p = subprocess.run(["cgr", "start", "--repo-path", f"/repos/{REPO}", "--project-name", REPO, "--update-graph"], capture_output=True, text=True)
        state.update(rc=p.returncode, last=(p.stdout + p.stderr)[-500:])
        print("update rc", p.returncode, flush=True)

class H(BaseHTTPRequestHandler):
    def _send(self, code, body):
        b = json.dumps(body).encode()
        self.send_response(code); self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(b))); self.end_headers(); self.wfile.write(b)
    def do_GET(self):
        self._send(200, {"repo": REPO, **state})
    def do_POST(self):
        n = int(self.headers.get("Content-Length") or 0)
        try: repo = json.loads(self.rfile.read(n) or b"{}").get("repo")
        except ValueError: return self._send(400, {"error": "bad json"})
        if repo != REPO: return self._send(200, {"skipped": repo, "serving": REPO})
        threading.Thread(target=update, daemon=True).start()
        self._send(202, {"updating": REPO})

ThreadingHTTPServer(("0.0.0.0", 8080), H).serve_forever()
