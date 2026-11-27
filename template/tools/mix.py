#!/usr/bin/env python3
"""mix.py <project> : build the soundtrack (out/mix.wav) from out/voice.wav, the music bed and the effects in sound.json.

Targets (references/09-sound-and-music.md): speech median RMS -15.2..-15.9 dBFS before final loudness; bed about 15-19 dB
under speech; no 100 ms window under -45 dB before the chapter card; title impact at speech level or louder (-11.5..-15.4 dB RMS)
decaying over ~1.25 s; the chapter card is the only near-quiet moment. Then the whole mix is gained to about -14 LUFS
(two-pass ffmpeg loudnorm, linear) and limited so the AAC file stays under 0 dBTP.

sound.json:
  "bed":  { "file": "bed.mp3", "underSpeech": -34, "measure": [1, 30], "splice": [37.5, 12],
            "patch": [17.85, 19.2, 9.6],   replace a quiet stop in the bed (17.85-19.2 s) with the same stretch 9.6 s earlier
            "level": { "window": 0.5, "ref": 0.7, "maxLift": 8 },   lift the bed's own quiet bars (RMS follower, at most +8 dB)
            "title":   { "from": "@shot title -0.05", "level": -31 },
            "chapter": { "from": "@shot chapter", "level": -48, "ramp": 0.35 } }
  "duck": -10                       ambience bus (cues with "bus": "amb") ducked this many dB under the voice
  "cues": [ { "file": "whoosh", "at": "@shot floorWide -0.06", "gain": -11,
              "dur": 1.3 | "until": "@shotend board", "fade": 0.05, "offset": 0, "bus": "amb",
              "repeat": { "to": "@we NB emails.", "at": [0, 0.45, 0.75, 0.95], "altGain": -2 } } ]
              (repeat "at" = fractions of the way from "at" to "to"; or the older "steps"/"curve"/"overrun" burst)
  "loudness": { "I": -14, "TP": -2.5, "limit": 0.70 }   "roomTone": -46 (dB) or null
Natural pauses are part of the read now (references/08-voices.md): keep effects to the ones that carry a beat (~45 a minute),
and keep the bed audible under every pause (underSpeech -34, patch/level its quiet bars) so a pause never falls silent.
Sound files are looked up in <project>/sfx, template/sfx, template/sfx/basic, template/music (".mp3" or ".wav" optional)."""
import json, os, subprocess, sys
import numpy as np
from common import Project, Resolver, FF, SR, TEMPLATE, load_audio, write_audio, die


def find(P, name):
    for base in (P.p("sfx"), P.p("music"), os.path.join(TEMPLATE, "sfx"), os.path.join(TEMPLATE, "sfx", "basic"), os.path.join(TEMPLATE, "music")):
        for ext in ("", ".mp3", ".wav"):
            f = os.path.join(base, name + ext)
            if os.path.isfile(f): return f
    die(f"sound {name!r} not found in {P.p('sfx')}, template/sfx, template/sfx/basic or template/music")


def rms_db(x): return 10 * np.log10(np.mean(x ** 2) + 1e-12)


def main():
    if len(sys.argv) < 2: die(__doc__)
    P = Project(sys.argv[1])
    V, SHJ = P.voice(), P.shots()
    R = Resolver(V, SHJ)
    SND = P.json("sound.json")
    TOTAL = SHJ["total"] / 30.0
    N = int(TOTAL * SR) + SR
    out = np.zeros((N, 2), np.float32); amb = np.zeros((N, 2), np.float32)
    log = []
    cache = {}

    def place(c, t, gain_db):
        p = find(P, c["file"])
        if p not in cache: cache[p] = load_audio(p, 2)
        x = cache[p][int(c.get("offset", 0.0) * SR):].copy()
        dur = c.get("dur")
        if "until" in c: dur = R.t(c["until"]) - t
        if dur is not None: dur = R.t(dur) if isinstance(dur, str) else dur
        if dur: x = x[:int(dur * SR)]
        n = min(len(x), int(c.get("fade", 0.05) * SR))
        if n > 0 and dur: x[-n:] *= np.linspace(1, 0, n)[:, None]
        x = x * (10 ** (gain_db / 20))
        i = int(max(0, t) * SR)
        j = min(N, i + len(x))
        if j > i: (amb if c.get("bus") == "amb" else out)[i:j] += x[:j - i]
        log.append((round(t, 2), os.path.basename(p), gain_db))

    for c in SND.get("cues", []):
        t0 = R.t(c["at"]); g = c.get("gain", 0.0)
        rp = c.get("repeat")
        if rp and rp.get("at") is not None:
            # a few hits at set fractions of the way to "to" (four quickening pings as a counter climbs)
            c1 = R.t(rp["to"])
            for k, u in enumerate(rp["at"]): place(c, t0 + u * (c1 - t0), g + (rp.get("altGain", 0) if k % 2 else 0))
        elif rp:
            # a burst that speeds up (pings as a counter climbs): step k lands at at + (k/steps)^(1/curve) * (to - at)
            c1 = R.t(rp["to"]); k = 0
            while True:
                u = (k / rp.get("steps", 22)) ** (1 / rp.get("curve", 1.6)); tt = t0 + u * (c1 - t0)
                if tt > c1 + rp.get("overrun", 0.6) or k > 500: break
                place(c, tt, g + (rp.get("altGain", 0) if k % 2 else 0)); k += 1
        else:
            place(c, t0, g)

    sfx = out.copy()
    # ---------------------------------------------------------------- music bed: under the speech, up in the title card, drops at the chapter card
    B = SND.get("bed", {})
    bed = load_audio(find(P, B.get("file", "bed")), 2)
    if B.get("patch"):  # [a, b, back]: replace bed[a:b] (a stop/quiet bar) with the same stretch `back` s earlier, 50 ms crossfades
        a_, b_, back = B["patch"]; _a, _b, _f, _o = int(a_ * SR), int(b_ * SR), int(0.05 * SR), int(back * SR)
        if _a - _o < 0 or _b > len(bed): die(f"sound.json bed.patch {B['patch']} is outside the bed")
        _p = bed[_a - _o:_b - _o].copy(); _r = np.linspace(0, 1, _f)[:, None]
        _p[:_f] = _p[:_f] * _r + bed[_a:_a + _f] * (1 - _r); _p[-_f:] = _p[-_f:] * (1 - _r) + bed[_b - _f:_b] * _r
        bed = bed.copy(); bed[_a:_b] = _p
    if B.get("splice"):  # cut the bed at splice[0] and continue from splice[1] (an earlier bar) so it outlasts the open
        a, b = B["splice"]; bed = np.vstack([bed[:int(a * SR)], bed[int(b * SR):]])
    while len(bed) < N and B.get("loopFrom") is not None:
        bed = np.vstack([bed, bed[int(B["loopFrom"] * SR):]])
    bed = bed[:N] if len(bed) >= N else np.vstack([bed, np.zeros((N - len(bed), 2), np.float32)])
    if B.get("level"):  # lift the bed's own quiet bars toward ref x its median level (RMS follower), at most maxLift dB
        Lv = {"window": 0.5, "ref": 0.7, "maxLift": 8, **(B["level"] if isinstance(B["level"], dict) else {})}
        _k = int(Lv["window"] * SR); _e = np.sqrt(np.convolve(np.mean(bed ** 2, axis=1), np.ones(_k) / _k, mode="same") + 1e-9)
        _lift = np.clip(np.median(_e) * Lv["ref"] / _e, 1.0, 10 ** (Lv["maxLift"] / 20)); bed = (bed * _lift[:, None]).astype(np.float32)
    m0, m1 = B.get("measure", [1, 30])
    bed_lvl = rms_db(bed[int(m0 * SR):int(m1 * SR)])
    t = np.arange(N) / SR
    g_db = np.full(N, float(B.get("underSpeech", -34.0)))  # bed RMS target while the voice runs (speech -15.5 -> ~18.5 dB under)
    if B.get("title"):
        g_db = np.where(t >= R.t(B["title"]["from"]), float(B["title"].get("level", -31.0)), g_db)  # title card: no speech, music comes up
    if B.get("chapter"):
        ch = R.t(B["chapter"]["from"])
        ramp = np.clip((t - ch) / B["chapter"].get("ramp", 0.35), 0, 1); g_db = g_db * (1 - ramp) + float(B["chapter"].get("level", -48.0)) * ramp  # the one near-quiet moment
    gain = 10 ** ((g_db - bed_lvl) / 20)
    k = int(0.05 * SR); gain = np.convolve(gain, np.ones(k) / k, mode="same")  # smooth the gain curve (no clicks)
    music = bed * gain[:, None]
    voice = load_audio(P.o("voice.wav"), 2)
    voice = np.vstack([voice, np.zeros((max(0, N - len(voice)), 2), np.float32)])[:N]
    # duck the ambience bus under the voice (envelope of the voice, 80 ms attack / 250 ms release)
    env = np.abs(voice[:, 0]); k2 = int(0.08 * SR); env = np.convolve(env, np.ones(k2) / k2, mode="same")
    act = (env > 10 ** (-38 / 20)).astype(np.float32); k3 = int(0.25 * SR); act = np.clip(np.convolve(act, np.ones(k3) / k3, mode="same") * 1.5, 0, 1)
    duck = 10 ** ((SND.get("duck", -10) * act) / 20)
    mix = voice + music + sfx + amb * duck[:, None]
    # room tone: a very quiet soft noise floor up to the chapter card, so a gap in the music can never drop a window under -45 dB
    # (buried ~20 dB under the bed everywhere else). "roomTone": null in sound.json turns it off.
    rt = SND.get("roomTone", -46.0)
    if rt is not None:
        rng = np.random.default_rng(11)
        nz = np.cumsum(rng.standard_normal((N, 2)).astype(np.float64), axis=0)
        nz -= np.convolve(nz[:, 0], np.ones(4800) / 4800, mode="same")[:, None]  # remove the drift: soft brown-ish noise
        nz = nz / (np.sqrt(np.mean(nz ** 2)) + 1e-12) * 10 ** (rt / 20)
        ch_t = R.t(B["chapter"]["from"]) if B.get("chapter") else TOTAL
        nz *= np.clip((ch_t - t) / 0.3, 0, 1)[:, None]
        mix = mix + nz.astype(np.float32)
    mix = mix[:int(TOTAL * SR)]
    raw = P.o("mix_raw.wav")
    write_audio(raw, mix, ch=2, codec="pcm_f32le")
    L = {"I": -14, "TP": -2.5, "LRA": 11, "limit": 0.70, **SND.get("loudness", {})}
    r = subprocess.run([FF, "-hide_banner", "-i", raw, "-af", f"loudnorm=I={L['I']}:TP={L['TP']}:LRA={L['LRA']}:print_format=json", "-f", "null", "-"], capture_output=True, text=True).stderr
    j = json.loads(r[r.rfind("{"):r.rfind("}") + 1])
    final = P.o("mix.wav")
    # one linear gain to the target loudness (never loudnorm's dynamic mode), then a limiter run 4x oversampled so it also
    # catches the peaks between samples -- otherwise the AAC encode can overshoot a limited transient by several dB
    gain = L["I"] - float(j["input_i"])
    for _ in range(2):  # the limiter eats a little loudness: measure the result and make it up once
        subprocess.run([FF, "-v", "error", "-y", "-i", raw, "-af", f"volume={gain:.2f}dB,aresample={SR * 4},alimiter=limit={L['limit']}:attack=1:release=80:level=false,aresample={SR}", "-c:a", "pcm_s24le", final], check=True)
        r = subprocess.run([FF, "-hide_banner", "-i", final, "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
        got = float([l for l in r.splitlines() if l.strip().startswith("I:")][-1].split()[1])
        if abs(got - L["I"]) < 0.2: break
        gain += L["I"] - got
    json.dump(log, open(P.o("sfx_placements.json"), "w"), indent=0)
    print(f"mix {TOTAL:.2f}s, {len(log)} effects placed, input {j['input_i']} LUFS {gain:+.1f} dB -> {L['I']}  ({final})")


if __name__ == "__main__":
    main()
