#!/usr/bin/env python3
"""audiocheck.py <project> [<mix.wav|video.mp4>] : the sound numbers (references/09-sound-and-music.md) on your own mix,
in 100 ms RMS windows as the study measured them. Defaults to <project>/out/mix.wav. Lines marked "!!" are outside the band."""
import subprocess, sys
import numpy as np
from common import Project, FF, SR, load_audio, die


def mark(v, lo, hi): return f"{v:6.1f}" + ("" if lo <= v <= hi else "  !!")


def main():
    if len(sys.argv) < 2: die(__doc__)
    P = Project(sys.argv[1])
    src = sys.argv[2] if len(sys.argv) > 2 else P.o("mix.wav")
    x = load_audio(src)
    V, S = P.voice(), P.shots()["shots"]
    win = SR // 10
    db = np.array([10 * np.log10(np.mean(x[i:i + win] ** 2) + 1e-12) for i in range(0, len(x) - win, win)])
    t = np.arange(len(db)) / 10
    speech = np.zeros(len(db), bool)
    for l in V["lines"]:
        for w in l["words"]: speech[(t >= w["start"]) & (t < w["end"])] = True
    chap = [s for s in S if s["type"] == "chapter"]
    ch = chap[0]["start"] if chap else S[-1]["end"]
    pre = t < ch
    print(f"speech median RMS          {mark(np.median(db[speech]), -15.9, -15.2)} dBFS   (-15.2..-15.9)")
    print(f"floor (5th pct, open)      {mark(np.percentile(db[pre], 5), -32.4, -27.0)} dBFS   (-28.6..-32.4 measured; bed 13-17 dB under speech)")
    print(f"gap speech-floor           {np.median(db[speech]) - np.percentile(db[pre], 5):6.1f} dB")
    lows = int(np.sum(db[pre] < -45))
    print(f"windows < -45 dB before chapter card: {lows}/{int(np.sum(pre))}" + ("" if lows == 0 else "  !!") + "   (0)")
    print(f"peak (95th pct)            {mark(np.percentile(db[pre], 95), -10.8, -10.0)} dBFS   (-10.0..-10.8)")
    last_word = max(w["end"] for l in V["lines"] for w in l["words"])
    tw = (t >= last_word) & (t < ch)
    if tw.any():
        k = int(np.argmax(np.where(tw, db, -99)))
        print(f"title-card impact peak     {mark(db[k], -15.4, -8.0)} dB at {t[k]:.1f}s; 1.25 s later {db[min(len(db) - 1, k + 12)]:6.1f} dB   (peak -11.5..-15.4 or louder, decays to -26..-30)")
    print(f"speech stops {ch - last_word:.2f} s before the chapter card   (1.1..3.8)")
    cw = t >= ch + 0.4
    if cw.any(): print(f"chapter-card floor         {mark(np.median(db[cw]), -57, -27)} dB   (-27..-57)")
    r = subprocess.run([FF, "-hide_banner", "-i", src, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
    I = [l for l in r.splitlines() if l.strip().startswith("I:")][-1].strip(); Pk = [l for l in r.splitlines() if "Peak:" in l][-1].strip()
    print(f"integrated loudness {I}, true peak {Pk}   (about -14 LUFS, under 0 dBTP)")


if __name__ == "__main__":
    main()
