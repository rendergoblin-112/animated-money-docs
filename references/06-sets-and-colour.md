# 6. Painted sets and colour

## What the sets look like (measured)

- Real perspective: vanishing-point desks, corridors, server aisles, a floor plane with shadows, a back wall. 5/5.
- Lit night interiors with warm practicals (desk lamps, window glow, monitor glow) in 4/5. Cool fill.
- Counters that roll as the number is said in 4/5 opens. Place/date tags in marker capitals.
- No grain. Gentle, scene-driven vignette. Background blur with round bokeh on close-ups.

In the engine: low-poly boxes and planes with matte materials and an **inked outline** (inverted hull), textures **painted** on canvas (vertical light falloff, soft grime blotches, dry-brush strokes, hand-drawn detail), warm point lights, a cool hemisphere fill, fog for depth.

## The set library (`template/engine/js/sets/`)

Each set is reusable: story words and numbers come from `project.json` → `"sets"`. List only the sets you use, in any order (the example's order is the one that reproduces it pixel for pixel).

| Set | What's in it | Config (`project.json` "sets") | Shot cues (`shots.json` "cue") |
|---|---|---|---|
| `city` | Pre-dawn skyline, lit tower, street lamps, cars, clouds, beacon | `sign` (text on the tower top) | – |
| `floor` | Trading floor: desks + traders, big loss board, ticker walls, LED strip, wall clock + brass bell, hero monitor, walker, tumbling papers | `sign`, `board` {label, value, currency}, `boardTicker` [..], `tickers` [16 fictional names], `clock` {h, m, label} (`"label": ""` = no time printed), `monitor` {title, count, rows, note, status}, `cast` | `boardRoll` [t0, t1] (counter rolls from → value, board shakes), `board` {label, value, from, currency} (a different figure in this shot), `clockAt` t (minute hand snaps on, bell rings), `orders` [t0, t1] (hero monitor counts up) |
| `server` | Rack row with status lamps (one odd rack), second row, cable trays, hazard tape, workbench, extinguisher, exit sign | `racks` {count, label, missed}, `cast` (default: `tech`) | `greenAt` [t, step], `allGreen`, `staleBlink` t, `alarmAt` t / `alarm`, `sparks` |
| `rack` | Inside one rack: patch panel, faceplates, swaying cables, spinning fan, a dusty drawer where "the old code" creature sleeps | `nodeLabel`, `drawerLabel`, `panelPrefix`, `creatureLabel`, `tickets` [a, b] | `wakeAt` t, `awake`, `fireAt` t (order tickets fly), `shake` |
| `desk` | Office desk at dawn, blinds, wall clock, framed chart, stickies, lamp, steaming mug, big monitor | `wallClock` {h, m} or `false`, `stickies` (false = none), `chair` [x, z] (office chair for a seated figure), `keyboard` {pos [x, z], hands {cast, sleeve, skin}} (opt-in readable keyboard + the seated figure's forearms and hands, see below), `screen` {mode: **inbox**, title, time, sender, subject, count} or {mode: **order**, title, ticker, side, before {qty, unit, price}, after {qty, unit, price}, cancelText, failText}, `cast` | inbox: `emails` [t0, t1] (unread counter climbs, envelopes fly). order: `state` before/after, `swapAt` (the two fields trade places), `sendAt`, `cancelAt`, `failAt` (red stamp, screen shakes). keyboard: `typing` [t0, t1], `type` {from, to, text, hand}, `enterAt` t or [..], `handsOffAt` t |
| `den` | Dot and Gus's skit office: night window, bookshelf, charts, plant, whiteboard, filing cabinet, lamp | `monitorText` (one short reaction line on the side monitor), `cast` | – |
| `court` | An empty panelled courtroom (no judge or lawyer drawn): bench + empty chair, gavel and block, banker's lamp, scales of justice, round wall seal, tall windows with light shafts and dust, counsel's table with the claim papers | `seal` (ring text), `document` {title, amount, lines}, `scales` {left, right, tilt} (tilt > 0 tips the left pan down), `cast` | `gavelAt` t (bang), `tiltAt` t / `tilted` (scales tip with overshoot), `paperAt` t (papers slap down) |

To add a set: copy the closest file in `sets/`, keep the same `make(cfg, ctx)` signature, return `{ scene, cards, update(st), anchors }`, register it in `sets/index.js`, and document its config here. Put every story word in `cfg`, never in the code.

## Rules for a painted set

1. **Props everywhere**, drawn for the story: phones, paper stacks, mugs, plants, framed charts, stickies. A bare box set reads as a 3D test scene (fix round 3 on the approved build).
2. **Something moves in every shot**: cars, flickering windows, blinking LEDs, scrolling tickers, steam, swaying cables, a walker, tumbling papers.
3. **Big story numbers go on objects in the set** (a loss board, an unread badge, a hero monitor), rolling while they're said.
4. **Text in sets uses Luckiest Guy (upright) with a dark edge.** Signs, labels and screens. No logos: write the company name in the engine's lettering.
5. **Practicals + rim light**: put a warm lamp near where characters stand; the characters' `light` (cast) should point from it.
6. **Keep the frame readable**: a fix round shrank a bell that blocked the clock shot, moved cobwebs into corners, and switched a blown-out white inbox to a dark screen. In the J-Com test, sticky notes on a monitor bezel covered the screen header in close-ups (`stickies: false`), and white paper under a reading light bloomed out (darker paper, weaker light).
7. **No unsourced facts in the set dressing**: a wall clock or a "9:30" label is a claim about time. If the time isn't in FACTS.md, use `wallClock: false` / `clock.label: ""`.
8. **Fonts lack some glyphs**: Luckiest Guy has no "×"; write "41 TIMES", not "41×". Check every label in a still.

## Keyboard and hands (desk, opt-in)

When the story turns on someone typing (a fat-finger order, a wrong number, a cancel that didn't go through), give the desk a readable keyboard and the typist's hands. Without `keyboard` the desk keeps its original flat slab (the approved Knight example renders unchanged).

```json
"desk": { "chair": [-0.22, 0.26],
          "cast": { "trader": { "pos": [-0.22, 0.38, 0.24], "worldH": 1.32 } },
          "keyboard": { "pos": [-0.08, -0.2], "hands": { "cast": "trader", "sleeve": "#2f3a52", "skin": "#e8c09a" } } }
```
- **The keyboard** (`template/engine/js/sets/keyboard.js`): light keycaps with ink outlines and printed legends (number row, letters, Enter, space), a dark case with a rim of screen light along its edges, a small lamp over it. Keys go down and light up when hit (Enter lights amber). Options: `keycap`, `legend`, `case`, `rim`, `capTint` (cap brightness, 0.62), `light` (lamp, 1 = default, 0 = none).
- **The hands**: the seated cast member's forearms (sleeve + shirt cuff) and hands, attached at the card's shoulders, solved as two-bone arms onto the keys. Skin is drawn flat (unlit) like the cast cards, so the screen glow can't burn it out. Set the typist's own drawn arms off in the poses used at the desk (`"armL": null, "armR": null`); body acting (lean, freeze with shock lines, slump) still comes from the poses.
- **Put the keyboard a little right of the typist** (J-Com: typist x −0.22, keyboard x −0.08) so both hands stay clear of the body in an over-the-right-shoulder shot.
- **Cues** on the shot: `typing` [t0, t1] (light typing at `typeRate`, default 7/s), `type` {from, to, text, hand} (these keys evenly spaced; `"hand": "R"` gives them all to one hand so the other stays out of a close insert), `enterAt` (hard Enter strike: lift, slam, key lights; put it on the same word as the screen's `sendAt`/`cancelAt`/`swapAt`), `handsOffAt` (hands jump off the keys and freeze, fingers spread; pair it with `failAt`). Hands touch-type: 1–5, Q–T, A–G, Z–B with the left hand, the rest with the right.
- **Sound to match**: a click per key hit with a `repeat` cue (`"steps": <keys − 1>, "curve": 1.0, "overrun": 0` lands on the same times as a `type` cue with the same from/to), and the Enter clack on each `enterAt` (09).

## Colour and grade (per shot, `shots.json` "grade")

The post chain: render → DOF (close-ups only) → bloom → output → **grade** → whip blur.

| | Default | Close-up (a `dof.target` shot) | Notes |
|---|---|---|---|
| saturation | ×1.35 | ×1.45 | measured on final frames: close-up saturation 206–209 |
| vignette | 0.38 | 0.48 | |
| black lift | 0 (true blacks) | 0 | black points 0–5 on picture shots |
| contrast / gamma | 1.08 / 1.12 + highlight shoulder | | highlights roll off under ~250 |
| warmth | +0.03 | per shot: `"grade": { "warm": 0.08 }` | warm interiors +0.05..+0.08, server rooms −0.01 |

Change the defaults for a whole project with `project.json` → `"grade": { "sat": 1.35, "satClose": 1.45, "vig": 0.38, "vigClose": 0.48, "warm": 0.03, "lift": 0 }`. Check with `node template/tools/run.mjs stillcheck.py stats <stills>`: black(p1) near 0–10, white(p99) under 250, saturation ~150–210.

## Depth of field

`"dof": { "target": "dot", "aperture": 0.018, "maxblur": 0.016 }` focuses on a character's head; `"dof": { "focus": 2.3, "aperture": 0.014, "maxblur": 0.014 }` focuses at a distance. Use it on close-ups (round bokeh from lamps and windows). Keep wides sharp.
