#!/usr/bin/env python3
"""voice_build.py <project> : assemble the voice track from the chosen takes (script.json "take" on every line).

For each take: trim to the speech, set the pauses (see below), optionally time-stretch with ffmpeg atempo (pitch kept), then
join the lines. Every character's time from the ElevenLabs alignment is carried through each step, so out/timeline/voice.json
holds words AND characters at their absolute times in the finished track (used for cuts, typing cards and lip sync). Each
line is level-matched to script.json "level" (default -15.5 dBFS RMS on its voiced part). Writes out/voice.wav and
out/timeline/voice.json.

Two pause modes, chosen by script.json "gaps":
- heard pauses (the default for new projects):
    "gaps": {"sentence": [0.35, 0.6], "comma": [0.15, 0.3], "word": 0.12, "speaker": [0.3, 0.5], "max": 0.85}
  A pause is measured as heard: one word's end to the next word's start. Inside a line, pauses longer than their band are
  shortened. A sentence pause shorter than its band is lengthened to the band's low end, except before a number (never put
  silence in front of a number). Comma pauses are only shortened, never lengthened (no silence added mid-sentence).
  Between lines the silence is chosen so the heard pause lands on take.pause (if given) or the middle of the band:
  "speaker" when the speaker changes, "sentence" when the same voice carries on. Nothing is longer than "max".
- legacy caps (the Knight example): "gaps": {"sentence": 0.14, "word": 0.08} caps every pause; lines join with take.gap.

Tempo: keep take.tempo at 1.0 (at most 1.03). Time-stretching makes the read sound rushed: cut words instead. In heard mode
the build prints each line's words per minute and every heard pause, and marks anything outside the bands with !!.

A take's "audio" may be a pitch-corrected copy (tools/psola.py keeps duration) while "align" stays the original call's
alignment file, because PSOLA does not move any sound in time. New projects shouldn't pitch-shift (references/08-voices.md)."""
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


NUMWORDS = set(("zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen "
                "eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety hundred thousand million billion "
                "trillion point half").split())


def is_number(word):
    w = word.strip(" ,.?!:;\"'").lower().lstrip("$£€¥")
    return bool(w) and (w[0].isdigit() or w.split("-")[0] in NUMWORDS)


def kind_of(word):
    t = word.rstrip("\"')]")
    if t.endswith("...") or t[-1:] in ".?!:…": return "sentence"
    if t[-1:] in ",;—": return "comma"
    return "word"


def build_line(P, lid, audio, align, tempo, SENT_GAP, WORD_GAP, SPECIAL, BANDS=None):
    for f in (audio, align):
        if not os.path.exists(P.p(f)): die(f"line {lid}: {P.p(f)} not found")
    x = load_audio(P.p(audio))
    W, C = chars_words(P.p(align))
    # where the line starts: the alignment's first letter can come after the sound starts (a soft "Th" in "They" was clipped
    # to "He" with 0.04 s), so heard mode keeps BANDS["head"] (0.12 s) before it; the legacy mode keeps its 0.04 s
    segs = []; cur = max(0.0, W[0]["start"] - (BANDS.get("head", 0.12) if BANDS else 0.04))
    for i, w in enumerate(W[:-1]):
        gap = W[i + 1]["start"] - w["end"]
        word = w["text"].strip(" ,.?!\"'").lower()
        if BANDS is None:  # legacy caps
            cap = SPECIAL.get((lid, word), SENT_GAP if w["text"].rstrip("\"'")[-1:] in ".?!," else WORD_GAP)
            if gap > cap:
                segs.append((cur, w["end"] + cap / 2)); cur = W[i + 1]["start"] - cap / 2
            continue
        k = kind_of(w["text"])
        lo, hi = BANDS[k] if k != "word" else (0.0, BANDS["word"])
        hi = min(SPECIAL.get((lid, word), hi), BANDS["max"])
        if gap > hi:  # shorten
            segs.append((cur, w["end"] + hi / 2)); cur = W[i + 1]["start"] - hi / 2
        elif k == "sentence" and gap < lo and not is_number(W[i + 1]["text"]):  # lengthen a sentence pause, never before a number
            mid = w["end"] + max(0.0, gap) / 2
            segs.append((cur, mid)); segs.append(("pad", lo - max(0.0, gap))); cur = mid
    segs.append((cur, min(len(x) / SR, W[-1]["end"] + 0.12)))

    def remap(t):
        out = 0.0
        for a, b in segs:
            if a == "pad": out += b; continue
            if t <= a: return out
            if t <= b: return out + (t - a)
            out += b - a
        return out
    y = np.concatenate([np.zeros(int(round(b * SR)), np.float32) if a == "pad" else fade(x[int(a * SR):int(b * SR)].copy()) for a, b in segs])
    y = atempo(y, tempo)
    rm = lambda t: round(remap(t) / tempo, 3)
    return y, [{"text": w["text"], "start": rm(w["start"]), "end": rm(w["end"])} for w in W], [{"c": c["c"], "start": rm(c["start"]), "end": rm(c["end"])} for c in C]


def rms_db(v): return 10 * np.log10(np.mean(v ** 2) + 1e-12)


def report(lines, B):
    nw = sum(len(l["words"]) for l in lines)
    span = lines[-1]["words"][-1]["end"] - lines[0]["words"][0]["start"]
    print(f"\nspeaking rate: {nw} words over {span:.2f} s (first word to last) = {nw / span * 60:.0f} wpm (aim 150-170)")
    print("per line (first word start to last word end):")
    for l in lines:
        d = l["words"][-1]["end"] - l["words"][0]["start"]
        print(f"  {l['id']:3} {len(l['words']):3} words {d:5.2f} s {len(l['words']) / d * 60 if d else 0:5.0f} wpm")
    print("heard pauses (word end -> next word start):")
    allw = [(l, w) for l in lines for w in l["words"]]
    for (l1, w1), (l2, w2) in zip(allw, allw[1:]):
        g = w2["start"] - w1["end"]
        if l1 is not l2:
            k = "speaker" if l1["speaker"] != l2["speaker"] else "sentence"
        else:
            k = kind_of(w1["text"])
            if k == "word":
                if g > B["word"] + 0.02: print(f"  !! word     {l1['id']}     '{w1['text']}' -> '{w2['text']}' {g:.2f} s inside a phrase")
                continue
        lo, hi = B[k]
        short = g < lo - 0.02
        bad = g > B["max"] or g > hi + 0.02 or (short and k != "comma" and not (k == "sentence" and is_number(w2["text"]) and l1 is l2))
        note = "  (short comma: left as read)" if short and k == "comma" else "  (before a number: not lengthened)" if short and not bad else ""
        print(f"  {'!!' if bad else '  '} {k:8} {l1['id']}{('->' + l2['id']) if l2 is not l1 else '    '} '{w1['text']}' -> '{w2['text']}' {g:.2f} s{note}")


def main():
    if len(sys.argv) < 2: die(__doc__)
    P = Project(sys.argv[1])
    S = P.json("script.json")
    gaps = S.get("gaps", {})
    BANDS = None
    if isinstance(gaps.get("sentence"), list):
        BANDS = {"sentence": [0.35, 0.6], "comma": [0.15, 0.3], "word": 0.12, "speaker": [0.3, 0.5], "max": 0.85, **gaps}
        SENT_GAP = WORD_GAP = None
    else:
        SENT_GAP, WORD_GAP = gaps.get("sentence", 0.14), gaps.get("word", 0.08)
    SPECIAL = {(a, b): c for a, b, c in S.get("special", [])}
    LEAD, LEVEL = S.get("lead", 0.10), S.get("level", -15.5)
    track, lines, t = [np.zeros(int(LEAD * SR), np.float32)], [], LEAD
    warn = []
    for L in S["lines"]:
        tk = L.get("take")
        if not tk: die(f"line {L['id']} has no take yet (record it with tools/tts.py, then fill script.json take)")
        tempo = tk.get("tempo", 1.0)
        if tempo > 1.03: warn.append(f"!! {L['id']}: tempo {tempo} > 1.03 -- time-stretching rushes the read; cut words instead")
        y, words, chars = build_line(P, L["id"], tk["audio"], tk.get("align") or tk["audio"] + ".align.json", tempo, SENT_GAP, WORD_GAP, SPECIAL, BANDS)
        if BANDS is None:
            gap = tk.get("gap", 0.05)
            if gap > 0 and lines: track.append(np.zeros(int(gap * SR), np.float32)); t += gap
        elif lines:
            prev = lines[-1]
            band = BANDS["speaker"] if prev["speaker"] != L["speaker"] else BANDS["sentence"]
            target = min(tk.get("pause", (band[0] + band[1]) / 2), BANDS["max"])
            tail = t - prev["words"][-1]["end"]  # audio left after the previous line's last word
            n = int(round(max(0.0, target - tail - words[0]["start"]) * SR))
            if n: track.append(np.zeros(n, np.float32)); t += n / SR
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
    if BANDS: report(lines, BANDS)
    for w_ in warn: print(w_)


if __name__ == "__main__":
    main()
