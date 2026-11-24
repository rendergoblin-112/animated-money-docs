#!/usr/bin/env python3
"""basic_sfx.py [outdir] : synthesize the small utility sounds every cold open uses (numpy only, deterministic, no samples).

whoosh, whoosh_big, swipe   filtered-noise sweeps for cuts and whip pans
impact, thump               low hits (title card, the first frame)
riser                       noise + tone sweep that peaks ~1.6 s in (lead into the title hit)
typing, keys, click         typewriter / keyboard chatter for the black typing cards, a single click
ticks                       clock ticks
pop                         a short blip for words landing on the title card or a gag
glitch                      digital stutter

They are written to template/sfx/basic/*.wav at the level the shipped mixes were balanced for (each has a target RMS over its
active part). Re-run it any time; the output is identical every run."""
import os, subprocess, sys
import numpy as np

SR = 48000
FF = os.environ.get("FFMPEG", "ffmpeg")
R = np.random.default_rng(7)


def onepole_lp(x, fc):
    """one-pole low-pass with a cutoff that may change per sample (fc: scalar or array, Hz)"""
    fc = np.broadcast_to(np.asarray(fc, float), x.shape)
    a = np.exp(-2 * np.pi * fc / SR)
    y = np.empty_like(x); s = 0.0
    for i in range(len(x)):
        s = (1 - a[i]) * x[i] + a[i] * s; y[i] = s
    return y


def hp(x, fc):
    return x - onepole_lp(x, fc)


def env(n, a, d, shape=2.0):
    """attack a (fraction), then decay to the end"""
    t = np.linspace(0, 1, n)
    e = np.where(t < a, t / max(a, 1e-6), 1 - (t - a) / max(1 - a, 1e-6))
    return np.clip(e, 0, 1) ** shape


def secs(s):
    return int(s * SR)


def soft_onset(x, ms=1.5):
    """a 1-2 ms attack ramp: real recordings never start at full amplitude, and instant onsets make AAC overshoot"""
    n = min(len(x), int(ms / 1000 * SR))
    x[:n] *= np.linspace(0, 1, n)
    return x


def noise(n):
    return R.standard_normal(n)


def whoosh(dur=0.8, peak=0.13, lo=300, hi=3500):
    n = secs(dur); t = np.linspace(0, 1, n)
    sweep = lo + (hi - lo) * np.sin(np.pi * np.clip(t / (peak / dur * 2), 0, 1)) ** 2
    x = onepole_lp(noise(n), sweep); x = hp(x, 150)
    return x * env(n, peak / dur, 1, 1.6)


def impact(dur=1.48):
    n = secs(dur); t = np.arange(n) / SR
    f = 38 + 60 * np.exp(-t * 9)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3.2)
    crack = onepole_lp(noise(n), 2500) * np.exp(-t * 28)
    tail = onepole_lp(noise(n), 400) * np.exp(-t * 4) * 0.35
    return body + 0.6 * crack + tail


def thump(dur=0.6):
    n = secs(dur); t = np.arange(n) / SR
    f = 50 + 40 * np.exp(-t * 25)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)


def riser(dur=2.0, top=1.62):
    n = secs(dur); t = np.arange(n) / SR
    up = np.clip(t / top, 0, 1)
    e = np.where(t < top, up ** 2.2, np.exp(-(t - top) * 14))
    f = 180 + 1100 * up ** 1.5
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.35
    nz = onepole_lp(noise(n), 400 + 6000 * up ** 2)
    return (nz + tone) * e


def clicks(dur, rate_lo, rate_hi, bright=3500, length=0.006, accent=0.25):
    n = secs(dur); x = np.zeros(n); t = 0.01
    while t < dur - 0.02:
        k = secs(t); m = secs(length * (0.8 + 0.4 * R.random()))
        burst = soft_onset(hp(onepole_lp(noise(m), bright), 600) * np.exp(-np.arange(m) / (m / 4)), 0.8)
        g = 0.6 + 0.4 * R.random() + (accent if R.random() < 0.12 else 0)
        x[k:k + m] += burst[:max(0, min(m, n - k))] * g
        t += R.uniform(rate_lo, rate_hi)
    return x


def click(dur=0.48):
    n = secs(dur); x = np.zeros(n); m = secs(0.012)
    x[secs(0.02):secs(0.02) + m] = soft_onset(hp(noise(m), 1500) * np.exp(-np.arange(m) / (m / 5)), 0.8)
    return x


def ticks(dur=1.0, rate=8):
    n = secs(dur); x = np.zeros(n); m = secs(0.01)
    for i in range(int(dur * rate)):
        k = secs(0.02 + i / rate)
        tk = soft_onset(np.sin(2 * np.pi * (2400 if i % 2 else 1900) * np.arange(m) / SR) * np.exp(-np.arange(m) / (m / 6)), 0.8)
        x[k:k + m] += tk[:max(0, min(m, n - k))]
    return x


def pop(dur=0.48):
    n = secs(dur); t = np.arange(n) / SR
    f = 320 + 500 * np.exp(-t * 60)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 30)


def glitch(dur=0.8):
    n = secs(dur); x = np.zeros(n); t = 0.0
    while t < dur - 0.03:
        m = secs(R.uniform(0.015, 0.06)); k = secs(t)
        f = R.choice([220, 330, 440, 880, 1320])
        seg = np.sign(np.sin(2 * np.pi * f * np.arange(m) / SR)) * (0.4 + 0.6 * R.random())
        if R.random() < 0.4: seg = np.round(noise(m) * 3) / 3
        x[k:k + m] = seg[:max(0, min(m, n - k))]
        t += m / SR + R.uniform(0, 0.03)
    return onepole_lp(x, 6000) * env(n, 0.05, 1, 0.6)


SOUNDS = {  # name: (generator, target active RMS dBFS)
    "whoosh": (lambda: whoosh(0.8, 0.13), -12.5),
    "whoosh_big": (lambda: whoosh(1.2, 0.55, 200, 2600), -9.2),
    "swipe": (lambda: whoosh(0.6, 0.07, 900, 6000), -11.8),
    "impact": (impact, -5.3),
    "thump": (thump, -21.8),
    "riser": (riser, -6.3),
    "typing": (lambda: clicks(3.0, 0.06, 0.14), -33.1),
    "keys": (lambda: clicks(1.48, 0.04, 0.09, bright=4500, length=0.005), -37.1),
    "click": (click, -25.9),
    "ticks": (ticks, -23.5),
    "pop": (pop, -15.6),
    "glitch": (glitch, -18.7),
}


def active_rms_db(x):
    win = 4800
    r = np.array([np.sqrt(np.mean(x[i:i + win] ** 2) + 1e-12) for i in range(0, max(1, len(x) - win), win)])
    act = r[r > r.max() * 0.1]
    return 20 * np.log10(np.sqrt(np.mean(act ** 2)))


def main():
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, "sfx", "basic")
    os.makedirs(out, exist_ok=True)
    for name, (gen, target) in SOUNDS.items():
        x = soft_onset(gen().astype(np.float64), 2.0)
        x *= 10 ** ((target - active_rms_db(x)) / 20)
        n = min(len(x), secs(0.004)); x[-n:] *= np.linspace(1, 0, n)
        p = os.path.join(out, name + ".wav")
        # 32-bit float WAV: the hot ones peak above full scale on purpose (the mix gains them down), and float keeps that intact
        subprocess.run([FF, "-v", "error", "-y", "-f", "f64le", "-ar", str(SR), "-ac", "1", "-i", "-", "-c:a", "pcm_f32le", p], input=x.tobytes(), check=True)
        print(f"{name:11} {len(x) / SR:4.2f}s  active RMS {active_rms_db(x):6.1f} dBFS (target {target})  -> {p}")


if __name__ == "__main__":
    main()
