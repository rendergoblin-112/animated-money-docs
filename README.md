# animated-money-docs

A free Claude Code skill that turns a true money story into a **drawn finance-documentary cold open**: 30–40 seconds, 16:9, with a hook, a black typing card, the setup, a two-character skit, the title question said out loud, a title card and a chapter card.

- **Fact-checked**: every number on screen or in the voice is tagged to a quote and a source URL before the script is written.
- **Drawn**: flat outlined characters acting in painted, lit 3D sets (three.js), with mouths timed to the voice.
- **Voiced**: an ElevenLabs narrator and two recurring skit characters, picked and corrected by measured pitch.
- **Scored**: a music bed and effects on the cuts and beats, mixed to measured levels.
- **Measured format**: cut rate, shot length, camera moves, speech rate and loudness all have target bands, and the skill checks your render against them.

A new story is a new fact sheet, script, shot list and cue sheet (JSON). The engine doesn't change.

Includes a complete example, *Knight Capital, 1 August 2012*, that renders with no API key.

## Install (one command)

```bash
git clone https://github.com/rendergoblin-112/animated-money-docs ~/.claude/skills/animated-money-docs && cd ~/.claude/skills/animated-money-docs && npm install && python3 -m venv .venv && .venv/bin/pip install -r template/requirements.txt
```

`npm install` also downloads a headless Chrome into the skill folder (`.cache/`, about 210 MB). The tools find `.venv` on their own.

No venv? Install the Python packages into the skill folder instead and the tools use them in isolation:
`python3 -m pip install --target pydeps -r template/requirements.txt` (run inside the skill folder).

Check it works by rendering the example (about 2 minutes; no ElevenLabs key needed):

```bash
cd ~/.claude/skills/animated-money-docs && npm run example
```

Output: `examples/knight-capital/out/cold_open.mp4`.

## Use it

In Claude Code, ask for it:

> Make a finance documentary cold open about the Mizuho Securities J-Com order of 8 December 2005. Use only these sources: [links]. The trader isn't named in them, so keep them anonymous.

The same works for any true money story you can source: a trading blunder, a bank run, a fraud, a crash.

Claude follows `SKILL.md`: fact sheet → script → voices → shot list → stills checked side by side → render. You'll need `ELEVENLABS_API_KEY` set for the new voices:

```bash
export ELEVENLABS_API_KEY=your-key
```

The key is never written into a project. If you already keep it in a dotenv file, the voice and sound tools also take `--env-file ~/path/.env`.

## Requirements

- **Node.js 22.12 or newer** (puppeteer 25 needs it)
- **ffmpeg** with libx264 and AAC on your PATH (`brew install ffmpeg`, `apt install ffmpeg`), or set `FFMPEG=/path/to/ffmpeg`
- **Python 3** (3.10+; tested on 3.12) with `template/requirements.txt` (numpy, librosa and their pinned dependencies). The install command puts them in `.venv`; `PYTHON=/path/to/python` overrides
- **An ElevenLabs API key** for new voices and new sounds. The cast uses ElevenLabs premade voices (Will, Jessica, Brian), so every account has them. The example renders without a key
- macOS or Linux, about 600 MB of disk

## What's inside

```
SKILL.md                  the workflow Claude follows
references/               format numbers + beat map, fact-checking, script, characters + mouths, acting,
                          sets + colour, camera + cutting, voices, sound cue sheet, still check, project format
template/engine/          three.js engine: characters, overlay, timeline, and 7 reusable sets (city, trading floor,
                          server room, inside a rack, desk with an inbox or order-entry screen, skit office, courtroom)
template/tools/           make.mjs (whole pipeline), render.mjs, run.mjs (runs any Python tool with the skill's Python),
                          tts.py, pitch.py, psola.py, voice_build.py, visemes.py, mix.py, editcheck.py, audiocheck.py,
                          stillcheck.py, sfx.py, voices.py, basic_sfx.py, new.mjs
template/cast/            the default cast (Dot, Gus, the anonymous tech, extras) with voices and pitch targets
template/sfx, music/      a starter sound library (generated for this project) + synthesized utility sounds
template/skeleton/        a new project's files, ready to fill
examples/knight-capital/  fact sheet, script, shot list, cue sheet and final voice takes of the example
```

Pinned versions: three 0.170.0, puppeteer 25.18.1, @fontsource/luckiest-guy 5.3.0, @fontsource/patrick-hand 5.3.0 (`package-lock.json` committed); Python pins in `template/requirements.txt`. Fonts are OFL (via Fontsource).

## License

MIT. See [LICENSE](LICENSE). The example's sounds and voices were generated with ElevenLabs for this project.

Not affiliated with Paper Billions or any channel.
