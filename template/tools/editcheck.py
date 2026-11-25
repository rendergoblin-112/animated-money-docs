#!/usr/bin/env python3
"""editcheck.py <project> : the format numbers (references/01-format-and-beat-map.md) measured on your own shot list and voice.
Run after `render.mjs <project> info`. Prints each number next to the measured band; lines marked "!!" are outside it."""
import sys
import numpy as np
from common import Project, load_cast, die


def band(v, lo, hi, fmt="{:.2f}"):
    return (fmt.format(v)) + ("" if lo <= v <= hi else "  !!")


def main():
    if len(sys.argv) < 2: die(__doc__)
    P = Project(sys.argv[1])
    V, SJ = P.voice(), P.shots()
    S = SJ["shots"]
    cast = load_cast(P)
    narr = {k for k, v in cast.items() if v.get("offscreen")} or {"narrator"}
    dur = S[-1]["end"]
    cuts = [s["start"] for s in S[1:]]
    lens = [s["end"] - s["start"] for s in S]
    pics = [s for s in S if s["type"] == "pic"]
    cards = [s for s in S if s["type"] == "card"]
    starts = []
    for l in V["lines"]:
        ws = l["words"]; starts.append(ws[0]["start"])
        for a, b in zip(ws, ws[1:]):
            if a["text"].rstrip()[-1:] in ".?!,": starts.append(b["start"])
    near = [c for c in cuts if min(abs(c - t) for t in starts) <= 0.3]
    moving = [s for s in pics if s["move"] and (s["move"].get("push") or s["move"].get("pan"))]
    push = [s for s in pics if s["move"] and s["move"].get("push")]
    pan = [s for s in pics if s["move"] and s["move"].get("pan")]
    chap = [s for s in S if s["type"] == "chapter"]
    print(f"duration {dur:.2f} s, {len(S)} segments ({len(pics)} picture shots, {len(cards)} typing cards, {len(chap)} chapter card)   (30-40 s open)")
    print(f"cuts {len(cuts)} -> {band(len(cuts) / dur * 60, 21.1, 29.3, '{:.1f}')}/min raw, x0.85 = {len(cuts) / dur * 60 * 0.85:.1f}   (raw 21.1-29.3, x0.85 18-25)")
    print(f"first cut {band(cuts[0], 1.0, 2.4)} s   (1.0-2.4)")
    print(f"median shot {band(float(np.median(lens)), 1.7, 2.0)} s, 10-90th pct {np.percentile(lens, 10):.2f}-{np.percentile(lens, 90):.2f}, longest {band(max(lens), 0, 5.2)}   (median 1.7-2.0, nothing over 5.2)")
    print(f"cuts within 0.3 s of a line/sentence start: {len(near)}/{len(cuts)} = {band(len(near) / len(cuts) * 100, 64, 85, '{:.0f}')}%   (64-85%)")
    if pics:
        print(f"picture shots that move: {len(moving)}/{len(pics)} = {band(len(moving) / len(pics) * 100, 83, 91, '{:.0f}')}%   (83-91%)")
        print(f"push-ins {len(push) / len(pics) * 100:.0f}%, pans {len(pan) / len(pics) * 100:.0f}%, static {(len(pics) - len(moving)) / len(pics) * 100:.0f}%   (push 43-61%, pan 19-35%, static 9-17%)")
        print(f"push speeds %/s: {sorted(round(s['move']['push'] * 100, 1) for s in push)}   (median 3.4-6.2; faster only for a deliberate beat)")
    if cards:
        print(f"typing cards {len(cards)} -> {band(len(cards) / dur * 60, 3.2, 5.0, '{:.1f}')}/min   (3.2-5.0/min)")
        print(f"first text card at {band(cards[0]['start'], 0, 8.0)} s   (by 8 s)")
    sk = [l for l in V["lines"] if l["speaker"] not in narr]
    if sk:
        a, b = sk[0]["start"], sk[-1]["end"]
        print(f"skit {band(a, 19, 29)}-{b:.2f} s ({band(b - a, 3, 6, '{:.1f}')} s, {len(sk)} lines)   (lands at 19-29 s, 3-6 s, 2-5 lines)")
        nxt = [l for l in V["lines"] if l["start"] >= b]
        if nxt:
            back = nxt[0]["words"][0]["start"] - sk[-1]["words"][-1]["end"] if nxt[0].get("words") and sk[-1].get("words") else nxt[0]["start"] - b
            print(f"narrator back {back:.2f} s after the punchline (heard)" + ("  !!" if back > 0.5 else "") + "   (0.3-0.5: a normal hand-off, 08)")
    else:
        print("skit: none  !!  (every measured open has one)")
    q = [l for l in V["lines"] if l["speaker"] in narr and l["words"] and l["words"][0]["text"].strip('"').lower().startswith("so")]
    if q:
        f = q[-1]["start"] / (chap[0]["start"] if chap else dur)
        print(f"title question \"{' '.join(w['text'] for w in q[-1]['words'])[:60]}\" starts at {q[-1]['start']:.2f} s = {band(f * 100, 65, 100, '{:.0f}')}% of the open   (last 35%, or by 25 s in a short open)")
    else:
        print("title question: no narrator line starting with \"So\"  !!")
    hook = V["lines"][0]
    print(f"hook line ends {band(hook['end'], 3, 10)} s   (3-10)")
    if chap: print(f"chapter card {chap[0]['start']:.2f}-{chap[0]['end']:.2f} s ({band(chap[0]['end'] - chap[0]['start'], 1.9, 2.2)} s)   (1.9-2.2)")
    wds = sum(len(l["words"]) for l in V["lines"]); span = V["lines"][-1]["end"] - V["lines"][0]["start"]
    print(f"words/min {band(wds / span * 60, 148, 179, '{:.0f}')}   (148-179)")


if __name__ == "__main__":
    main()
