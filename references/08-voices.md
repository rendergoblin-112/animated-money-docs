# 8. Voices: natural takes, picking voices, recording, assembly

The rules that make it sound like a person talking (set after owner listens of the J-Com open and the Knight round 3, Nov 2026; see "Why" at the end):
- **No time-stretch.** `take.tempo` is 1.0, always (`voice_build.py` stops on anything else). To fit the open, cut words.
- **No pitch shifting of any kind.** The skill has no pitch-correction tool. Takes go into the cut exactly as ElevenLabs returned them.
- **Pick voices and takes by how natural they sound.** Listen if you can. If you can't, compare pitch movement (spread) and the speech-to-text transcript. The pitch bands below are a **guide** for spotting an odd take, never a reason to process one: a natural take a little outside the guide is kept and logged.
- **The read's own pauses.** A natural take breathes about 0.35–0.6 s between sentences and 0.15–0.3 s at commas. Keep them. Only a pause over 0.7 s is trimmed (to 0.62 s); a sentence pause under 0.35 s is padded, never in front of a number. Between lines: 0.3–0.5 s at a speaker change, about 0.45 s narrator to narrator.
- **Stitch the narrator takes** (`tts.py --prev`, on by default) so the delivery carries from line to line.
- **Check every take with speech-to-text**, and the finished mix too: no mishearings.

## The default cast's voices (ElevenLabs premade, on every account)

| Role | Voice | Settings | Measured on the Knight open (untouched) | Guide |
|---|---|---|---|---|
| Narrator | **Roger** `CwhRBWXzGAHq8TQ4Fs17` | stability 0.45, **no tag** | 124.8 / 117.8 / 113.2 Hz on statements, 161 Hz on the rising title question; 120.6 Hz over the open; reads about 130–145 wpm | about 112–130 Hz on statements (Roger's own range). The reference narrators measured 125–136 Hz; Roger sits a little lower, which is fine |
| Dot (high) | **Jessica** `cgSgspJ2msm6clMCkdW9` | stability 0.5 (0.95 for a flatter read) | 233.3 Hz (1.93×, kept: natural) and 214.6 Hz (1.78×) | about 1.6–1.9× the narrator |
| Gus (low) | **Brian** `nPczCjzI2devNBz1zQrb` | stability 0.6, `[deadpan]` | 100.8 Hz = 0.84× | about 0.65–0.86× |

The guides are in the cast (`voice.band` in Hz, `voice.bandRatio` × the narrator). After each call `tts.py` prints the median pitch, the **spread** (semitones between the 10th and 90th percentile: how much the voice moves) and "inside / outside the guide".

Skit voices must also sound unlike the narrator (timbre): in the measured opens 16 of 18 skit lines sat far outside the narrator's own timbre spread. Different voice, not the narrator doing a voice.

## How to pick a voice

(Python tools run through `node template/tools/run.mjs <tool>.py`, which uses the skill's `.venv`/`pydeps`.)

1. `node template/tools/run.mjs voices.py voices.json --premade` lists your account's voices with preview URLs.
2. `node template/tools/run.mjs pitch.py --previews voices.json Roger,Liam,Eric previews` measures the free previews (no TTS cost): median, IQR and spread.
3. Previews are not your delivery. **Audition** the top 2–3 on the hook line, untagged, same seed (real TTS calls), then `pitch.py vo/NA_*.mp3`.
4. Choose the one that sounds most like a person telling a story. Without ears, the spread is the best single number: Roger moved 5.0 semitones on the Knight hook, against Eric 4.7, Will 4.4 (tagged) / 3.0 (plain) and Liam 4.0. Under about 3.5 st reads flat. All four read about 134–146 wpm, so speed didn't decide it.
5. For high voices measure with `--range 150 500`: with the default 65 Hz floor, pyin locks onto vocal fry and reads far too low. A narrow, low IQR (Brian 81–100 Hz) is a real low read; a wide one reaching the floor is fry.

## Delivery tags (eleven_v4)

Tag only a line that needs one, first in the text: `"[deadpan] They all say \"disabled.\""`. `voice_build.py` strips the tag's characters out of the timing, so it never reaches the typing cards or the lip sync. The narrator reads untagged (round 3): a tag on every line flattens the delivery into one tone. Test any other tag on one line before using it (`[excited]` shouts). Tags that ask for speed backfire; to slow a line, write fewer words.

## Recording a take

```bash
node template/tools/run.mjs tts.py <project> NA --seed 301 --env-file ~/path/.env
python3 <stt tool> vo/NA_roger_1.mp3 vo/check/NA_roger_1.stt.json      # any speech-to-text with word timings
```

- One call per script line, through `/with-timestamps` (character timings for cuts, cards and mouths).
- **Stitching** (`--prev auto`, the default): a narrator line is sent with `previous_request_ids` = the up to 3 earlier narrator lines' takes (the take in `script.json`, else the newest), if they're under 2 hours old and the same voice. So record the narrator lines in order, in one sitting, and set each line's `take` in `script.json` before recording the next. Older takes fall back to `previous_text`. Skit lines get the line before as `previous_text`. Give explicit line ids or request ids with `--prev NA,NB`.
- The key comes from `ELEVENLABS_API_KEY` in the environment, or `--env-file` (read only, never copied into the project).
- Every call is logged to `<project>/VOICE_LOG.md` with its request id and pitch, and counted against `project.json` → `"budget": {"tts": N}`.
- A take that sounds wrong (flat, sing-song, a stumble, a misread word): change the seed. If two seeds go wrong the same way, change the wording or the tag. A take that sounds right stays, wherever its pitch lands.
- **Check it by ear and by STT.** Run speech-to-text on every take you might keep and compare word for word with the script. STT writes numbers as digits ("8th", "8:01", "610,000"); that isn't a mishearing.
- Mark the take you keep in `script.json` → `take` and in the log's "Used" column.

Budget habit: one audition round (2–3 voices on one line), one take per line, plus 3–5 calls held back for re-rolls. Knight round 3 used 8 calls (3 auditions, 4 narrator lines, 1 Gus line) and reused Dot's two earlier untouched takes.

## Why there is no pitch-correction tool

Earlier versions shipped `psola.py` (TD-PSOLA, duration kept) and used it to pull takes into the pitch bands: the v2 Knight open had three shifted lines and the first J-Com open three more. Every one sounded slightly processed, and both owner listens flagged it. A band is a description of what the reference opens measured, not a property a good take must have. So the tool is gone, the bands are guides, and a natural take outside them is kept.

## Assembly (`tools/voice_build.py`)

`script.json` (skeleton default):
```json
"gaps": { "mode": "asRead", "trimOver": 0.70, "trimTo": 0.62, "sentenceMin": 0.35, "head": 0.12, "tail": 0.15 },
"take": { "audio": "vo/NB_roger_1.mp3", "align": "vo/NB_roger_1.align.json", "tempo": 1.0, "pause": 0.45 }
```
- Inside a line the take's own pauses stay. Only a pause over `trimOver` is shortened (to `trimTo`); a sentence pause under `sentenceMin` is lengthened to it, **except before a number**. Commas and phrase gaps stay as read. Knight round 3 needed neither: every line was used exactly as read.
- Each line starts `head` (0.12 s) before its first aligned letter, so a soft onset ("Th", "K") isn't clipped, and ends `tail` after its last.
- Between lines the silence is set so the heard pause (last word end → next first word start) is `take.pause`, else mid-band (`speaker` 0.3–0.5 at a speaker change, `sentence` 0.35–0.6 when the same voice carries on). Knight: 0.45 narrator to narrator, 0.42 / 0.38 / 0.40 in the skit, 0.45 back to the narrator, 0.50 before the title question.
- `take.tempo` must be 1.0.
- Level-matches every line to −15.5 dBFS RMS; writes `out/voice.wav` and `out/timeline/voice.json`.
- Prints the overall rate, each line's words per minute and every heard pause, with `!!` on a pause outside its guide band: listen to it; nothing is processed to fit. Put that table in your report.
- Two older pause modes still build: the J-Com fix round's bands (`"gaps": {"sentence": [0.35, 0.6], ...}` without `mode`: pauses forced into the bands, phrase gaps capped at 0.12 s) and the v2 caps (`"sentence": 0.14, "word": 0.08`, which make a read sound rushed; `"allowTempo": true` rebuilds a stretched v2 project). New projects use the default.

## Why

The v2 Knight open and the first J-Com open capped pauses at 0.07–0.14 s, stretched the narrator 1.08–1.12× (up to 224 wpm on a line) and pitch-shifted six takes between them. Both owner listens heard it as rushed and processed, with sentences running into each other. The J-Com fix round cut words and forced pauses into bands at tempo 1.0 (151 wpm). Round 3 of Knight went further: a new narrator picked by how natural he sounds, every take used as read with its own pauses (sentence gaps median 0.56 s on the finished mix, commas 0.28–0.30 s), the script cut from 101 to 82 words: 130 wpm, slower and calmer than the reference opens (148–179), and the owner's approved version.
