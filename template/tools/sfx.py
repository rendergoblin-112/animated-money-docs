#!/usr/bin/env python3
"""sfx.py <project> "<prompt>" <name> [seconds]            one ElevenLabs sound effect -> <project>/sfx/<name>.mp3
   sfx.py <project> --music "<prompt>" <name> <seconds>      one ElevenLabs music track  -> <project>/sfx/<name>.mp3
Appends the prompt to <project>/SOUND_LOG.md and enforces project.json "budget": {"sfx": N} (pass --force to override).
Check every new sound by ear and level before using it (ffmpeg -af volumedetect): some come back near-silent.
Needs ELEVENLABS_API_KEY in the environment, or --env-file <your .env>. template/sfx and template/music already hold a starter
library (template/sfx/PROMPTS.md)."""
import glob, json, os, sys, urllib.request, urllib.error
from common import Project, ssl_context, api_key, pop_env_file, die


def main():
    a = sys.argv[1:]
    env_file = pop_env_file(a)
    force = "--force" in a
    a = [x for x in a if x != "--force"]
    if len(a) < 3: die(__doc__)
    P = Project(a[0]); a = a[1:]
    music = a[0] == "--music"
    if music:
        prompt, name, secs = a[1], a[2], float(a[3])
        url, body = "https://api.elevenlabs.io/v1/music", {"prompt": prompt, "music_length_ms": int(secs * 1000)}
    else:
        prompt, name = a[0], a[1]
        secs = float(a[2]) if len(a) > 2 else None
        url, body = "https://api.elevenlabs.io/v1/sound-generation", {"text": prompt, "prompt_influence": 0.5}
        if secs: body["duration_seconds"] = secs
    d = P.p("sfx"); os.makedirs(d, exist_ok=True)
    budget = (P.project.get("budget") or {}).get("sfx")
    logf = P.p("SOUND_LOG.md")
    used = sum(1 for l in open(logf) if l.startswith("| ") and l[2:3].isdigit()) if os.path.exists(logf) else 0
    if budget is not None and used >= budget and not force: die(f"sound budget reached ({used}/{budget}). Reuse template/sfx or pass --force.")
    out = os.path.join(d, name + ".mp3")
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={"xi-api-key": api_key(env_file), "Content-Type": "application/json"})
    try:
        open(out, "wb").write(urllib.request.urlopen(req, timeout=300, context=ssl_context()).read())
    except urllib.error.HTTPError as e:
        die(f"ElevenLabs HTTP {e.code}: {e.read().decode()[:400]}")
    if not os.path.exists(logf):
        open(logf, "w").write("# Sound log\n\nEvery generated sound, in order.\n\n| # | File | Prompt | s | Used |\n|---|---|---|---|---|\n")
    with open(logf, "a") as fh:
        fh.write(f"| {used + 1} | sfx/{name}.mp3 | {('[music] ' if music else '') + prompt.replace('|', '/')} | {secs or ''} | ? |\n")
    print("saved", out)


if __name__ == "__main__":
    main()
