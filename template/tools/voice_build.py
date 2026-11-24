#!/usr/bin/env python3
"""voice_build.py <project> : assemble the voice track from the chosen takes (script.json "take" on every line).

For each take: trim to the speech, cap every internal pause (after punctuation gaps.sentence, elsewhere gaps.word), time-stretch
with ffmpeg atempo (pitch kept), then join the lines with each line's take.gap before it. Every character's time from the
ElevenLabs alignment is carried through each step, so out/timeline/voice.json holds words AND characters at their absolute
times in the finished track (used for cuts, typing cards and lip sync). Each line is level-matched to script.json "level"
(default -15.5 dBFS RMS on its voiced part). Writes out/voice.wav and out/timeline/voice.json.

A take's "audio" may be a pitch-corrected copy (tools/psola.py keeps duration) while "align" stays the original call's
alignment file, because PSOLA does not move any sound in time."""
import json, os, re, subprocess, sys
import numpy as np
from common import Project, FF, SR, load_audio, write_audio, die


def atempo(x, f):
    if abs(f - 1) < 1e-3: return x
    r = subprocess.run([FF, "-loglevel", "error", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-af", f"atempo={f}", "-f", "f32le", "-"], input=x.tobytes(), capture_output=True)
    return np.frombuffer(r.stdout, dtype=np.float32).copy()


def fade(seg, n=96):
    n = min(n, len(seg) // 2)
    if n > 0: seg[:n] *= np.linspace(0, 1, n); seg[-n:] *= np.linspace(1, 0, n)
    return seg


def chars_words(align_path):
    A = json.load(open(align_path))
    A = A.get("alignment") or A
    ch = list(zip(A["characters"], A["character_start_times_seconds"], A["character_end_times_seconds"]))
    s = "".join(c for c, _, _ in ch)
    m = re.match(r"\s*\[[^\]]*\]\s*", s)  # drop a leading delivery tag like [curious]
    if m: ch = ch[m.end():]
    words, cur = [], []
    for c in ch + [(" ", 0, 0)]:
        if c[0].isspace():
            if cur:
                txt = "".join(x[0] for x in cur)
                letters = [x for x in cur if x[0].isalnum()] or cur
                words.append({"text": txt, "start": letters[0][1], "end": letters[-1][2]})
                cur = []
        else: cur.append(c)
    chars = [{"c": c, "start": a, "end": b} for c, a, b in ch if not c.isspace()]
    return words, chars


def build_line(P, lid, audio, align, tempo, SENT_GAP, WORD_GAP, SPECIAL):
    for f in (audio, align):
        if not os.path.exists(P.p(f)): die(f"line {lid}: {P.p(f)} not found")
    x = load_audio(P.p(audio))
    W, C = chars_words(P.p(align))
    segs = []; cur = max(0.0, W[0]["start"] - 0.04)
    for i, w in enumerate(W[:-1]):
        gap = W[i + 1]["start"] - w["end"]
        word = w["text"].strip(" ,.?!\"'").lower()
        cap = SPECIAL.get((lid, word), SENT_GAP if w["text"].rstrip("\"'")[-1:] in ".?!," else WORD_GAP)
        if gap > cap:
            segs.append((cur, w["end"] + cap / 2)); cur = W[i + 1]["start"] - cap / 2
    segs.append((cur, min(len(x) / SR, W[-1]["end"] + 0.12)))

    def remap(t):
        out = 0.0
        for a, b in segs:
            if t <= a: return out
            if t <= b: return out + (t - a)
            out += b - a
        return out
    y = np.concatenate([fade(x[int(a * SR):int(b * SR)].copy()) for a, b in segs])
    y = atempo(y, tempo)
    rm = lambda t: round(remap(t) / tempo, 3)
    return y, [{"text": w["text"], "start": rm(w["start"]), "end": rm(w["end"])} for w in W], [{"c": c["c"], "start": rm(c["start"]), "end": rm(c["end"])} for c in C]


def rms_db(v): return 10 * np.log10(np.mean(v ** 2) + 1e-12)


def main():
    if len(sys.argv) < 2: die(__doc__)
    P = Project(sys.argv[1])
    S = P.json("script.json")
    gaps = S.get("gaps", {})
    SENT_GAP, WORD_GAP = gaps.get("sentence", 0.14), gaps.get("word", 0.08)
    SPECIAL = {(a, b): c for a, b, c in S.get("special", [])}
    LEAD, LEVEL = S.get("lead", 0.10), S.get("level", -15.5)
    track, lines, t = [np.zeros(int(LEAD * SR), np.float32)], [], LEAD
    for L in S["lines"]:
        tk = L.get("take")
        if not tk: die(f"line {L['id']} has no take yet (record it with tools/tts.py, then fill script.json take)")
        gap = tk.get("gap", 0.05)
        if gap > 0 and lines: track.append(np.zeros(int(gap * SR), np.float32)); t += gap
        y, words, chars = build_line(P, L["id"], tk["audio"], tk.get("align") or tk["audio"] + ".align.json", tk.get("tempo", 1.0), SENT_GAP, WORD_GAP, SPECIAL)
        win = int(0.1 * SR); rm = [rms_db(y[i:i + win]) for i in range(0, len(y) - win, win)]
        voiced = [r for r in rm if r > max(rm) - 25]
        y = y * (10 ** ((LEVEL - float(np.median(voiced))) / 20))
        for w in words + chars: w["start"] = round(w["start"] + t, 3); w["end"] = round(w["end"] + t, 3)
        lines.append({"id": L["id"], "speaker": L["speaker"], "start": round(t, 3), "end": round(t + len(y) / SR, 3), "words": words, "chars": chars})
        track.append(y.astype(np.float32)); t += len(y) / SR
    v = np.concatenate(track); pk = np.max(np.abs(v))
    if pk > 0.97: v *= 0.97 / pk
    write_audio(P.o("voice.wav"), v)
    json.dump({"sr": SR, "duration": round(len(v) / SR, 3), "lines": lines}, open(os.path.join(P.tl, "voice.json"), "w"), indent=1)
    nw = sum(len(l["words"]) for l in lines)
    print(f"voice {len(v) / SR:.2f}s, {nw} words, {nw / (lines[-1]['end'] - lines[0]['start']) * 60:.0f} wpm overall")
    for l in lines:
        print(f"  {l['id']:3} {l['speaker']:8} {l['start']:6.2f}-{l['end']:6.2f}  " + " ".join(f"{w['text']}@{w['start']:.2f}" for w in l["words"]))


if __name__ == "__main__":
    main()
