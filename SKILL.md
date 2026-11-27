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

Read `references/01-format-and-beat-map.md` and `references/03-script-and-title-question.md`. Fill `<project>/script.json`: numbers spelled out, every line tagged with its facts, a delivery tag only where a line needs one (Gus's `[deadpan]`; the narrator reads untagged). The skit (Dot high and eager, Gus low and deadpan, from `template/cast/default.json`) reacts to the number just said and adds no facts. The last narrator line is the title question, starting "So …". Aim for **about 80–90 words** in all for a 36–42 s open: it's read at natural speed with the read's own pauses (the default narrator reads about 130–145 wpm), so too many words means cutting words, never speeding up the voice.

## 3. Cast, sets and the look

- Default cast and voices: `references/04-characters-and-mouths.md`. Add story characters under `project.json` → `castOverrides` (anonymous people: `"back": true`).
- Pick sets from the library and give them the story's words and numbers in `project.json` → `sets`: `references/06-sets-and-colour.md`. If no set fits a key beat, add one to `template/engine/js/sets/` (story words in config, never in code), give it a dressing pass in `sets/dress.js`, and document it there.
- **The look is on by default** and needs no setup: sets are cel-shaded (`MeshToonMaterial`, a hard 3-step ramp) and inked by a screen-space brush-ink pass; every drawn line on the cast goes through the brush renderer (bold, swelling, tapered); faces and bodies are lit from the scene's lamps (warm rim, cool shadow crescent); each room is dressed with warm lamps and clutter, with foreground props per shot and far bokeh for depth; reactions are their own drawings; the title is hand-lettered with the skill's brush alphabet. What you choose per shot: `fg` (foreground props), `light` (each character's key light from the nearest lamp) and `armW` (thinner arms in close-ups). See 06 and 07.

## 4. Record the voices

Read `references/08-voices.md`. Needs `ELEVENLABS_API_KEY` in the environment, or `--env-file <path>` pointing at the user's existing dotenv file. Never write the key into a project file.
```bash
node "$SKILL/template/tools/run.mjs" tts.py <project> NA --seed 301    # one call per line; logs VOICE_LOG.md; prints pitch, pitch spread, guide
node "$SKILL/template/tools/run.mjs" pitch.py <project>/vo/NB_roger_1.mp3
node "$SKILL/template/tools/make.mjs" <project> --only voice           # prints wpm per line and every heard pause (!! = listen to it)
```
Set `project.json` → `"budget": {"tts": N}` to the user's limit. It has to sound like a person talking:
- **Default voices** (ElevenLabs premade, every account has them): **Roger** narrates (`CwhRBWXzGAHq8TQ4Fs17`, untagged), **Jessica** is Dot (`cgSgspJ2msm6clMCkdW9`), **Brian** is Gus (`nPczCjzI2devNBz1zQrb`, `[deadpan]`).
- **No time-stretch and no pitch shifting, of any kind.** Takes go into the cut exactly as returned (`take.tempo` 1.0; `voice_build.py` refuses anything else). The skill has no pitch-shifting tool: shifted or stretched takes sound processed.
- **Pick takes by how natural they sound**: listen if you can; otherwise compare pitch movement (spread) and the STT transcript. The pitch bands in the cast (narrator about 112–130 Hz for Roger, Dot about 1.6–1.9×, Gus about 0.65–0.86×) are a **guide** for spotting an odd take, never a reason to process one. A natural take a little outside the guide is kept and logged; one that sounds wrong is re-rolled (new seed) or re-tagged.
- **Record the narrator lines in order, in one sitting**, and set each line's `take` in `script.json` before recording the next: `tts.py` stitches each narrator take to the previous ones (`previous_request_ids`, under 2 hours old), so the delivery carries over.
- **Pauses are the read's own** (`script.json` "gaps" default `"mode": "asRead"`): a natural take already breathes about **0.35–0.6 s between sentences** and 0.15–0.3 s at commas. Only a pause over 0.7 s is trimmed (to 0.62); a sentence pause under 0.35 s is padded, never before a number. Between lines you set the heard pause (`take.pause`): 0.3–0.5 s at a speaker change, about 0.45 s narrator to narrator, 0.5 s before the title question.
- **Speed**: whatever the voice reads at (about 130–170 wpm). If the open runs long, **cut words, not speed**.
- **Check every take with speech-to-text** against the script, and the finished mix too: no mishearings (STT writing "8th" or "610,000" for the spoken words is fine).

## 5. Shot list, acting, sound

- `node "$SKILL/template/tools/make.mjs" <project> --only voice,mouths` builds `out/timeline/voice.json`; read it to pick cut words.
- Write `<project>/shots.json`: one shot per clause, cuts as `"@cut LINE word"`, a move on almost every shot (a static shot or two is fine: about 12%), typing cards on the narrator's words, the title card on the last picture shot, chapter card last (`references/07-camera-and-cutting.md`, `references/project-format.md`). Act the skit with pose keys on the words, using the reaction drawings (shock, deflate, relief; Gus's side-eye, one-brow point, deadpan shrug, sip): `references/05-acting.md`.
- **Depth and light on every picture shot**: name the set's foreground props for the framing (`"fg": ["denFgTwo"]`, so something sits blurred close to the lens), set each character's key light from the nearest lamp (`"light"`, or a named light from `shots.json` "lights"), and thin the arms in close-ups (`"armW": {"gus": 1.6}`; wide 2.5–3.0, close 1.55–1.9) so an arm never reads as a black tube.
- **When someone types the key moment** (a wrong number, a cancel): give the desk the readable `keyboard` with the typist's `hands` (`references/06-sets-and-colour.md`), put `type` / `enterAt` / `handsOffAt` cues on the words, and cut **one insert close-up of the fingers on the keys** on that beat. Over-the-shoulder shots: the head covers at most about a quarter of the frame and never the numbers on the screen (`references/07-camera-and-cutting.md`).
- Write `<project>/sound.json`: bed + **only the effects that carry a beat** (about 45 a minute; a few pings, not a burst of them), ambience on the ducked bus, the bed audible under every natural pause (`references/09-sound-and-music.md`). New sounds: `template/tools/sfx.py` (budget `"sfx"`).

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
- Upright lettering only (Patrick Hand cards, Luckiest Guy labels, the brush alphabet for titles); no italics, no rotated text. The brush title has A–Z, 0–9 and `$ ¥ £ € % . , ? ! ' - : / +`; the render stops and says so if a title uses anything else (reword, or `"style": "marker"`).
- Invented names on generic set dressing (ticker walls, extras): never copy another video's on-screen names.
- Never time-stretch or pitch-shift a voice.
- Never render the full video before the stills pass.
