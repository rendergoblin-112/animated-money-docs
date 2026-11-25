#!/usr/bin/env python3
"""tts.py <project> <lineId> [options] : one ElevenLabs TTS call for one script line, through /with-timestamps.

Writes <project>/vo/<line>_<voice>_<n>.mp3, .align.json (character timings) and .tts.json (text, settings, seed, request id),
appends a row to <project>/VOICE_LOG.md, and (if librosa is installed) prints the take's median pitch against the cast target.

Text comes from script.json (that line's "text"; put the delivery tag first, e.g. "[curious] ...", and spell numbers out).
Voice comes from the speaker's cast entry (voice.id, voice.settings) unless you pass --voice.
  --voice <castId|voiceId>   --stability S  --similarity S  --style S  --seed N  --model eleven_v4
  --prev auto|none|<ids>     continuity with earlier takes. <ids> = line ids or request ids, comma separated (up to 3).
                             A line id means that line's chosen take (script.json take), else its newest. Takes under 2 hours old are sent as
                             previous_request_ids (request stitching: the delivery carries over); older ones fall back
                             to previous_text. auto = for a narrator line, the up to 3 previous lines by the same voice
                             (stitched); for any other line, the line before as previous_text.
  --text "..."               try a different wording (logged; update script.json if you keep it)
  --ref HZ                   narrator pitch for the skit voices' ratio band (default: median of logged narrator takes, else 130)
  --force                    ignore the project's TTS budget (project.json "budget": {"tts": N})
  --env-file <path>          read ELEVENLABS_API_KEY from this dotenv file if it isn't in the environment
Needs ELEVENLABS_API_KEY in the environment (or --env-file).

Pitch: if the cast voice has "band" (Hz) or "bandRatio" (x the narrator), the take is marked in or out of band. Out of band:
re-roll the seed or change the delivery tag. Don't pitch-shift (PSOLA audibly roughens the voice); a take slightly outside
the band beats a shifted one."""
import base64, glob, json, os, re, sys, time, urllib.request, urllib.error
from common import Project, load_cast, ssl_context, api_key, pop_env_file, die


def main():
    a = sys.argv[1:]
    env_file = pop_env_file(a)
    if len(a) < 2: die(__doc__)
    opt = {}
    for f in ("--voice", "--stability", "--similarity", "--style", "--seed", "--model", "--prev", "--text", "--ref"):
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
    stitched = []
    if prev != "none":
        def newest(line_id):  # the line's chosen take (script.json take.audio), else its newest: (request id, age in s, voice id)
            tk = (lines[ids.index(line_id)].get("take") or {}).get("audio", "")
            chosen = P.p(re.sub(r"(_ps)?\.(mp3|wav)$", "", tk) + ".tts.json") if tk else ""
            fs = [chosen] if chosen and os.path.exists(chosen) else sorted(glob.glob(os.path.join(vo, f"{line_id}_*.tts.json")), key=os.path.getmtime)
            if not fs: return None
            d = json.load(open(fs[-1]))
            return d.get("request_id"), time.time() - os.path.getmtime(fs[-1]), d.get("voice")
        k = ids.index(lid)
        if prev == "auto":
            want = [l["id"] for l in lines[:k] if l["speaker"] == "narrator"][-3:] if L["speaker"] == "narrator" else []
        else:
            want = [x.strip() for x in prev.split(",") if x.strip()][:3]
        for x in want:
            if x in ids:
                n_ = newest(x)
                if n_ and n_[0] and n_[1] < 7000 and n_[2] == voice["id"]: stitched.append(n_[0])
                else: stitched = []; break
            else: stitched.append(x)  # a raw request id
        if stitched: body["previous_request_ids"] = stitched
        else:
            j = k - 1 if prev == "auto" else (ids.index(want[-1]) if want and want[-1] in ids else -1)
            if j >= 0: body["previous_text"] = re.sub(r"^\s*\[[^\]]*\]\s*", "", lines[j]["text"])
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
        if len(f): pitch = f"{np.median(f):.1f} Hz"; hz = float(np.median(f))
    except Exception:
        hz = None
    verdict = ""
    vc = who.get("voice") or {}
    if pitch and hz:
        log["pitch_hz"] = round(hz, 1); json.dump(log, open(out[:-4] + ".tts.json", "w"), indent=1)
        if vc.get("band"):
            lo_, hi_ = vc["band"]; verdict = "in band" if lo_ <= hz <= hi_ else f"OUT of band {lo_}-{hi_} Hz"
        elif vc.get("bandRatio"):
            ref = float(opt["--ref"]) if "--ref" in opt else None
            if ref is None:
                nid = (cast.get("narrator", {}).get("voice") or {}).get("id")
                nar = [d_.get("pitch_hz") for d_ in (json.load(open(f_)) for f_ in glob.glob(os.path.join(vo, "*.tts.json"))) if d_.get("voice") == nid]
                nar = [x for x in nar if x]
                ref = float(np.median(nar)) if nar else 130.0
            r_ = hz / ref; lo_, hi_ = vc["bandRatio"]
            verdict = f"{r_:.2f}x narrator ({ref:.0f} Hz): " + ("in band" if lo_ <= r_ <= hi_ else f"OUT of band {lo_}-{hi_}x")
        if "OUT" in verdict: verdict += " -> re-roll the seed or change the delivery tag; don't pitch-shift"
    logf = P.p("VOICE_LOG.md")
    if not os.path.exists(logf):
        open(logf, "w").write("# Voice log\n\nEvery ElevenLabs TTS call, in order. Budget: " + (f"{budget}" if budget is not None else "none set") + ".\n\n| # | File | Line | Voice | Text | Settings | Request id | Pitch | Used |\n|---|---|---|---|---|---|---|---|---|\n")
    st = f"stab {body['voice_settings']['stability']}" + (f", seed {body['seed']}" if "seed" in body else "") + (f", stitched {len(stitched)}" if stitched else ", prev text" if "previous_text" in body else "")
    with open(logf, "a") as fh:
        fh.write(f"| {used} | vo/{os.path.basename(out)} | {lid} | {voice.get('name', voice['id'])} | {text.replace('|', '/')} | {st} | {log['request_id']} | {pitch} | ? |\n")
    target = (who.get("voice") or {}).get("target", "")
    print(f"saved {out}  request-id {log['request_id']}  chars {log['character_cost']}  call {used}" + (f"/{budget}" if budget is not None else "") + (f"  pitch {pitch}" if pitch else "") + (f"  (target {target})" if target else "") + (f"  [{verdict}]" if verdict else ""))


if __name__ == "__main__":
    main()
