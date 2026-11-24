# 8. Voices: picking by measured pitch, delivery tags, pitch correction

## Targets (measured)

| Role | Target | Default cast (ElevenLabs premade, on every account) |
|---|---|---|
| Narrator | one male narrator, **125–136 Hz** median, conversational, 160–170 wpm, almost no pauses | **Will** `bIHbv24MWmeRgasZH58o` with `[curious]` → 130 Hz |
| High skit voice | **1.6–1.9×** the narrator (≈ 210–250 Hz) | **Jessica** `cgSgspJ2msm6clMCkdW9` → 233 Hz exclaimed, 211–215 Hz flat |
| Low skit voice | **0.65–0.86×** the narrator (≈ 100–112 Hz) | **Brian** `nPczCjzI2devNBz1zQrb` → ~120 Hz raw, 104.5 Hz after −2.4 st |

Skit voices must also sound unlike the narrator (timbre): in the measured opens 16 of 18 skit lines sat far outside the narrator's own timbre spread. Different voice, not the narrator doing a voice.

## How to pick a voice by measured pitch

(Python tools run through `node template/tools/run.mjs <tool>.py`, which uses the skill's `.venv`/`pydeps`.)

1. `node template/tools/run.mjs voices.py voices.json --premade` lists your account's voices with preview URLs.
2. `node template/tools/run.mjs pitch.py --previews voices.json Will,Bill,Liam,Adam previews` downloads the free previews and measures each median (no TTS cost).
3. Previews are not your delivery. Generate the hook with the top 1–2 candidates (that's real TTS calls), then `pitch.py vo/NA_will_1.mp3` on each.
4. For high voices measure with `--range 150 500`: with the default 65 Hz floor, pyin locks onto vocal fry and reads far too low.
5. Measure the skit voices against the narrator's measured median: `pitch.py vo/S1_jessica_1.mp3 --range 150 500 --ref 130`.

What we found on the default account (useful starting points):
- No American male premade sat naturally in 125–136 Hz: Bill 146, Liam 146, Adam 109, Will 116 (plain).
- `[curious]` on Will lifts him to ~130 Hz and suits the conversational style. `[excited]` jumps to 217 Hz (shouting): never use it on the narrator.
- Stability 0.4 for the narrator; 0.35 got flatter and lower (115 Hz).
- Jessica at stability 0.5 is bright (233 Hz exclaimed); a flat deadpan line at stability 0.5–0.8 came out 260–314 Hz (too high); stability 0.95 with a reworded line gave 211 Hz.
- Brian reads low and dry; his vocal fry pulls pyin about. Expect to correct him down ~2.4 semitones.

## Delivery tags (eleven_v4)

Put the tag first in the line text: `"[curious] On August first, 2012, …"`. `voice_build.py` strips the tag's characters out of the timing, so it never reaches the typing cards or the lip sync. Use `[curious]` on every narrator line for consistent pitch. Test any other tag on one line before using it (`[excited]` shouts).

## Recording a take

```bash
node template/tools/run.mjs tts.py <project> NA --seed 301
```

- One call per script line, through `/with-timestamps` (character timings for cuts, cards and mouths).
- `--prev auto` (default) sends the previous line as `previous_text` so the reads flow.
- The key comes from `ELEVENLABS_API_KEY` in the environment; if you keep it in a dotenv file instead, add `--env-file ~/path/.env` (read only, never copied into the project).
- Every call is logged to `<project>/VOICE_LOG.md` with its request id, and counted against `project.json` → `"budget": {"tts": N}`.
- After a call `tts.py` prints the take's median pitch next to the cast target (if librosa is installed).
- Mark the take you keep in `script.json` → `take` and in the log's "Used" column.

Budget habit: 1 hook take per narrator candidate, then 1 take per line, with 3–5 calls held back for retakes. The approved example used 20 calls total.

## Pitch correction: `tools/psola.py`

A TD-PSOLA shifter (numpy + librosa) that changes pitch **without changing duration or formants**, so the ElevenLabs timestamps stay exact.

```bash
node template/tools/run.mjs psola.py vo/NB_will_1.mp3 vo/NB_will_1_ps.wav 1.6     # +1.6 semitones
node template/tools/run.mjs pitch.py vo/NB_will_1_ps.wav                             # re-measure
```

Then in `script.json`: `"take": { "audio": "vo/NB_will_1_ps.wav", "align": "vo/NB_will_1.align.json", ... }` (the alignment of the original call).

**When to use it**: small corrections, up to about ±2.5 semitones, on a take that otherwise sounds right. The approved example corrected three of seven lines: narrator +1.6 and +1.1 st, Gus −2.4 st.

**When not to use it**:
- Shifts over ~3 semitones: artifacts. Retake with other settings or another voice.
- If the corrected file's pyin shows stray frames far below the voice (a 73 Hz frame in a 210 Hz voice): that's a rough artifact. Reject it (this happened on a −2.3 st shift of Jessica).
- On a take that already sounds strained or fried.
- Never to change a character's identity: pick the right voice instead.

Always listen to the corrected line next to an untouched one; a corrected line can sound a touch less natural. If you have speech-to-text available, check it still transcribes word for word.

## Assembly (`tools/voice_build.py`)

- Trims each take to speech, caps internal pauses (0.14 s after punctuation, 0.08 s elsewhere; per-word overrides in `script.json` "special").
- Time-stretches with ffmpeg atempo, pitch kept (`take.tempo`, narrator 1.08–1.10).
- Joins lines with `take.gap` (0.03–0.10 s) and level-matches every line to −15.5 dBFS RMS.
- Writes `out/voice.wav` and `out/timeline/voice.json` (every word and character at its time in the final track).
