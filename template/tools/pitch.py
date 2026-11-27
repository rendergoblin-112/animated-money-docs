#!/usr/bin/env python3
"""pitch.py <audio>... [--range LO HI] [--ref HZ] : median voiced pitch (librosa pyin), IQR and pitch movement for each file.
  --range LO HI   search range in Hz (default 65 400). Use 150 500 for high voices: a low floor locks onto vocal fry.
  --ref HZ        also print each file's ratio to a reference pitch (the narrator's median), for the 1.6-1.9x / 0.65-0.86x guides.
  spread          semitones between the 10th and 90th percentile: how much the voice moves. Use it to compare auditions
                  (round 3 picked Roger, 5.0 st, over Eric 4.7 and Liam 4.0); a flat read is under ~3.5.
This only MEASURES. The skill has no pitch-shifting tool on purpose: shifted or stretched takes sound processed. Pick the
take that sounds most natural; the bands are a guide for spotting an odd take, never a reason to process one.
pitch.py --previews <voices_list.json> <Name1,Name2> [outdir] : download those voices' free preview mp3s and measure them."""
import json, os, sys, urllib.request
import numpy as np, librosa
from common import ssl_context


def f0(path, lo=65, hi=400):
    y, sr = librosa.load(path, sr=16000, mono=True)
    f, v, _ = librosa.pyin(y, fmin=lo, fmax=hi, sr=sr, frame_length=1024)
    f = f[v & ~np.isnan(f)]
    if len(f) == 0: return None
    return float(np.median(f)), float(np.percentile(f, 25)), float(np.percentile(f, 75)), len(y) / sr, float(12 * np.log2(np.percentile(f, 90) / np.percentile(f, 10)))


def main():
    a = sys.argv[1:]
    if not a: print(__doc__); return
    lo, hi, ref = 65, 400, None
    if "--range" in a: i = a.index("--range"); lo, hi = float(a[i + 1]), float(a[i + 2]); del a[i:i + 3]
    if "--ref" in a: i = a.index("--ref"); ref = float(a[i + 1]); del a[i:i + 2]
    if a[0] == "--previews":
        vs = json.load(open(a[1])); want = a[2].split(","); out = a[3] if len(a) > 3 else "previews"
        os.makedirs(out, exist_ok=True)
        for v in vs:
            nm = v["name"].split(" ")[0]
            if nm in want and v.get("preview"):
                p = os.path.join(out, nm + ".mp3")
                if not os.path.exists(p): open(p, "wb").write(urllib.request.urlopen(v["preview"], timeout=60, context=ssl_context()).read())
                r = f0(p, lo, hi)
                print(f"{nm:10} {v['id']}  median {r[0]:6.1f} Hz  IQR {r[1]:.0f}-{r[2]:.0f}  spread {r[4]:.1f} st" if r else f"{nm}: no voiced frames")
        return
    for p in a:
        r = f0(p, lo, hi)
        if not r: print(f"{p}: no voiced frames"); continue
        extra = f"  = {r[0] / ref:.2f}x ref" if ref else ""
        print(f"{os.path.basename(p):32} median {r[0]:6.1f} Hz  IQR {r[1]:.0f}-{r[2]:.0f}  spread {r[4]:.1f} st  len {r[3]:.2f}s{extra}")


if __name__ == "__main__":
    main()
