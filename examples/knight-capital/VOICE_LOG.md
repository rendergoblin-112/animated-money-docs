# Voice log: Knight Capital example (round 3)

The 7 takes in `vo/` are the final takes of the approved round-3 cold open, exactly as ElevenLabs returned them: **no time-stretch and no pitch shifting**. All premade voices, model `eleven_v4`, `/with-timestamps` (character timings in `*.align.json`). The example renders from these files with no API key.

| Line | File | Voice | Settings | Request id | Pitch (untouched) | Notes |
|---|---|---|---|---|---|---|
| NA | vo/NA_roger_2.mp3 | Roger, untagged | stab 0.45, seed 902 | yXF7ltxhRitJ0PEUUEhf | 124.8 Hz | 6.16 s, as read |
| NB | vo/NB_roger.mp3 | Roger, untagged | stab 0.45, seed 903, stitched to NA | 9NBQg9nJIFbzLVbtpsZp | 117.8 Hz | sentence pauses 0.56 / 0.68 / 0.56 s, commas 0.32 / 0.28 s, as read |
| S1 | vo/S1_jessica.mp3 | Jessica | stab 0.5, seed 401 | qK2zXxszGmwt2wT4H6cA | 233.3 Hz = 1.93× | a v2 take, never processed; just over the 1.6–1.9× guide, kept because it sounds natural |
| S2 | vo/S2_brian.mp3 | Brian, `[deadpan]` | stab 0.6, seed 906, previous_text = S1 | LsgR3bNdXAjJciQGsdvA | 100.8 Hz = 0.84× | new natural take (v2's was pitch-shifted) |
| S3 | vo/S3_jessica_t3.mp3 | Jessica | stab 0.95, seed 405 | 56F6phRVA5mNilVcipmf | 214.6 Hz = 1.78× | a v2 take, never processed |
| ND | vo/ND_roger.mp3 | Roger, untagged | stab 0.45, seed 904, stitched to NA, NB | Epv0giLxQCNzSeuRkzq7 | 113.2 Hz | sentence pauses 0.56 / 0.48 s |
| NC | vo/NC_roger.mp3 | Roger, untagged | stab 0.45, seed 905, stitched to NA, NB, ND | i0yIJkh6S98ZJjw76E3p | 161 Hz (a rising question) | 3.0 s |

Narrator over the assembled open: 120.6 Hz median.

**Picking the narrator.** Three one-line auditions on the hook, untagged, same seed: Liam (122.7 Hz, pitch spread 4.0 semitones), Eric (157.3 Hz, 4.7 st), Roger (125.6 Hz, 5.0 st, the liveliest; "laid-back, casual" in ElevenLabs' description). All read about 134–146 wpm, so speed didn't decide it. Roger was chosen. Round 3 used 8 calls (3 auditions, 4 narrator lines, 1 Gus line); Dot's two lines reuse v2's unprocessed takes.

**Assembly** (`voice_build.py`, `"mode": "asRead"`): every take used as read (nothing over 0.70 s to trim, no sentence pause under 0.35 s to pad); each line starts 0.12 s before its first aligned letter; heard pauses between lines 0.45 (NA→NB), 0.42 / 0.38 / 0.40 (skit), 0.45 (→ND), 0.50 (→NC). Result: 37.57 s of voice, 82 words, 130 wpm first word to last; the skit starts at 21.13 s. On the finished mix (by STT in the original build): sentence gaps median 0.56 s, commas 0.28–0.30 s, and the whole mix transcribes word for word.

**Checks.** Every take was transcribed and compared word for word. The only flags were transcript formatting ("8:01" for "eight-oh-one"), not mishearings.
