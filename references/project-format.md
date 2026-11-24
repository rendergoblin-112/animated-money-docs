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
  "grade": { "sat": 1.35 },
  "sets": { "city": {}, "floor": { "sign": "…", "board": { "label": "…", "value": 460000000, "currency": "$" } }, "den": { "monitorText": "…" } } }
```

`sets` lists the sets to build, in order, with their config (06). A set can appear twice under different names with `"kind"`: `"floorB": { "kind": "floor", "sign": "…" }`.

## script.json

```json
{ "level": -15.5, "lead": 0.10, "gaps": { "sentence": 0.14, "word": 0.08 }, "special": [["NA", "dollars", 0.16]],
  "lines": [ { "id": "NA", "speaker": "narrator", "facts": ["F1"], "text": "[curious] …",
               "take": { "audio": "vo/NA_will_1.mp3", "align": "vo/NA_will_1.align.json", "tempo": 1.08, "gap": 0.0 } } ] }
```

`speaker` is a cast id. Lines are spoken in this order. `take.gap` is the silence before the line. `take.align` defaults to `<audio>.align.json`; keep it pointing at the original call when `audio` is a pitch-corrected copy.

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
{ "acting": { "dotKeys": [[0, "readScreen"], ["@ws S1 Ninety-seven +0.02", "shock", 0.22, "back"]] },
  "shots": [
    { "id": "city", "set": "city", "start": 0, "cam": { "pos": [1.5, 0.6, 12], "look": [0, 13.5, -16], "fov": 50 }, "move": { "pan": [0, 2.4, 0] },
      "tag": { "text": "AUGUST 1, 2012", "t0": 0.15, "t1": 1.1, "x": 110, "y": 160, "size": 72 } },
    { "id": "card1", "type": "card", "start": "@cut NA in", "line": "NA", "words": [["in ", "in"], ["45 ", "forty-five"], ["minutes.", "minutes."]] },
    { "id": "two", "set": "den", "start": "@cut S1 Ninety-seven", "cam": { … }, "act": { "dot": "dotKeys", "gus": "gusKeys" }, "dof": { "target": ["dot", "gus"], "aperture": 0.01, "maxblur": 0.01 } },
    { "id": "title", "set": "server", "start": "@end NC +0.03", "cam": { … }, "title": { … } },
    { "id": "chapter", "type": "chapter", "start": "@shot title +2.25", "text": "The Code That Stayed Behind" } ],
  "end": "@shot chapter +2.1" }
```

Shot fields: `id`, `set`, `start`, `cam` {pos, look, fov}, `move` {push | pan}, `cue` {set-specific, 06}, `act` {castId: keys or an "acting" name}, `dof`, `grade` {warm, lift}, `tag`, `counter`, `ring`, `title`, `hide`, `whipIn`, `flashIn`; `beat` is a free label for you. Card fields: `type: "card"`, `line`, `words` [[shown text, start word, end word?]] (or explicit `segs` [[text, t0, t1]]), `size`. Chapter: `type: "chapter"`, `text`, `size`. A shot ends where the next one starts; `end` is when the film ends.

## The pipeline

```bash
node template/tools/make.mjs my-story --stills                 # voice -> mouths -> shot list -> one still per shot, then stop
node template/tools/make.mjs my-story --lock ~/.render.lock    # everything: + mix -> video -> mux -> checks
node template/tools/make.mjs my-story --only mix,mux,check     # after editing sound.json only
node template/tools/make.mjs my-story --from shots             # after editing shots.json (no new voice)
```

Run from the skill folder (where `node_modules` is). `PYTHON=/path/to/python` picks the Python; a `.venv` in the skill folder is used automatically.
