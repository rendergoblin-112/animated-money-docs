# 6. Painted sets and colour

## What the sets look like (measured)

- Real perspective: vanishing-point desks, corridors, server aisles, a floor plane with shadows, a back wall. 5/5.
- Lit night interiors with warm practicals (desk lamps, window glow, monitor glow) in 4/5. Cool fill.
- Counters that roll as the number is said in 4/5 opens. Place/date tags in marker capitals.
- No grain. Gentle, scene-driven vignette. Background blur with round bokeh on close-ups.

In the engine: low-poly boxes and planes, textures **painted** on canvas (vertical light falloff, soft grime blotches, dry-brush strokes, hand-drawn detail), warm point lights, a cool hemisphere fill, fog for depth. On top of that, so the sets read as **drawn like the characters** (round 3, the default for every set):

- **Cel shading.** Every set material is `MeshToonMaterial` with a hard 3-step ramp (shadow 92, a narrow mid band 168, lit 255, nearest filtering), so walls, desks, racks and props get the flat two-tone shading the cast has. `mat()` in `toon.js` does it; there is no setting to turn it off.
- **Brush ink on the sets.** A screen-space ink pass (`InkPass` in `main.js`, right after the scene render, before depth of field and bloom) draws a black line on every depth break and crease: a normal + depth pre-pass, then the second difference of 1/z (zero on any flat plane) plus normal edges. The line breathes in width like a loaded brush, wobbles slightly, is heavier on near objects, fades out by the set's ink distance, and boils very slightly on twos. Inverted-hull outlines are 1.5× thicker and the pass skips them. Character cards ink themselves (brush.js). Per set: `"ink": { "far": 12, "width": 1.8 }` (defaults: city 140 m / 1.4 px; floor 17, server 11, rack 3.2, desk 6, den 9, court 12 m at 2.1 px) or `"ink": false`. Tag a mesh `userData.noInk = true` to leave it out (bokeh discs are).
- **Bloom is kept low** (0.32 strength, 0.4 radius, 0.88 threshold) so lamps glow without washing out the lit faces. `project.json` → `"bloom": [s, r, t]` overrides it.
- **Full rooms and depth** (`sets/dress.js`): each set is dressed with warm practical lamps, furniture and clutter, far bokeh lights (city windows, LEDs deep in the server room, window lights in the den), and **foreground props per kind of shot**, hidden until a shot names them in `"fg"` so the depth of field blurs something close to the lens. `"dress": false` on a set turns its dressing off.
- **Lamplight on the faces.** Characters are lit from the scene, not by a flat fill: a hard warm rim crescent on the lamp side, a soft cool shadow crescent on the far side, a warm glow (chars.js `litFill`). The cast default (`template/cast/default.json` → `light`) is overridden per shot with `"light"` so the key light comes from the nearest practical in that framing (the den lamp sits between Dot and Gus: Dot is lit from screen right, Gus from screen left; the technician from his work lamp).

### Foreground groups per set (`shots.json` → `"fg": [...]`)

| Set | Groups | What they are |
|---|---|---|
| `city` | `cityFg` | a street lamp and a tree right by the lens |
| `floor` | `floorFgWide`, `floorFgBoard`, `floorFgClock`, `floorFgOrders` | a near desk with lamp, monitor, mug, plant and a pendant (wide); a pendant and a monitor edge (board); a desk with lamp, phone, papers (clock wall); a mug, pen cup and lamp (hero monitor) |
| `server` | `srvFgTech`, `srvFgAisle`, `srvFgStale` | a crash cart with laptop, lamp and a hanging cable; a cart, boxes and a floor cable (aisle); cables hanging in front of the missed rack |
| `rack` | `rackFg`, `rackFgNear` | cables hanging close to the lens; nearer cables for a close-up |
| `desk` | `deskFgWide`, `deskFgClose` | a pendant, mug and files; a mug and pen cup |
| `den` | `denFgTwo`, `denFgGus`, `denFgDot` | plant, pen cup, papers (two-shot); mug and plant (Gus); plant and phone (Dot) |
| `court` | `courtFgTitle`, `courtFgTable` | a brass pendant hanging by the lens and a lectern with books, for a bench shot from behind counsel's table (camera about [-0.7, 1.75, 0.8]); a water jug and books on counsel's table |

The render stops with the list of valid names if a shot names a group its set doesn't have. Foregrounds were placed by numbers: check each one in a still (10) and move the camera rather than lose the group, or leave it out of that shot.

## The set library (`template/engine/js/sets/`)

Each set is reusable: story words and numbers come from `project.json` → `"sets"`. List only the sets you use, in any order (the example's order is the one that reproduces it pixel for pixel).

| Set | What's in it | Config (`project.json` "sets") | Shot cues (`shots.json` "cue") |
|---|---|---|---|
| `city` | Pre-dawn skyline, lit tower, street lamps, cars, clouds, beacon | `sign` (text on the tower top) | – |
| `floor` | Trading floor: desks + traders, big loss board, ticker walls, LED strip, wall clock + brass bell, hero monitor, walker, tumbling papers. Dressed: wainscot and moulding, 3 sconces, framed pictures, a binder shelf, a wall screen, a water cooler, a filing cabinet with a plant, a coat stand, a pendant | `sign`, `board` {label, value, currency}, `boardTicker` [..], `tickers` [16 names; default: invented symbols VELO, ORBA, TANZ, MIRA, QUIL, ZEPH, BRAK, CIVO, DUNE, EPIX, FENN, WREN, HUXT, JADE, KRON, LYNX], `clock` {h, m, label} (`"label": ""` = no time printed), `monitor` {title, count, rows, note, status}, `cast` | `boardRoll` [t0, t1] (counter rolls from → value, camera jolts; `rollShake: false` keeps a wide steady), `board` {label, value, from, currency} (a different figure in this shot), `clockAt` t (minute hand snaps on, bell rings), `orders` [t0, t1] (hero monitor counts up) |
| `server` | Rack row with status lamps (one odd rack), second row, cable trays, hazard tape, workbench, extinguisher, exit sign. Dressed: 4 caged work lamps, a second workbench with lamp and monitor, a chair, boxes, a cable spool, a ladder, a cable ramp, a floor fan, a mop bucket, a toolbox, a floor work-light | `racks` {count, label, missed}, `cast` (default: `tech`) | `greenAt` [t, step], `allGreen`, `staleBlink` t, `alarmAt` t / `alarm`, `sparks` |
| `rack` | Inside one rack: patch panel, faceplates, swaying cables, spinning fan, a dusty drawer where "the old code" creature sleeps. Dressed: a warm work light from outside, deep LED bokeh | `nodeLabel`, `drawerLabel`, `panelPrefix`, `creatureLabel`, `tickets` [a, b] | `wakeAt` t, `awake`, `fireAt` t (order tickets fly), `shake` |
| `desk` | Office desk at dawn, blinds, wall clock, framed chart, stickies, lamp, steaming mug, big monitor. Dressed: bookshelf, floor lamp, filing cabinet with plant, cork board, sconce | `wallClock` {h, m} or `false`, `stickies` (false = none), `chair` [x, z] (office chair for a seated figure), `keyboard` {pos [x, z], hands {cast, sleeve, skin}} (opt-in readable keyboard + the seated figure's forearms and hands, see below), `screen` {mode: **inbox**, title, time, sender, subject, count} or {mode: **order**, title, ticker, side, before {qty, unit, price}, after {qty, unit, price}, cancelText, failText}, `cast` | inbox: `emails` [t0, t1] (unread counter climbs, envelopes fly). order: `state` before/after, `swapAt` (the two fields trade places), `sendAt`, `cancelAt`, `failAt` (red stamp, screen shakes). keyboard: `typing` [t0, t1], `type` {from, to, text, hand}, `enterAt` t or [..], `handsOffAt` t |
| `den` | Dot and Gus's skit office: night window, bookshelf, charts, plant, whiteboard, filing cabinet, a low desk lamp between them (its light pool and bulb kept dim so bloom doesn't wash out their faces). Dressed: two floor lamps, a rug, a coat stand, a side table with lamp, frames, warm window bokeh | `monitorText` (one short reaction line on the side monitor), `cast` | – |
| `court` | An empty panelled courtroom (no judge or lawyer drawn): bench + empty chair, gavel and block, banker's lamp, scales of justice, round wall seal, tall windows with light shafts and dust, counsel's table with the claim papers. Dressed: brass pendants, a law-book shelf, plants, counsel's chairs, a clerk's lamp | `seal` (ring text), `document` {title, amount, lines}, `scales` {left, right, tilt} (tilt > 0 tips the left pan down), `cast` | `gavelAt` t (bang), `tiltAt` t / `tilted` (scales tip with overshoot), `paperAt` t (papers slap down) |

Every set also takes `dress` (false = no dressing) and `ink` ({far, width} or false).

To add a set: copy the closest file in `sets/`, keep the same `make(cfg, ctx)` signature, call `dress('<kind>', scene, cfg)` as the last build step and return `{ scene, cards, update(st), anchors, setFg: DR.set, fgGroups }` (calling `DR.update(T)` in `update`), add a `dressX` to `sets/dress.js` (lamps, clutter, bokeh, a foreground group per kind of shot) and its ink distance to `INK_FAR` in `main.js`, register it in `sets/index.js`, and document its config here. Put every story word in `cfg`, never in the code.

## Rules for a painted set

1. **Props everywhere, rooms full of warm lamps and clutter**, drawn for the story: phones, paper stacks, mugs, plants, framed pictures, books, lamps. A bare box set reads as a 3D test scene; the round-3 owner note was "puppets in boxes". The clock wall and the server aisle were the plainest and got the most.
2. **Depth in every picture shot**: something blurred close to the lens (`fg`), the subject in focus, something far and glowing (bokeh). Check the foreground actually reads in the still: in round 3 the cables in "It wasn't" and the city foreground barely did.
3. **Something moves in every shot**: cars, flickering windows, blinking LEDs, scrolling tickers, steam, swaying cables, a walker, tumbling papers.
4. **Big story numbers go on objects in the set** (a loss board, an unread badge, a hero monitor), rolling while they're said.
5. **Text in sets uses Luckiest Guy (upright) with a dark edge.** Signs, labels and screens. No logos: write the company name in the engine's lettering.
6. **Light the characters from the scene**: put a warm lamp near where characters stand, and set each character's `light` per shot from it (x, y toward the lamp in the frame, its colour, rim 0.85–0.95, dark 0.34–0.36 for a strong lamp). In a two-shot with the lamp between them, the two lights point at each other.
7. **Generic dressing uses invented names**: ticker walls, extras, posters. v2 of the Knight open reused another video's ticker symbols by mistake; the default `tickers` are now invented. Real names only where they're a sourced fact (the company's own ticker on the board, `boardTicker`).
8. **Keep the frame readable**: a fix round shrank a bell that blocked the clock shot, moved cobwebs into corners, and switched a blown-out white inbox to a dark screen. In the J-Com test, sticky notes on a monitor bezel covered the screen header in close-ups (`stickies: false`), and white paper under a reading light bloomed out (darker paper, weaker light). In round 3 a new floor fan sat in the title shot's camera path as a huge dark disc (moved), and the den floor-lamp bloom spilled onto Dot (lamps and pool dimmed).
9. **No unsourced facts in the set dressing**: a wall clock or a "9:30" label is a claim about time. If the time isn't in FACTS.md, use `wallClock: false` / `clock.label: ""`.
10. **Fonts lack some glyphs**: Luckiest Guy has no "×"; write "41 TIMES", not "41×". Check every label in a still.

## Keyboard and hands (desk, opt-in)

When the story turns on someone typing (a fat-finger order, a wrong number, a cancel that didn't go through), give the desk a readable keyboard and the typist's hands. Without `keyboard` the desk keeps its original flat slab (the Knight example renders unchanged). The keycaps keep a standard lit material (not the cel ramp) so the legends stay readable; the ink pass still outlines the keyboard.

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

The post chain: render → **brush ink** → DOF (close-ups only) → bloom (0.32 / 0.4 / 0.88) → output → **grade** → whip blur.

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
