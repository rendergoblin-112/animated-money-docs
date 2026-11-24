"""Shared helpers for the Python tools: project paths, ffmpeg I/O, the cast, and the "@" time expressions
(same grammar as engine/js/timeline.js -- see references/project-format.md)."""
import json, os, re, ssl, subprocess, sys

import numpy as np

FF = os.environ.get("FFMPEG", "ffmpeg")
SR = 48000
TEMPLATE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(TEMPLATE)


def die(msg):
    print("error:", msg, file=sys.stderr)
    sys.exit(1)


class Project:
    """A story folder: project.json, script.json, shots.json, sound.json, vo/, and out/ for everything generated."""

    def __init__(self, path):
        self.dir = os.path.abspath(path)
        if not os.path.exists(os.path.join(self.dir, "project.json")):
            die(f"{self.dir} has no project.json (is this a project folder?)")
        self.out = os.path.join(self.dir, "out")
        self.tl = os.path.join(self.out, "timeline")
        os.makedirs(self.tl, exist_ok=True)

    def p(self, *a):
        return os.path.join(self.dir, *a)

    def o(self, *a):
        return os.path.join(self.out, *a)

    def json(self, name, required=True):
        f = self.p(name)
        if not os.path.exists(f):
            if required: die(f"missing {f}")
            return None
        with open(f) as fh:
            try:
                return json.load(fh)
            except json.JSONDecodeError as e:
                die(f"{f}: invalid JSON ({e})")

    @property
    def project(self):
        return self.json("project.json")

    def voice(self):
        f = os.path.join(self.tl, "voice.json")
        if not os.path.exists(f): die("no out/timeline/voice.json yet: run tools/voice_build.py first")
        return json.load(open(f))

    def shots(self):
        f = os.path.join(self.tl, "shots.json")
        if not os.path.exists(f): die("no out/timeline/shots.json yet: run `node template/tools/render.mjs <project> info` first")
        return json.load(open(f))


def load_cast(project):
    """default cast (template/cast/default.json) deep-merged with project.json castOverrides / extra cast members"""
    pj = project.project
    src = pj.get("cast", "default")
    path = os.path.join(TEMPLATE, "cast", src + ".json") if not src.endswith(".json") else project.p(src)
    cast = json.load(open(path))

    def merge(a, b):
        if not isinstance(a, dict) or not isinstance(b, dict): return b
        o = dict(a)
        for k, v in b.items(): o[k] = merge(a.get(k), v) if k in a else v
        return o
    return merge(cast, pj.get("castOverrides", {}))


def load_audio(path, ch=1, sr=SR):
    raw = subprocess.run([FF, "-v", "error", "-i", path, "-ac", str(ch), "-ar", str(sr), "-f", "f32le", "-"], capture_output=True)
    if raw.returncode != 0: die(f"ffmpeg could not read {path}: {raw.stderr.decode()[:300]}")
    x = np.frombuffer(raw.stdout, dtype=np.float32).copy()
    return x.reshape(-1, ch) if ch > 1 else x


def write_audio(path, x, ch=1, sr=SR, codec="pcm_s16le"):
    subprocess.run([FF, "-loglevel", "error", "-y", "-f", "f32le", "-ar", str(sr), "-ac", str(ch), "-i", "-", "-c:a", codec, path],
                   input=np.ascontiguousarray(x, dtype=np.float32).tobytes(), check=True)


def ssl_context():
    """default trust store, plus the system bundle where Python ships without one (python.org builds on macOS)"""
    ctx = ssl.create_default_context()
    for f in ("/etc/ssl/cert.pem", "/etc/ssl/certs/ca-certificates.crt"):
        if os.path.exists(f):
            try: ctx.load_verify_locations(f)
            except Exception: pass
    return ctx


def pop_env_file(argv):
    """remove "--env-file PATH" from argv and return PATH (or None)"""
    if "--env-file" in argv:
        i = argv.index("--env-file"); p = argv[i + 1]; del argv[i:i + 2]
        return os.path.expanduser(p)
    return None


def api_key(env_file=None):
    """ELEVENLABS_API_KEY from the environment, or from a dotenv file you point at with --env-file (read, never copied)"""
    k = os.environ.get("ELEVENLABS_API_KEY")
    if not k and env_file:
        if not os.path.exists(env_file): die(f"--env-file {env_file} not found")
        for line in open(env_file):
            line = line.strip()
            if line.startswith("export "): line = line[7:]
            if line.startswith("ELEVENLABS_API_KEY="): k = line.split("=", 1)[1].strip().strip("'\""); break
    if not k:
        die("ELEVENLABS_API_KEY is not set. Export it (export ELEVENLABS_API_KEY=...) or pass --env-file <your .env>. The key is never stored in a project.")
    return k


# ---------------------------------------------------------------- "@" time expressions (mirror of engine/js/timeline.js)
def clean(s):
    return re.sub(r"[^a-z0-9'-]", "", s.lower())


class Resolver:
    def __init__(self, voice, shots=None, fps=30):
        self.lines = {l["id"]: l for l in voice["lines"]}
        self.shots = {s["id"]: s for s in (shots or {}).get("shots", [])}
        self.fps = fps

    def word(self, lid, tok):
        L = self.lines.get(lid)
        if not L: die(f"time expression: line {lid} not in the voice timeline")
        after, w = tok.split(">", 1) if ">" in tok else (None, tok)
        nth = 0
        m = re.match(r"^(.*)#(\d+)$", w)
        if m: w, nth = m.group(1), int(m.group(2))
        ws = L["words"]; start = 0
        if after:
            idx = [clean(x["text"]) for x in ws]
            if clean(after) not in idx: die(f"time expression: {after} not in line {lid}")
            start = idx.index(clean(after)) + 1
        k = 0
        for x in ws[start:]:
            if clean(x["text"]) == clean(w):
                if k == nth: return x
                k += 1
        die(f"time expression: word {w!r} not found in line {lid}: {' '.join(x['text'] for x in ws)}")

    def t(self, expr):
        if isinstance(expr, (int, float)): return float(expr)
        if not isinstance(expr, str) or not expr.startswith("@"): die(f"not a time expression: {expr!r}")
        tk = expr[1:].split()
        kind, rest = tk[0], []
        if kind in ("cut", "ws", "we"):
            w = self.word(tk[1], tk[2]); rest = tk[3:]
            v = w["end"] if kind == "we" else w["start"]
            if kind == "cut": v = max(0, round((v - 0.067) * self.fps)) / self.fps
        elif kind in ("start", "end"):
            v = self.lines[tk[1]][kind]; rest = tk[2:]
        elif kind in ("shot", "shotend"):
            s = self.shots.get(tk[1])
            if not s: die(f"time expression: shot {tk[1]} not in out/timeline/shots.json")
            v = s["start"] if kind == "shot" else s["end"]; rest = tk[2:]
        else:
            die(f"time expression: unknown kind {kind!r} in {expr}")
        for r in rest: v += float(r)
        return v
