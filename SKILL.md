---
name: animated-money-docs
description: Makes a 30-40 s drawn finance-documentary cold open (16:9) about a true money story - fact-checked script with every number sourced, flat outlined characters acting in painted 3D sets, mouths timed to ElevenLabs voices, music and effects on the beats, rendered with three.js + ffmpeg. Use when the user asks to "make a finance documentary cold open", a "money story video", a "Paper Billions-style video", a "drawn finance doc", an animated explainer intro about a trading blunder, scandal, crash or corporate money story, or wants to turn a true business story into an animated cold open.
---

# Animated money docs: a drawn finance-documentary cold open

You build a 30–40 s cold open: hook → black typing card → setup → two-character skit → stakes → the title question said out loud → title card → chapter card. Everything is data in a project folder; the engine and tools in this skill folder don't change between stories.

`SKILL` below means this skill's folder (e.g. `~/.claude/skills/animated-money-docs`). Commands run from anywhere; paths in them are absolute or relative to where you are. Python tools always go through `node "$SKILL/template/tools/run.mjs" <tool>.py ...`, which picks the skill's own Python (`.venv` or `pydeps`).

## 0. Check the install (once)

```bash
ls "$SKILL/node_modules/puppeteer" >/dev/null && ffmpeg -version | head -1 && node "$SKILL/template/tools/run.mjs" stillcheck.py
```
(the last command prints the stillcheck usage if numpy is there). If anything is missing, follow README.md "Install". Smoke test: `npm run example` (renders the Knight Capital example from shipped takes, no API key, ~2 min) → `examples/knight-capital/out/cold_open.mp4`.

## 1. Pick the story and build the fact sheet first

Read `references/02-story-and-fact-check.md`. Then:
1. `node "$SKILL/template/tools/new.mjs" <project>` creates the project folder from the skeleton.
2. Fill `<project>/FACTS.md` before writing a word of script: every fact tagged F1.., each with a **word-for-word quote and a URL**. Use only sources the user gives you or that you have actually read. If a source says "at least", keep "at least". When sources disagree, say whose number you use.
3. People: named only if the sources name them, and never drawn as themselves. Unnamed people stay unnamed and are drawn from behind (`tech`-style, `"back": true`). No likeness, no logos.

## 2. Write the script to the beat map

Read `references/01-format-and-beat-map.md` and `references/03-script-and-title-question.md`. Fill `<project>/script.json`: narrator lines start with `[curious]`, numbers spelled out, every line tagged with its facts. The skit (Dot high and eager, Gus low and deadpan, from `template/cast/default.json`) reacts to the number just said and adds no facts. The last narrator line is the title question, starting "So …". Aim for about 85–90 words in all for a 36–40 s open: it's read at natural speed with real pauses, so too many words means cutting words, never speeding up the voice.

## 3. Cast and sets

- Default cast and voices: `references/04-characters-and-mouths.md`. Add story characters under `project.json` → `castOverrides` (anonymous people: `"back": true`).
- Pick sets from the library and give them the story's words and numbers in `project.json` → `sets`: `references/06-sets-and-colour.md`. If no set fits a key beat, add one to `template/engine/js/sets/` (story words in config, never in code) and document it there.

## 4. Record the voices

Read `references/08-voices.md`. Needs `ELEVENLABS_API_KEY` in the environment, or `--env-file <path>` pointing at the user's existing dotenv file. Never write the key into a project file.
```bash
node "$SKILL/template/tools/run.mjs" tts.py <project> NA --seed 301    # one call per line; logs VOICE_LOG.md; prints pitch and in/OUT of band
node "$SKILL/template/tools/run.mjs" pitch.py <project>/vo/NB_will_1.mp3
node "$SKILL/template/tools/make.mjs" <project> --only voice           # prints wpm per line and every heard pause (!! = out of band)
```
Set `project.json` → `"budget": {"tts": N}` to the user's limit. It has to sound like a person talking:
- **Record the narrator lines in order, in one sitting**, and set each line's `take` in `script.json` before recording the next: `tts.py` stitches each narrator take to the previous ones (`previous_request_ids`, under 2 hours old), so the delivery carries over.
- **Pitch**: narrator 125–136 Hz; high skit voice 1.6–1.9× the narrator; low 0.65–0.86×. Out of band → re-roll the seed, or change the delivery tag if two seeds miss the same way. **Never pitch-shift**; a take slightly outside the band beats a shifted one.
- **Speed**: `take.tempo` 1.0 (never above 1.03). Aim for 150–170 wpm overall with the pauses in; if the open runs long, **cut words, not speed** (about 85–90 words in all).
- **Pauses** (heard, word end to next word start; `script.json` "gaps", skeleton default): 0.35–0.6 s after a sentence, 0.3–0.5 s between speakers, 0.15–0.3 s at a comma, never over 0.85 s, no silence added before a number.
- **Check every take with speech-to-text** against the script: no mishearings (STT writing "8th" or "610,000" for the spoken words is fine).

## 5. Shot list, acting, sound

- `node "$SKILL/template/tools/make.mjs" <project> --only voice,mouths` builds `out/timeline/voice.json`; read it to pick cut words.
- Write `<project>/shots.json`: one shot per clause, cuts as `"@cut LINE word"`, a move on almost every shot, typing cards on the narrator's words, the title card on the last picture shot, chapter card last (`references/07-camera-and-cutting.md`, `references/project-format.md`). Act the skit with pose keys on the words (`references/05-acting.md`).
- **When someone types the key moment** (a wrong number, a cancel): give the desk the readable `keyboard` with the typist's `hands` (`references/06-sets-and-colour.md`), put `type` / `enterAt` / `handsOffAt` cues on the words, and cut **one insert close-up of the fingers on the keys** on that beat. Over-the-shoulder shots: the head covers at most about a quarter of the frame and never the numbers on the screen (`references/07-camera-and-cutting.md`).
- Write `<project>/sound.json`: bed + one effect per beat, ambience on the ducked bus (`references/09-sound-and-music.md`). New sounds: `template/tools/sfx.py` (budget `"sfx"`).

## 6. Stills first, side by side

```bash
node "$SKILL/template/tools/make.mjs" <project> --stills
```
Open every still in `<project>/out/stills/` and go through `references/10-still-check.md`. Also render stills at the skit's reaction words. Fix and re-render stills until every shot passes. Run `node "$SKILL/template/tools/run.mjs" editcheck.py <project>` and fix anything marked `!!` (or note why it's deliberate).

## 7. Render

```bash
node "$SKILL/template/tools/make.mjs" <project> --from mix [--lock <dir>]
```
`--lock <dir>` holds a shared mkdir lock during the video render (use it if the user names one; no lock without it). The run ends with the edit and audio checks; fix `!!` lines. Pull 4 frames from the final mp4 (`stillcheck.py frames`) and compare with the stills. Deliver `<project>/out/cold_open.mp4` and report: what's in it, the checks, call counts, and anything you couldn't meet.

## Rules that always apply

- No fact on screen or in the voice that isn't in FACTS.md with a quote and URL. Skit lines and metaphors are tagged `D` and add nothing.
- No real person's likeness; unnamed people stay unnamed. No other creator's characters, footage, voices, music or title artwork.
- Upright fonts only (Patrick Hand cards, Luckiest Guy labels/titles); no italics, no rotated text.
- Never render the full video before the stills pass.
