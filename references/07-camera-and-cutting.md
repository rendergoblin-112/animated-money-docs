# 7. Camera and cutting

## Cutting

- **One shot per clause.** Cut where the narrator starts a clause: `"start": "@cut NB onto"` = 2 frames before "onto". 64–85% of cuts should land within 0.3 s of a line or sentence start.
- **Median shot 1.7–2.0 s, nothing over 5.2 s.** The title-question card is the longest segment (~4.5 s).
- **21–29 cuts a minute raw.** For 35–40 s that's 15–19 cuts.
- **Hard cuts by default.** One whip pan (`"whipIn": true`: the previous shot whips out over 3 frames, this one whips in over 8, with motion blur). One or two white flashes (`"flashIn": true`: a 2-frame flash), e.g. on a jump scare and on the title exit.
- **Typing cards are cuts too**: they cut in on the first typed word and cut out on the next line.
- **The skit** gets a two-shot on line 1, singles on lines 2 and 3 (cut on each speaker's first word).
- **The title card** sits on the last picture shot, starting 0.03 s after the title question ends: `"start": "@end NC +0.03"`. The chapter card follows 2.25 s later.

## Camera moves (`shots.json` "move")

| Move | Use | Measured |
|---|---|---|
| `"push": 0.05` | zoom in 5% a second, compounding (`zoom = 1.05^t`). The default move. | 43–61% of shots; 3.4–6.2% a second |
| `"pan": [dx, dy, dz]` | camera and target slide this far (world units) over the shot, centred on the shot's middle. Tilts: `[0, 2.4, 0]` | 19–35% |
| `{}` | static (still shows set animation) | 9–17% |

Faster pushes (9–11%/s) are allowed for one or two dramatic beats only (the approved example uses them into the missed rack and onto the waking creature). No camera roll.

## Framing

`"cam": { "pos": [x, y, z], "look": [x, y, z], "fov": 42 }`. Wides 50–56°, mediums 42–46°, close-ups 34–40°. The engine's world is in metres: characters are 1.5–1.9 high.

**Over-the-shoulder shots of someone at a screen** (a back-view figure at the desk):
- The head covers **at most about a quarter of the frame** and **never covers the numbers on the screen**. In practice: camera up and to the right of the figure, looking down past the head, so the head sits in a lower corner (J-Com: figure head at (−0.22, 1.15, 0.24); camera `[0.4, 1.55, 0.85]` → look `[0, 1.0, −0.55]`, fov 40 → head ≈ 14% of the frame, fields clear, keyboard ≈ 10% hidden).
- The keys and both hands must show (with the desk `keyboard`, 06). The first J-Com cut had the camera 0.6 m behind the head at fov 46: the head filled a third of the frame and hid the keyboard and part of the screen.
- A close camera makes the head huge relative to the screen: the head's share falls with the camera's distance from the head, not with the fov.

**The typing insert**: when typing is the story, cut one close-up of the fingers hitting the keys on the key beat (J-Com: "swapped two" → then the over-the-shoulder shot as the fields swap on "numbers", with the Enter strike on the same word). 0.6–0.9 s, `push` 0.08–0.1. Frame from above the far-left corner of the keyboard looking down at the number row and the right hand (`[-0.3, 1.08, -0.12]` → `[0.02, 0.82, -0.25]`, fov 30, keyboard at x −0.08): the legends read upright-ish, and the resting left hand drops out of frame. Low side angles put the near hand in front of the lens; a straight-down POV shows only the backs of the hands. Give the `type` cue `"hand": "R"` and start it a word before the cut, so the hand is already in place on the first frame.

Pitfalls the fix rounds caught (check stills, ref 10):
- A character's top of head cropped on a low wide: lower and widen the camera.
- A pointing hand leaving the frame in a single: move the hand pose inward or widen.
- The title subject hidden behind the title panel: put the subject in the right third; the panel covers the left two-thirds.
- Out-of-focus subject: with `dof.focus` use the measured distance from camera to subject; with `dof.target` focus follows the character.

## Overlays on picture

| Field | What it draws |
|---|---|
| `"tag": { "text": "AUGUST 1, 2012", "t0": 0.15, "t1": 1.1, "x": 110, "y": 160, "size": 72, "fill": "#ffd34a", "arrow": true }` | marker capitals typed on letter by letter between t0 and t1 (absolute seconds or "@" times); `arrow` adds a wobbling arrow |
| `"counter": { "label": "TRADES", "from": 0, "to": 4000000, "t0": "@ws ND Over", "t1": "@we ND out.", "plus": true, "prefix": "", "x": 1820, "y": 250, "size": 140, "color": "#ffd34a" }` | a big number rolling while it's said, shaking as it climbs; `plus` adds "+" at the end |
| `"ring": { "at": "@ws ND opened, -0.05", "text": "RIIING!" }` | ring lines around the set's clock anchor |
| `"title": {...}` | the title card (03, 01): words with `at` (s from shot start), `line`, `key`; `lines` [{x, y, size}]; `burstAt`, `burstX`, `burstY` |
| `"hide": ["tech"]` | hide a cast member in this shot |
