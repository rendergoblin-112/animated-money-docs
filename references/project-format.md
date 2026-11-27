# Project format: a new story = new data, not new code

A story lives in its own folder (anywhere). The engine and tools stay in the skill folder.

```
my-story/
  FACTS.md          fact sheet: every fact tagged F1.. with a word-for-word quote and URL (02)
  project.json      title, sets used + their words/numbers, cast additions, budgets
  script.json       every voiced line: speaker, text sent to TTS, fact tags, the take used
  shots.json        the shot list: cuts, cameras, moves, cues, acting, cards, title, chapter
  sound.json        music bed + effect cue sheet
  vo/               takes (.mp3/.wav) + .align.json + .tts.json logs
  sfx/              sounds made for this story (optional)
  VOICE_LOG.md      every TTS call (written by tts.py)
  SOUND_LOG.md      every generated sound (written by sfx.py)
  out/              generated: timeline/, voice.wav, mix.wav, stills/, video.mp4, cold_open.mp4
```

Start one with `node template/tools/new.mjs <folder>`: it copies a skeleton with every file filled in as a worked template.

## project.json

```json
{ "title": "…", "fps": 30, "output": "cold_open.mp4", "cast": "default", "language": "en",
  "budget": { "tts": 20, "sfx": 15 },
  "castOverrides": { "tech": { "design": { "propLabel": "NEW CODE" } }, "trader": { …a new cast member… } },
  "grade": { "sat": 1.35 }, "bloom": [0.32, 0.4, 0.88],
  "sets": { "city": {}, "floor": { "sign": "…", "board": { "label": "…", "value": 460000000, "currency": "$" } }, "den": { "monitorText": "…" } } }
```

`sets` lists the sets to build, in order, with their config (06). A set can appear twice under different names with `"kind"`: `"floorB": { "kind": "floor", "sign": "…" }`. Every set also takes `"dress": false` (no room dressing) and `"ink": { "far": 12, "width": 1.8 }` or `"ink": false`.

## script.json

```json
{ "level": -15.5, "lead": 0.10, "gaps": { "mode": "asRead", "trimOver": 0.70, "trimTo": 0.62, "sentenceMin": 0.35, "head": 0.12, "tail": 0.15 },
  "lines": [ { "id": "NA", "speaker": "narrator", "facts": ["F1"], "text": "…",
               "take": { "audio": "vo/NA_roger_1.mp3", "align": "vo/NA_roger_1.align.json", "tempo": 1.0 } },
             { "id": "NB", "speaker": "narrator", "facts": ["F2"], "text": "…",
               "take": { "audio": "vo/NB_roger_1.mp3", "align": "vo/NB_roger_1.align.json", "tempo": 1.0, "pause": 0.45 } } ] }
```

`speaker` is a cast id. Lines are spoken in this order. `gaps` "asRead" keeps each take's own pauses (08); `take.pause` (optional) sets the heard pause before a line, otherwise it lands mid-band (0.4 s at a speaker change, 0.475 s when the same voice carries on). `take.tempo` must be 1.0. `take.align` defaults to the alignment `tts.py` wrote next to the take (`vo/NA_roger_1.align.json`). (Older formats still build: the J-Com fix round's band mode, `"gaps": {"sentence": [0.35, 0.6], …}` without `mode`; and the v2 caps `"gaps": {"sentence": 0.14, "word": 0.08}` + `take.gap`, which need `"allowTempo": true` if a take was stretched. Don't use them for new stories.)

## Time expressions ("@…")

Anywhere in `shots.json` (and `at`/`until` in `sound.json`), a string starting with `@` is a time in seconds:

| Expression | Means |
|---|---|
| `@cut NA Knight` | 2 frames before "Knight" in line NA starts, snapped to a frame: **where cuts go** |
| `@ws NB eight` / `@we NB emails.` | word start / word end |
| `@start S1` / `@end NC` | line start / end |
| `@shot title` / `@shotend board` | start / end of a shot (earlier shots only in shots.json) |
| `Power#1` | the 2nd "Power" in the line (0-based) |
| `opened>and` | the first "and" after "opened" |
| `@ws S1 Ninety-seven -0.12` | offsets follow as extra tokens |

Matching ignores case and punctuation, so `The` also matches an earlier "the": `@cut ND The` in "…process the cancel. The loss…" cuts on "the cancel". Use `The#1`, or `cancel.>The`. If a word isn't found, the error lists the line's words. After `info`, check the printed shot list for a shot that starts early or runs long.

## shots.json

```json
{ "acting": { "dotKeys": [[0, "readScreen"], ["@ws S1 Ninety-seven", "shock", 0.18, "back"]] },
  "lights": { "denLamp": { "dot": { "x": 0.85, "y": 0.25, "color": "#ffc46a", "rim": 0.95, "dark": 0.34 }, "gus": { "x": -0.85, "y": 0.25, "color": "#ffc46a", "rim": 0.95, "dark": 0.34 } } },
  "shots": [
    { "id": "city", "set": "city", "start": 0, "cam": { "pos": [1.5, 0.6, 12], "look": [0, 13.5, -16], "fov": 50 }, "move": { "pan": [0, 2.4, 0] }, "fg": ["cityFg"],
      "tag": { "text": "AUGUST 1, 2012", "t0": 0.15, "t1": 1.0, "x": 110, "y": 160, "size": 72 } },
    { "id": "card1", "type": "card", "start": "@cut NA in", "line": "NA", "words": [["in ", "in"], ["45 ", "forty-five"], ["minutes.", "minutes."]] },
    { "id": "two", "set": "den", "start": "@cut S1 Ninety-seven", "cam": { … }, "fg": ["denFgTwo"], "light": "denLamp", "armW": { "dot": 3.0, "gus": 2.5 },
      "act": { "dot": "dotKeys", "gus": "gusKeys" }, "dof": { "target": ["dot", "gus"], "aperture": 0.012, "maxblur": 0.012 } },
    { "id": "title", "set": "server", "start": "@end NC +0.03", "cam": { … }, "title": { … } },
    { "id": "chapter", "type": "chapter", "start": "@shot title +2.2", "text": "The Code That Stayed Behind" } ],
  "end": "@shot title +2.2 +2.05" }
```

Shot fields: `id`, `set`, `start`, `cam` {pos, look, fov}, `move` {push | pan}, `cue` {set-specific, 06}, `act` {castId: keys or an "acting" name}, `fg` [the set's foreground groups, 06], `light` {castId: {x, y, color, rim, dark}} or a name from `"lights"`, `armW` {castId: weight}, `dof`, `grade` {warm, lift}, `tag`, `counter`, `ring`, `title`, `hide`, `whipIn`, `flashIn`; `beat` is a free label for you. Card fields: `type: "card"`, `line`, `words` [[shown text, start word, end word?]] (or explicit `segs` [[text, t0, t1]]), `size`. Chapter: `type: "chapter"`, `text`, `size`. A shot ends where the next one starts; `end` is when the film ends.

## The pipeline

```bash
node template/tools/make.mjs my-story --stills                 # voice -> mouths -> shot list -> one still per shot, then stop
node template/tools/make.mjs my-story --lock ~/.render.lock    # everything: + mix -> video -> mux -> checks
node template/tools/make.mjs my-story --only mix,mux,check     # after editing sound.json only
node template/tools/make.mjs my-story --from shots             # after editing shots.json (no new voice)
```

Run from the skill folder (where `node_modules` is). `PYTHON=/path/to/python` picks the Python; a `.venv` in the skill folder is used automatically.
