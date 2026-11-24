#!/usr/bin/env python3
"""visemes.py <project> : per-frame mouth shapes for every on-screen speaker (cast members with "talks": true),
from the ElevenLabs character timestamps plus the real audio.

Spelling -> sound rules (digraphs th/sh/ch/ph/ee/ea/oo/ou/ow/ai/ay/igh, silent final e, m/b/p closures, f/v teeth on lip)
give the shape for each character's time slot; the voice track's own loudness closes the mouth wherever the sound drops.
Shapes: X closed, A small open (most consonants, 'uh'), E wide/teeth (ee, eh, s), D open (ah), O round (oo, oh, w), F (f, v).
The mouth leads the sound by about one frame. Writes out/timeline/visemes.json: {speaker: {"f0": first frame, "shapes": [...]}}.
Numbers must already be spelled out in the line text sent to TTS ("ninety-seven", not "97")."""
import json, os, sys
from collections import Counter
import numpy as np
from common import Project, SR, load_audio, load_cast, die

FPS = 30
DIG = {"th": "A", "sh": "E", "ch": "E", "ph": "F", "ee": "E", "ea": "E", "oo": "O", "ou": "O", "ow": "O", "oi": "O", "ai": "E", "ay": "E", "qu": "O", "wh": "O", "ng": "A", "ck": "A"}
SINGLE = {**{c: "D" for c in "a"}, "e": "E", "i": "E", "y": "E", "o": "O", "u": "A", "w": "O", "m": "X", "b": "X", "p": "X", "f": "F", "v": "F", "r": "O"}


def word_tokens(chars):
    """chars: [(c, start, end)] of one word -> [(shape, start, end)]"""
    s = "".join(c for c, _, _ in chars).lower()
    out, i = [], 0
    while i < len(chars):
        c = s[i]
        if not c.isalpha(): i += 1; continue
        if s[i:i + 3] == "igh": out.append(("D", chars[i][1], chars[i + 2][2])); i += 3; continue
        dg = s[i:i + 2]
        if dg in DIG and i + 1 < len(chars): out.append((DIG[dg], chars[i][1], chars[i + 1][2])); i += 2; continue
        if c == "e" and i == len(s.rstrip(".,?!\"'")) - 1 and i > 1: i += 1; continue  # silent final e
        out.append((SINGLE.get(c, "A"), chars[i][1], chars[i][2])); i += 1
    return out


def main():
    if len(sys.argv) < 2: die(__doc__)
    P = Project(sys.argv[1])
    V = P.voice()
    cast = load_cast(P)
    x = load_audio(P.o("voice.wav"))
    res = {}
    talkers = [k for k, v in cast.items() if v.get("talks")]
    for spk in talkers:
        lines = [l for l in V["lines"] if l["speaker"] == spk]
        if not lines: continue
        f0, f1 = int(lines[0]["start"] * FPS), int(lines[-1]["end"] * FPS) + 2
        shapes = ["X"] * (f1 - f0)
        for l in lines:
            # tokens from characters, word by word
            cs = l["chars"]; words, cur = [], []
            for k, ch in enumerate(cs):
                cur.append((ch["c"], ch["start"], ch["end"]))
                nxt = cs[k + 1] if k + 1 < len(cs) else None
                if not nxt or nxt["start"] - ch["end"] > 0.06 or not ch["c"].isalnum() and ch["c"] not in "-'":
                    words.append(cur); cur = []
            toks = [t for w in words for t in word_tokens(w)]
            # loudness per frame for this line (gates the mouth shut in silences)
            a, b = int(l["start"] * SR), int(l["end"] * SR)
            seg = x[a:b]; hop = SR // FPS
            env = np.array([np.sqrt(np.mean(seg[i:i + hop] ** 2) + 1e-12) for i in range(0, len(seg), hop)])
            thr = np.max(env) * 10 ** (-28 / 20)
            for f in range(int(l["start"] * FPS), int(l["end"] * FPS) + 1):
                t = f / FPS + 0.033  # mouth leads the sound by about a frame
                k = f - int(l["start"] * FPS)
                loud = env[min(len(env) - 1, max(0, k))] > thr
                sh = "X"
                for s_, ta, tb in toks:
                    if ta - 0.02 <= t <= tb + 0.03: sh = s_; break
                if not loud and sh not in ("X",): sh = "X"
                if loud and sh == "X" and not any(ta - 0.02 <= t <= tb + 0.03 for s_, ta, tb in toks if s_ == "X"): sh = "A"
                if 0 <= f - f0 < len(shapes): shapes[f - f0] = sh
        # hold every shape at least 2 frames (closures included), smoothing single-frame flicker
        for i in range(1, len(shapes) - 1):
            if shapes[i] != shapes[i - 1] and shapes[i] != shapes[i + 1]: shapes[i] = shapes[i - 1] if shapes[i] != "X" else shapes[i]
        res[spk] = {"f0": f0, "shapes": shapes}
        print(spk, f"frames {f0}-{f1}", dict(Counter(shapes)), "".join(shapes)[:120])
    json.dump(res, open(os.path.join(P.tl, "visemes.json"), "w"))
    if not res: print("no on-screen speakers have lines (narration only): visemes.json is empty")


if __name__ == "__main__":
    main()
