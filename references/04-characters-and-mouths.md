# 4. Characters and mouths

## The look (measured)

Flat, outlined 2D characters standing in lit 3D sets. **Not paper cutouts**: no paper texture, torn edges, offset shadows or split-pin joints.

| Feature | Rule |
|---|---|
| Head | Near-perfect circle with a black outline, **32–42% of total height** (2.4–3.1 heads tall) |
| Body | Bean/egg shape, flat fill, no neck; the head overlaps the body |
| Arms, legs | Single black strokes; 3–4 stroke fingers; legs only on full-figure shots |
| Face | Dot or oval eyes, short arc brows, "^ ^" closed eyes for happy, no nose. One trademark (glasses, moustache, hair shape) |
| Line | Black, **bold brush** lines: 0.066 × head radius (about 3.3% of head diameter), swelling and thinning along each stroke, tapered at open ends. The camera scales the card, so lines get thicker on close-ups for free |
| Shading | Lit from the scene's lamp: a hard warm **rim crescent** on the lamp side, a soft cool **shadow crescent** on the far side, a warm glow spilling in; soft contact shadow under the feet |

In the engine (`engine/js/chars.js`) every character is drawn into a canvas texture on a billboard card that always faces the camera. Every frame is redrawn from pose parameters, so there are in-betweens, not pose swaps.

**Brush lines** (`engine/js/brush.js`): every card's 2D context is wrapped by `brushify()`. Path calls are recorded as they're drawn; any `stroke()` in the ink colour is redrawn as a variable-width brush stroke (the width noise is seeded by where the stroke sits, so it holds still from frame to frame; open strokes taper). Before a stroke, `g.taper = [start, end]` shapes that one stroke (arms `[0, 0.42]`: full at the shoulder, thin at the wrist; fingers `[0, 0.6–0.7]`; brows `[0.5, 0.75]`). Arms are drawn at `armW` × the line weight: the design's `armW` (Dot 2.9, Gus 2.7, else 2.3), or the shot's `"armW": {"gus": 1.6}` (07: thinner in close-ups). Hands use their own unit (0.052 × head radius) with bold tapered fingers.

**Lamplight** (`litFill`): the light is `{x, y, color, rim, dark}`: direction toward the lamp as seen in the frame (x, y in −1..1, +x = screen right), the lamp's colour, rim strength, shadow depth. The cast default is in `default.json` → `light`; a shot overrides it per character with `"light"` (06, 07). The crescents come from one direction per shot, not from the real lamp positions, so they don't change when a character moves within a shot.

## The default cast (`template/cast/default.json`)

| Id | Who | Voice | On screen |
|---|---|---|---|
| `narrator` | One male American narrator, conversational | ElevenLabs **Roger** `CwhRBWXzGAHq8TQ4Fs17` (premade), untagged | never |
| `dot` | Small analyst, round red glasses, dark bob, mustard cardigan. Eager, panics fast, relaxes fast. | ElevenLabs **Jessica** `cgSgspJ2msm6clMCkdW9` (premade), about 1.6–1.9× the narrator | skit |
| `gus` | Big bald deadpan floor trader, grey walrus moustache, braces, coffee mug. Never hurries. | ElevenLabs **Brian** `nPczCjzI2devNBz1zQrb` (premade) with `[deadpan]`, about 0.84× untouched | skit |
| `tech` | Anonymous worker **seen only from behind** (hoodie). Use for any unnamed real person. | none | setup |
| `bellGuy` | Generic trader facing camera (a generated extra) for crowd reactions | none | stakes |
| background traders, the walker | Generated extras on the trading floor (`bgPerson(i)`) | none | wides |

Dot and Gus are this skill's own recurring characters. They are commentators, not participants: they never play a real person.

## Adding a character for a story

Add it in your project, not in the default cast: `project.json` → `"castOverrides": { "trader": { ... } }`. A new entry needs:

```json
"trader": {
  "about": "The unnamed trader. Seen only from behind.",
  "design": { "headR": 200, "headY": 575, "skin": "#e8b48c", "body": { "top": 715, "bot": 1330, "w": 440, "color": "#2f3a52", "style": "suit" },
              "hair": { "style": "back", "color": "#1d1a1a" }, "back": true, "legs": null },
  "worldH": 1.5, "light": { "x": -0.6, "y": -0.3, "color": "#bfe0ff", "rim": 0.6, "dark": 0.3 },
  "breath": { "rate": 2.0, "amp": 3, "phase": 0.5 }, "tint": 0.9, "rest": "type",
  "poses": { "type": { ... }, "freeze": { ... } }
}
```

Design fields: `headR`/`headY` (canvas px on a 1024×1536 card, feet at y 1500), `skin`, `body` {top, bot, w, color, style: cardigan | braces | hoodie | tie | shirt | suit}, `hair` {style: bob | bald | short | back, color}, `glasses` (frame colour), `moustache` (colour), `legs` {top, foot, shoe} or null, `back: true` (no face drawn: anonymous), `eyeX`, `eyeRx`, `eyeRy`, `browY`, `browW`, `armW` (arm weight, default 2.3), `propLabel` (text on a held drive). A design can also be `{"bgPerson": [index, front]}` to reuse a generated extra.

Placing it: each set takes `"cast": { "trader": { "pos": [x, y, z], "worldH": 1.5 } }` in `project.json` "sets". A seated figure with `"legs": null` sits on a chair: raise it (`pos` y ≈ 0.38 for worldH 1.32) and give the desk set `"chair": [x, z]` at the same spot (tested in the J-Com example: `pos: [-0.22, 0.38, 0.24]`, `chair: [-0.22, 0.26]`). A typist at the desk `keyboard` (06) gets 3D forearms and hands on the keys: turn the figure's drawn arms off in its desk poses (`"armL": null, "armR": null`). Back-view characters still show `shock` lines, so a freeze reads from behind. Sets that already hold cast members (den: dot + gus; server: tech; floor: bellGuy) use their defaults unless you give a `cast` list.

Anonymity rules (02): unnamed real people get `back: true`. Never draw a real person's face, hairstyle or signature look.

## Mouths: 6 shapes timed to the sounds

Measured: about 5 distinct mouth drawings swap over 1.5 s, each held 2–4 frames at 15 fps. Eyes hold while the mouth swaps.

The engine has: **X** closed, **A** small open, **E** wide/teeth (ee, s), **D** open (ah), **O** round (oo, w), **F** teeth on lip (f, v), plus rest mouths: `smile`, `frown`, `flat` (deadpan line), `bigSmile` (open grin with teeth and tongue), `OO` (scream, 1.6×). Every mouth scales with the pose's `mouthScale`.

`tools/visemes.py` builds them for every cast member with `"talks": true`:
1. ElevenLabs `/with-timestamps` gives every character's start/end time (kept through trimming and pause changes by `voice_build.py`).
2. Spelling → sound: digraphs th, sh, ch, ph, ee, ea, oo, ou, ow, ai, ay, igh; a silent final e; m/b/p close the mouth; f/v teeth on lip.
3. The real voice level gates the mouth shut wherever the sound drops (−28 dB under the line's peak).
4. The mouth leads the audio by one frame (it reads as in sync).
5. Single-frame flickers are smoothed so every shape holds ≥ 2 frames.

When the character isn't speaking, the rest mouth is the pose's `restMouth` if it has one, else `OO` while `shock > 0.3`, `smile` with happy eyes, else `X`. Blinks run only while not speaking (every ~79 frames, offset per character).

Known limit: it's spelling-based, not phoneme recognition. "thirty", "eight" are approximations. Spell numbers out in the TTS text or the mouths can't follow them.
