# Sound library: what's here and how it was made

All files in `template/sfx/` and `template/music/` were generated for this skill's example with ElevenLabs (Sound Effects / Music). `template/sfx/basic/` is synthesized by `tools/basic_sfx.py` (numpy only; run it again to regenerate). To make your own versions: `node template/tools/run.mjs sfx.py <project> "<prompt>" <name> [seconds]`.

## Music

| File | Prompt | s |
|---|---|---|
| music/bed.mp3 | "Instrumental underscore for an animated finance documentary cold open. Tense but playful: plucked pizzicato strings, a ticking hi-hat clock pulse, warm upright bass, soft analog synth pad, light glockenspiel accents. Mysterious and curious, steady 100 BPM, builds slightly toward the end and lands on a final hit. No vocals." | 40 |

The bed has a natural break around 18.3 s; `mix.py`'s room tone keeps that from going silent. Splice it (`"splice": [37.5, 12]`) to run past 40 s.

## Effects

| File | Prompt | s |
|---|---|---|
| sfx/server_hum.mp3 | "Low steady electrical hum of a server room, cooling fans whirring, data center ambience, no voices" | 6 |
| sfx/error_buzz.mp3 | "Short harsh computer error buzzer, two quick low beeps, cartoon" | 1 |
| sfx/drawer_slide.mp3 | "Old dusty metal drawer sliding open with a creak" | 1.5 |
| sfx/robot_snore.mp3 | "Tiny cartoon robot snoring softly, electronic whistle on the out breath" | 2.5 |
| sfx/opening_bell.mp3 | "Stock exchange opening bell ringing loudly, brass bell clanging" | 2.5 |
| sfx/power_up.mp3 | "Old computer powering on suddenly, electric zap and rising whine, cartoon robot waking up" | 1.2 |
| sfx/ticket_spray.mp3 | "Machine rapidly spitting out paper tickets, fast fluttering paper and dot matrix printer chatter, frantic" | 2.5 |
| sfx/title_hit.mp3 | "Single deep cinematic impact hit with a short boomy tail, trailer title slam" | 2 |
| sfx/counter_roll.mp3 | "Fast mechanical number counter rolling up, rapid clicking digits, slot machine style" | 2 |
| sfx/city_amb.mp3 | "Quiet early morning city ambience, distant traffic, soft wind, a far away car horn" | 2.5 |
| sfx/green_beeps.mp3 | "Seven quick ascending electronic confirmation beeps, server status lights turning green" | 1 |
| sfx/email_ping.mp3 | "Single short bright email notification ping, clean digital chime" | 0.6 |
| sfx/floor_murmur.mp3 | "Busy stock trading floor ambience, murmuring traders, phones ringing, keyboards clacking, no clear words" | 5 |
| sfx/paper_flutter.mp3 | "Sheets of paper fluttering and flapping through the air" (came back quiet: use about +10 dB) | 2 |
| sfx/alarm_blare.mp3 | "Short red alert alarm blare, one urgent electronic warning tone" | 1 |
| sfx/spark_crackle.mp3 | "Electric sparks crackling and fizzing from a faulty plug" | 1.5 |
| sfx/cheer_woo.mp3 | "One man cheering a short excited woo, cartoon office worker" | 1 |
| sfx/surprise_sting.mp3 | "Cartoon surprise sting, quick rising string stab with a pop" | 1 |

## Synthesized (`sfx/basic/`, from `tools/basic_sfx.py`)

whoosh, whoosh_big, swipe (cuts and whip pans) · impact, thump (hits) · riser (peaks ~1.6 s in, into the title hit) · typing, keys, click (typing cards, keyboards) · ticks (clock) · pop (words landing, gags) · glitch (digital stutter). 32-bit float WAV; the loud ones peak above full scale on purpose, and the mix gains them down.
