#!/usr/bin/env python3
"""psola.py <in> <out.wav> <semitones> [yin LO HI] : TD-PSOLA pitch shift that keeps duration and formants (numpy + librosa).

For SMALL corrections (about +-2.5 semitones) so a voice sits inside its pitch band. Duration is unchanged, so the take's
ElevenLabs alignment file stays valid: point script.json take.audio at the corrected wav and keep take.align on the original.
Optional "yin LO HI": use yin limited to the speaker's own range instead of pyin (breathy high voices that pyin calls unvoiced).
When NOT to use it: shifts over ~3 semitones, lines that already sound rough, or any result whose pyin shows stray frames far
below the voice (e.g. 73 Hz in a 210 Hz voice): those are artifacts. Retake with different settings instead.
Always re-listen and re-measure (pitch.py) after a correction."""
import os, subprocess, sys
import numpy as np, librosa

FF = os.environ.get("FFMPEG", "ffmpeg")
SR = 48000


def load(p):
    return np.frombuffer(subprocess.run([FF, "-v", "error", "-i", p, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True).stdout, np.float32).astype(np.float64)


def psola(x, factor):
    y16 = librosa.resample(x, orig_sr=SR, target_sr=16000)
    hop16 = 80
    if MODE == "yin":
        # breathy high voices: pyin flags much of them unvoiced. yin limited to the speaker's own range cannot jump octaves.
        f0 = librosa.yin(y16, fmin=FMIN, fmax=FMAX, sr=16000, frame_length=1024, hop_length=hop16)
        rms = librosa.feature.rms(y=y16, frame_length=1024, hop_length=hop16)[0]
        n_ = min(len(f0), len(rms)); f0 = f0[:n_]; vf = rms[:n_] > np.max(rms) * 0.06
    else:
        f0, vf, _ = librosa.pyin(y16, fmin=FMIN, fmax=FMAX, sr=16000, frame_length=1024, hop_length=hop16)

    def f0_at(n):
        i = min(len(f0) - 1, int(n / SR * 16000 / hop16))
        return f0[i] if vf[i] and not np.isnan(f0[i]) else None
    # analysis pitch marks: in voiced regions one mark per period on the local waveform peak; unvoiced every 5 ms
    lp = librosa.effects.preemphasis(x, coef=-0.9)  # gentle low-pass emphasis for peak picking
    marks, periods, voiced = [], [], []
    n = int(0.005 * SR)
    while n < len(x) - 1:
        f = f0_at(n)
        if f:
            P = int(SR / f)
            lo, hi = max(0, n - P // 4), min(len(x), n + P // 4)
            n = lo + int(np.argmax(lp[lo:hi])) if hi > lo else n
            marks.append(n); periods.append(P); voiced.append(True); n += P
        else:
            P = int(0.005 * SR); marks.append(n); periods.append(P); voiced.append(False); n += P
    marks = np.array(marks); periods = np.array(periods); voiced = np.array(voiced)
    out = np.zeros(len(x) + SR); wsum = np.zeros(len(x) + SR)
    s = marks[0]
    while s < len(x):
        i = int(np.argmin(np.abs(marks - s)))
        P = periods[i]; m = marks[i]
        L = 2 * P
        a0, a1 = m - P, m + P
        if a0 < 0 or a1 > len(x): s += P; continue
        w = np.hanning(L)
        g = x[a0:a1] * w
        o0 = int(s - P)
        if o0 >= 0:
            out[o0:o0 + L] += g; wsum[o0:o0 + L] += w
        s += P / factor if voiced[i] else P
    wsum[wsum < 1e-3] = 1.0
    y = (out / wsum)[:len(x)]
    # keep the loudness the same
    y *= np.sqrt(np.mean(x ** 2) / (np.mean(y ** 2) + 1e-12))
    return y.astype(np.float32)


MODE, FMIN, FMAX = "pyin", 60, 500
if __name__ == "__main__":
    if len(sys.argv) < 4: print(__doc__); sys.exit(1)
    src, dst, st = sys.argv[1], sys.argv[2], float(sys.argv[3])
    if abs(st) > 3: print(f"warning: {st:+.1f} semitones is a big shift for PSOLA; expect artifacts. Prefer a retake.")
    if len(sys.argv) > 4: MODE = sys.argv[4]; FMIN = float(sys.argv[5]); FMAX = float(sys.argv[6])
    x = load(src)
    y = psola(x, 2 ** (st / 12))
    subprocess.run([FF, "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-c:a", "pcm_s24le", dst], input=y.tobytes(), check=True)
    print(f"{os.path.basename(src)} -> {dst} ({st:+.2f} st)")
