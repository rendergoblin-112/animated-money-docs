# 8. Voices: picking by measured pitch, delivery tags, recording, assembly

The rules that make it sound like a person talking (set after an owner listen of the J-Com open, Nov 2026; see "Why" at the end):
- **No time-stretch.** `take.tempo` 1.0 (never above 1.03). To fit the open, cut words.
- **No pitch shifting.** If a take is outside the pitch band, re-roll the seed or change the delivery tag. A take slightly outside the band beats a shifted one.
- **Real pauses**, measured as heard (one word's end to the next word's start): 0.35–0.6 s after a sentence, 0.3–0.5 s between speakers, 0.15–0.3 s at a comma, never more than 0.85 s. No silence added in front of a number.
- **Stitch the narrator takes** (`tts.py --prev`, on by default) so the delivery carries from line to line.
- **Check every take with speech-to-text**: no mishearings.

## Targets (measured)

| Role | Target | Default cast (ElevenLabs premade, on every account) |
|---|---|---|
| Narrator | one male narrator, **125–136 Hz** median, conversational, **150–170 wpm with the pauses in** | **Will** `bIHbv24MWmeRgasZH58o` with `[curious]` → 129–135 Hz |
| High skit voice | **1.6–1.9×** the narrator (≈ 210–250 Hz) | **Jessica** `cgSgspJ2msm6clMCkdW9` → 230–250 Hz at stability 0.5 |
| Low skit voice | **0.65–0.86×** the narrator (≈ 85–112 Hz) | **Brian** `nPczCjzI2devNBz1zQrb` with `[deadpan]` → 88 Hz (0.66×) untouched |

The bands are in the cast (`voice.band` in Hz, `voice.bandRatio` × the narrator), and `tts.py` prints `in band` / `OUT of band` after each call.

Skit voices must also sound unlike the narrator (timbre): in the measured opens 16 of 18 skit lines sat far outside the narrator's own timbre spread. Different voice, not the narrator doing a voice.

## How to pick a voice by measured pitch

(Python tools run through `node template/tools/run.mjs <tool>.py`, which uses the skill's `.venv`/`pydeps`.)

1. `node template/tools/run.mjs voices.py voices.json --premade` lists your account's voices with preview URLs.
2. `node template/tools/run.mjs pitch.py --previews voices.json Will,Bill,Liam,Adam previews` downloads the free previews and measures each median (no TTS cost).
3. Previews are not your delivery. Generate the hook with the top 1–2 candidates (that's real TTS calls), then `pitch.py vo/NA_will_1.mp3` on each.
4. For high voices measure with `--range 150 500`: with the default 65 Hz floor, pyin locks onto vocal fry and reads far too low.
5. `pitch.py` prints the interquartile range too: a narrow, low range (Brian 81–100 Hz) is a real low read; a wide one reaching the floor is fry.

What we found on the default account (useful starting points):
- No American male premade sat naturally in 125–136 Hz: Bill 146, Liam 146, Adam 109, Will 116 (plain).
- `[curious]` on Will lifts him to ~130 Hz. Stitched takes can come out livelier: J-Com NB read 140 and 146 Hz on two seeds; `[quietly curious]` overshot down to 107 Hz (flat). The 140 Hz take was kept (3% over, a lively read, word-perfect) rather than shifted. `[excited]` jumps to 217 Hz (shouting): never use it on the narrator.
- `[curious, measured]` slows a question a little (J-Com title question 202 → 192 wpm by STT) and stays in band.
- Stability 0.4 for the narrator; 0.35 got flatter and lower (115 Hz).
- Jessica at stability 0.5: 230–250 Hz on short bright lines. Stability 0.95 read 259 Hz on "Oh. So just cancel it." (too high); 0.5 with a new seed gave 249 Hz.
- Brian reads ~120 Hz plain (0.9×, too high). `[deadpan] At one yen each.` at stability 0.6 gave 88 Hz, in band, on the first call.

## Delivery tags (eleven_v4)

Put the tag first in the line text: `"[curious] On August first, 2012, …"`. `voice_build.py` strips the tag's characters out of the timing, so it never reaches the typing cards or the lip sync. Use `[curious]` on every narrator line for consistent pitch. Test any other tag on one line before using it (`[excited]` shouts). Tags that ask for speed backfire; to slow a line, write fewer words or try `[measured]`.

## Recording a take

```bash
node template/tools/run.mjs tts.py <project> NA --seed 301 --env-file ~/path/.env
python3 <stt tool> vo/NA_will_1.mp3 vo/check/NA_will_1.stt.json      # any speech-to-text with word timings
```

- One call per script line, through `/with-timestamps` (character timings for cuts, cards and mouths).
- **Stitching** (`--prev auto`, the default): a narrator line is sent with `previous_request_ids` = the up to 3 earlier narrator lines' takes (the take in `script.json`, else the newest), if they're under 2 hours old and the same voice. So record the narrator lines in order, in one sitting, and set each line's `take` in `script.json` before recording the next. Older takes fall back to `previous_text`. Skit lines get the line before as `previous_text`. Give explicit line ids or request ids with `--prev NA,NB`.
- The key comes from `ELEVENLABS_API_KEY` in the environment, or `--env-file` (read only, never copied into the project).
- Every call is logged to `<project>/VOICE_LOG.md` with its request id and pitch, and counted against `project.json` → `"budget": {"tts": N}`.
- After a call `tts.py` prints the take's median pitch and whether it's in band. Out of band: change the seed; if two seeds miss the same way, change the delivery tag.
- **Check it by ear and by STT.** Run speech-to-text on every take you might keep and compare word for word with the script. STT writes numbers as digits ("8th", "610,000"); that isn't a mishearing.
- Mark the take you keep in `script.json` → `take` and in the log's "Used" column.

Budget habit: one take per line, plus 3–5 calls held back for re-rolls. J-Com's fix round used 9 calls for 6 lines (2 NB re-rolls, 1 NC retake).

## Pitch correction (`tools/psola.py`): don't, for new projects

`psola.py` (TD-PSOLA, duration kept) is still in the skill because the approved Knight Capital example shipped with three corrected lines. Shifted lines sound slightly processed, and the J-Com owner listen flagged them. Re-roll instead; accept a take a few percent outside the band.

## Assembly (`tools/voice_build.py`)

`script.json`:
```json
"gaps": { "sentence": [0.35, 0.6], "comma": [0.15, 0.3], "word": 0.12, "speaker": [0.3, 0.5], "max": 0.85 },
"take": { "audio": "vo/NA_will_2.mp3", "align": "vo/NA_will_2.align.json", "tempo": 1.0 }
```
- Pauses inside a line: longer than the band → shortened; a sentence pause shorter than the band → lengthened to the low end, **except before a number**; comma pauses are only shortened (no silence added mid-sentence); pauses inside a phrase are capped at `word`.
- Between lines: the silence is set so the heard pause lands mid-band (`speaker` band when the speaker changes, `sentence` band when the narrator carries on), or on `take.pause` if you give one.
- `take.tempo` stays 1.0; anything above 1.03 prints `!!`.
- Level-matches every line to −15.5 dBFS RMS; writes `out/voice.wav` and `out/timeline/voice.json`.
- Prints the overall rate, each line's words per minute and every heard pause, with `!!` on anything out of band. Put that table in your report.
- The old format (`"gaps": {"sentence": 0.14, "word": 0.08}` + `take.gap`) still builds the Knight example exactly as approved. Don't use it for new stories.

## Why

The first J-Com open capped every pause at 0.07–0.14 s, left 0.05 s between Dot's question and Gus's answer, stretched every narrator line 1.12× (211 and 224 wpm on two lines) and pitch-shifted three takes. The owner heard it as rushed, with sentences running into each other. The fix round cut the script from 106 to 89 words, used untouched takes at tempo 1.0 and the pause bands above: 151 wpm overall, every pause in band.
