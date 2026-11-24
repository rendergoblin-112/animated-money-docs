#!/usr/bin/env python3
"""tts.py <project> <lineId> [options] : one ElevenLabs TTS call for one script line, through /with-timestamps.

Writes <project>/vo/<line>_<voice>_<n>.mp3, .align.json (character timings) and .tts.json (text, settings, seed, request id),
appends a row to <project>/VOICE_LOG.md, and (if librosa is installed) prints the take's median pitch against the cast target.

Text comes from script.json (that line's "text"; put the delivery tag first, e.g. "[curious] ...", and spell numbers out).
Voice comes from the speaker's cast entry (voice.id, voice.settings) unless you pass --voice.
  --voice <castId|voiceId>   --stability S  --similarity S  --style S  --seed N  --model eleven_v4
  --prev auto|none|<lineId>  previous_text for continuity (auto = the line before in script.json)
  --text "..."               try a different wording (logged; update script.json if you keep it)
  --force                    ignore the project's TTS budget (project.json "budget": {"tts": N})
  --env-file <path>          read ELEVENLABS_API_KEY from this dotenv file if it isn't in the environment
Needs ELEVENLABS_API_KEY in the environment (or --env-file)."""
import base64, glob, json, os, re, sys, urllib.request, urllib.error
from common import Project, load_cast, ssl_context, api_key, pop_env_file, die


def main():
    a = sys.argv[1:]
    env_file = pop_env_file(a)
    if len(a) < 2: die(__doc__)
    opt = {}
    for f in ("--voice", "--stability", "--similarity", "--style", "--seed", "--model", "--prev", "--text"):
        if f in a: i = a.index(f); opt[f] = a[i + 1]; del a[i:i + 2]
    force = "--force" in a
    if force: a.remove("--force")
    P = Project(a[0]); lid = a[1]
    S = P.json("script.json"); pj = P.project
    lines = S["lines"]; ids = [l["id"] for l in lines]
    if lid not in ids: die(f"line {lid} not in script.json (lines: {', '.join(ids)})")
    L = lines[ids.index(lid)]
    cast = load_cast(P)
    who = cast.get(L["speaker"], {})
    v = opt.get("--voice") or L["speaker"]
    voice = cast[v]["voice"] if v in cast and cast[v].get("voice") else ({"id": v, "name": v} if re.match(r"^[A-Za-z0-9]{16,}$", v) else None)
    if not voice: die(f"no voice for {v!r}: give the speaker a cast voice or pass --voice <voiceId>")
    vo = P.p("vo"); os.makedirs(vo, exist_ok=True)
    budget = (pj.get("budget") or {}).get("tts")
    used = len(glob.glob(os.path.join(vo, "*.tts.json")))
    if budget is not None and used >= budget and not force:
        die(f"TTS budget reached: {used}/{budget} calls logged in {vo}. Reuse a take, pitch-correct one (tools/psola.py), or pass --force.")
    text = opt.get("--text") or L["text"]
    settings = dict((voice.get("settings") or {}))
    body = {"text": text, "model_id": opt.get("--model", "eleven_v4"), "language_code": pj.get("language", "en"),
            "voice_settings": {"stability": float(opt.get("--stability", settings.get("stability", 0.5))), "similarity_boost": float(opt.get("--similarity", settings.get("similarity", 0.75)))}}
    if "--style" in opt: body["voice_settings"]["style"] = float(opt["--style"])
    if "--seed" in opt: body["seed"] = int(opt["--seed"])
    prev = opt.get("--prev", "auto")
    if prev != "none":
        k = ids.index(lid) - 1 if prev == "auto" else (ids.index(prev) if prev in ids else -1)
        if k >= 0: body["previous_text"] = re.sub(r"^\s*\[[^\]]*\]\s*", "", lines[k]["text"])
    name = re.sub(r"[^a-z0-9]", "", voice.get("name", "v").lower()) or "v"
    n = 1
    while os.path.exists(os.path.join(vo, f"{lid}_{name}_{n}.mp3")): n += 1
    out = os.path.join(vo, f"{lid}_{name}_{n}.mp3")
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{voice['id']}/with-timestamps?output_format=mp3_44100_192",
                                 data=json.dumps(body).encode(), headers={"xi-api-key": api_key(env_file), "Content-Type": "application/json"})
    try:
        r = urllib.request.urlopen(req, timeout=600, context=ssl_context())
    except urllib.error.HTTPError as e:
        die(f"ElevenLabs HTTP {e.code}: {e.read().decode()[:500]}")
    d = json.loads(r.read())
    open(out, "wb").write(base64.b64decode(d["audio_base64"]))
    json.dump({"alignment": d.get("alignment"), "normalized_alignment": d.get("normalized_alignment")}, open(out[:-4] + ".align.json", "w"))
    log = dict(body); log.update({"voice": voice["id"], "voice_name": voice.get("name"), "line": lid, "endpoint": "with-timestamps", "request_id": r.headers.get("request-id"), "character_cost": r.headers.get("character-cost")})
    json.dump(log, open(out[:-4] + ".tts.json", "w"), indent=1)
    used += 1
    pitch = ""
    try:
        import numpy as np, librosa
        y, sr = librosa.load(out, sr=16000, mono=True)
        lo, hi = (who.get("voice") or {}).get("pyinRange", [65, 400])
        f, vv, _ = librosa.pyin(y, fmin=lo, fmax=hi, sr=sr, frame_length=1024)
        f = f[vv & ~np.isnan(f)]
        if len(f): pitch = f"{np.median(f):.1f} Hz"
    except Exception:
        pass
    logf = P.p("VOICE_LOG.md")
    if not os.path.exists(logf):
        open(logf, "w").write("# Voice log\n\nEvery ElevenLabs TTS call, in order. Budget: " + (f"{budget}" if budget is not None else "none set") + ".\n\n| # | File | Line | Voice | Text | Settings | Request id | Pitch | Used |\n|---|---|---|---|---|---|---|---|---|\n")
    st = f"stab {body['voice_settings']['stability']}" + (f", seed {body['seed']}" if "seed" in body else "") + (", prev" if "previous_text" in body else "")
    with open(logf, "a") as fh:
        fh.write(f"| {used} | vo/{os.path.basename(out)} | {lid} | {voice.get('name', voice['id'])} | {text.replace('|', '/')} | {st} | {log['request_id']} | {pitch} | ? |\n")
    target = (who.get("voice") or {}).get("target", "")
    print(f"saved {out}  request-id {log['request_id']}  chars {log['character_cost']}  call {used}" + (f"/{budget}" if budget is not None else "") + (f"  pitch {pitch}" if pitch else "") + (f"  (target {target})" if target else ""))


if __name__ == "__main__":
    main()
