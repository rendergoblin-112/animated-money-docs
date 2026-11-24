#!/usr/bin/env python3
"""stillcheck.py : compare stills numerically (numpy + ffmpeg only).

  stillcheck.py diff <a.png> <b.png> [...pairs]
      PSNR (dB), mean absolute difference (0-255) and the share of pixels that differ by more than 24 levels,
      for each pair. Identical renders give PSNR "inf"; a render against a frame pulled from an h264 mp4 typically
      gives 38-48 dB (compression only). Under ~30 dB something on screen really changed.
  stillcheck.py stats <png>...
      The grade numbers the style study measured on picture frames: median luma, black point (1st pct),
      white point (99th pct), HSV saturation, warmth (R - B) and corner/centre brightness. Measured at 384x216.
  stillcheck.py frames <video.mp4> <outdir> <frame> [<frame>...]
      Pull exact frames (by index at the video's own rate) to <outdir>/f<NNNN>.png for side-by-side checks.
"""
import os, subprocess, sys
import numpy as np

FF = os.environ.get("FFMPEG", "ffmpeg")


def load(path, w=None, h=None):
    vf = ["-vf", f"scale={w}:{h}:flags=area"] if w else []
    cmd = [FF, "-v", "error", "-i", path, *vf, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    if not w:
        probe = subprocess.run([FF, "-hide_banner", "-i", path], capture_output=True, text=True).stderr
        import re
        m = re.search(r", (\d{2,5})x(\d{2,5})", probe)
        w, h = int(m.group(1)), int(m.group(2))
    return np.frombuffer(raw, np.uint8).reshape(h, w, 3).astype(np.float64)


def diff(a, b):
    A, B = load(a), None
    B = load(b, A.shape[1], A.shape[0])
    mse = np.mean((A - B) ** 2)
    psnr = float("inf") if mse == 0 else 10 * np.log10(255 ** 2 / mse)
    mad = np.mean(np.abs(A - B))
    big = np.mean(np.max(np.abs(A - B), axis=2) > 24) * 100
    return psnr, mad, big


def stats(p):
    X = load(p, 384, 216)
    r, g, b = X[..., 0], X[..., 1], X[..., 2]
    l = np.round(0.299 * r + 0.587 * g + 0.114 * b)
    mx, mn = X.max(axis=2), X.min(axis=2)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1) * 255, 0)
    yy, xx = np.mgrid[0:216, 0:384]
    corner = ((xx < 77) | (xx > 307)) & ((yy < 43) | (yy > 173))
    centre = (xx > 115) & (xx < 269) & (yy > 65) & (yy < 151)
    return dict(med=np.percentile(l, 50), p1=np.percentile(l, 1), p99=np.percentile(l, 99), sat=sat.mean(),
                warm=(r - b).mean(), cc=l[corner].mean() / max(1e-6, l[centre].mean()))


def main():
    a = sys.argv[1:]
    if not a:
        print(__doc__); return
    if a[0] == "diff":
        pairs = list(zip(a[1::2], a[2::2]))
        for x, y in pairs:
            p, m, big = diff(x, y)
            verdict = "same" if p == float("inf") else ("compression only" if p >= 36 else ("small change" if p >= 30 else "DIFFERENT"))
            print(f"{os.path.basename(x):30} vs {os.path.basename(y):30} PSNR {p:6.2f} dB  mean |d| {m:5.2f}  >24 levels {big:5.2f}%  {verdict}")
    elif a[0] == "stats":
        for p in a[1:]:
            s = stats(p)
            print(f"{os.path.basename(p):34} median {s['med']:3.0f}  black(p1) {s['p1']:3.0f}  white(p99) {s['p99']:3.0f}  sat {s['sat']:3.0f}  R-B {s['warm']:4.0f}  corner/centre {s['cc']:.2f}")
    elif a[0] == "frames":
        src, out, frames = a[1], a[2], [int(f) for f in a[3:]]
        os.makedirs(out, exist_ok=True)
        sel = "+".join(f"eq(n\\,{f})" for f in frames)
        tmp = os.path.join(out, "_sel_%04d.png")
        subprocess.run([FF, "-v", "error", "-y", "-i", src, "-vf", f"select='{sel}'", "-fps_mode", "passthrough", tmp], check=True)
        for i, f in enumerate(sorted(frames)):
            os.replace(os.path.join(out, f"_sel_{i + 1:04d}.png"), os.path.join(out, f"f{f:04d}.png"))
            print("frame", f, "->", os.path.join(out, f"f{f:04d}.png"))
    else:
        print(__doc__)


if __name__ == "__main__":
    main()
