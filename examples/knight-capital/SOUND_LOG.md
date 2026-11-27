# Sound log: Knight Capital example (round 3)

This example uses only the shipped library: the ElevenLabs effects and bed in `template/sfx` and `template/music` (prompts in `template/sfx/PROMPTS.md`) and the synthesized utility sounds in `template/sfx/basic`. No sounds were generated for it in this repo. Every placement is in `sound.json`; the rendered placements are written to `out/sfx_placements.json`.

**Round 3: fewer effects.** 32 placements in 41.9 s (about 46 a minute, the reference maker's own rate), down from v2's 79 (23 of them e-mail pings). Kept: one effect per beat, four quickening pings on the inbox. Cut: the second snore, the glitch on top of the power-up, clock ticks under the bell, a pop per title word, the swipe on the cut to Gus, paper flutter, keyboard chatter, the second spark burst.

**The bed under natural pauses.** The bed sits at −34 dB under speech (v2: −37). Its built-in stop at 17.9–19.2 s (−55 to −73 dB), which would have left a natural pause silent, is patched with the same stretch four bars earlier (`"patch": [17.85, 19.2, 9.6]`), and its quiet bars are levelled (`"level"`, at most +8 dB). No room tone is needed (`"roomTone": null`). Loudness: −14 LUFS target, limiter 0.70.

Measured on this repo's render (`audiocheck.py`): speech −14.2 dBFS (the band from the reference opens is −15.2 to −15.9; with fewer effects the voice carries more of the master), floor −30.1 dBFS, 0 windows under −45 dB, title impact −12.1 dB, chapter-card floor −48.5 dB, −14.3 LUFS, −2.7 dBTP.

Difference from the original approved mix: the original used 12 utility sounds (whooshes, impact, typing, click, riser, thump, pop…) from a private library that can't be redistributed. Here they are synthesized stand-ins matched to the originals' length and loudness, so the balance is the same but they don't sound identical. The mastering chain also differs slightly (one linear gain + an oversampled limiter instead of loudnorm + limiter). The picture is identical; the sound is close, not identical.
