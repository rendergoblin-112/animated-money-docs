# 9. Sound and music: the cue sheet

## Targets (measured)

- **Speech** median RMS −15.2 to −15.9 dBFS (100 ms windows). All 5 measured opens sit within 0.7 dB.
- **Music bed** under the whole open, 13–17 dB under the speech, **never silent**: 0 windows under −45 dB before the chapter card.
- **Peaks** (95th pct) −10.0 to −10.8 dBFS: hits about 5 dB over speech.
- **Title card**: speech stops 1.1–3.8 s before the chapter card; one impact at speech level or louder (−11.5..−15.4 dB RMS), decaying over ~1.25 s to −26..−30.
- **Chapter card**: the only near-quiet moment, floor −27 to −57 dB.
- **Effects follow cuts**: a strong low hit lands just after 28% of cuts (12% by chance). The maker's own count is ~46 effects a minute.
- **Loudness** about −14 LUFS integrated, true peak under 0 dBTP (the pipeline aims for −0.5 or lower, what the approved example shipped at).

## sound.json

```json
{ "bed": { "file": "bed.mp3", "underSpeech": -37, "measure": [1, 30], "splice": [37.5, 12],
           "title": { "from": "@shot title -0.05", "level": -31 },
           "chapter": { "from": "@shot chapter", "level": -48, "ramp": 0.35 } },
  "duck": -10,
  "roomTone": -46,
  "cues": [
    { "file": "basic/whoosh", "at": "@shot floorWide -0.06", "gain": -11 },
    { "file": "counter_roll", "at": "@ws NA four", "gain": -15, "until": "@we NA dollars... +0.1", "bus": "amb" },
    { "file": "email_ping", "at": "@ws NB ninety-seven", "gain": -14,
      "repeat": { "to": "@we NB emails.", "steps": 22, "curve": 1.6, "overrun": 0.6, "altGain": -3 } } ] }
```

- `at` / `until` take the same "@" times as the shot list, plus `@shot id` / `@shotend id`. `dur` is seconds. `fade` (default 0.05) fades the cut end. `offset` starts partway into the file.
- `bus: "amb"`: ambience-type sounds (murmur, hum, typing, counters, paper) go on a bus ducked `duck` dB under the voice.
- `repeat`: a burst that speeds up (pings while a counter climbs).
- `bed.splice` [a, b]: cut the bed at a and continue from b (an earlier bar), so a 40 s track outlasts the open. `loopFrom` repeats from a point if it's still short.
- `roomTone`: a very quiet soft noise floor (dB, before loudness) up to the chapter card, so a gap in the music can never drop under −45 dB. `null` turns it off.

`tools/mix.py` builds `out/mix.wav`: voice + bed (gain curve: under speech → up for the title card → down for the chapter card) + effects + ducked ambience + room tone, then one linear gain to −14 LUFS and a 4×-oversampled limiter. ffmpeg's AAC encoder can overshoot a limited transient by a few dB, and not in step with the level (in testing, turning the mix down 0.6 dB raised the AAC peak from −0.6 to +1.0 dBTP). So the mux step tries 0, −0.3, −0.6, −1, −1.5 and −2 dB and keeps the first file at or under −0.5 dBTP. Check with `node template/tools/run.mjs audiocheck.py <project> <project>/out/cold_open.mp4`.

## The cue pattern for a cold open (from the approved example)

| Beat | Cues |
|---|---|
| Hook | city/room ambience (amb) under shot 1; a low thump on frame 1; a whoosh into shot 2; floor murmur (amb); counter roll under the rolling number; an impact as the number lands |
| Typing cards | typing (amb) for the card's length |
| Setup | an ambience per set (server hum); a click on a physical action; a big whoosh on the whip pan; confirmation beeps; an error buzz on the problem; a snore/creature sound; pings that speed up with a counter |
| Skit | a surprise sting on the reaction word; a swipe on the cut to the single; a pop on the gesture word |
| Stakes | an alarm on the turn ("It wasn't."); clock ticks; the bell on the word; a cheer; power-up + glitch + sparks on the creature waking; keyboard chatter; ticket spray; counter roll |
| Title card | sparks, a pop per word as it lands, a riser into the key word, one title hit on the key word, a big whoosh on the burst |
| Chapter card | the bed drops to −48: nothing else |

Keep the density sensible: the approved example placed 79 events in 39.5 s (23 of them pings), which is busier than the measured ~46/min. Prefer one sound per beat.

## The shipped library

`template/sfx/` (ElevenLabs Sound Effects, generated for the example; prompts in `template/sfx/PROMPTS.md`), `template/sfx/basic/` (synthesized by `tools/basic_sfx.py`: numpy only, regenerate any time), `template/music/bed.mp3` (ElevenLabs Music, 40 s, 100 BPM).

New sounds: `node template/tools/run.mjs sfx.py <project> "<prompt>" <name> [seconds]` (logged to `SOUND_LOG.md`, budget `project.json` → `"budget": {"sfx": N}`). Check each new sound's level before using it: one generated "sip" came back at −60 dB peak and one "paper flutter" needed +10 dB.

Prompt style that worked: concrete source + action + texture + "no voices" where relevant, e.g. "Busy stock trading floor ambience, murmuring traders, phones ringing, keyboards clacking, no clear words".
