# 5. Acting

Characters act through **pose keys tied to words**. A pose is a plain object of drawing parameters; the engine blends between keys with easing on every frame, quantised to 15 fps ("on twos", as drawn animation is timed). Mouths still change every frame with the voice.

## Pose parameters

| Param | Meaning |
|---|---|
| `armL`, `armR` | `{ "e": [x, y] elbow, "h": [x, y] hand, "hand": open | point | fist | flat | grip, "dir": radians, "prop": mug | drive | papers | phone, "label": "text" }` (canvas px, card 1024×1536) |
| `armsFront` | arms drawn over the head (hands on cheeks, mug to mouth) |
| `eyes` | open | wide | **pin** (tiny pupils in huge whites: shock) | **side** (a sideways glance under a flat lid) | half | closed | happy; `eyeScale` (bigger eyes), `look` [x, y] (-1..1) |
| `brows` | neutral | up | worried | angry; `browRaise` 0..1 (both), **`browL`, `browR`** (one brow up: the deadpan "really?") |
| `restMouth` | the mouth when not speaking: X | smile | frown | flat | bigSmile | O | OO; **`mouthScale`** scales every mouth (a scream at 1.45) |
| `glassesUp` | 0..1 glasses jump up the face (shock) |
| `sparkle` | 0..1 sparkles beside the head (relief, delight) |
| `hairUp` | 0..1 hair springs up (coded; it read as antennae with the surprise marks, so the default cast doesn't use it) |
| `sx`, `sy` | squash/stretch about the feet (anticipation: sx 1.07, sy 0.9) |
| `bob` | body offset in px (negative = up); breathing is added on top |
| `lean`, `tilt`, `headDx`, `headDy`, `shrug` | body lean (radians at the feet), head tilt, head offset, shoulder lift |
| `shock` | 0..1 surprise marks beside the head, clear of the hair (from behind: shock lines above it) |
| `blush`, `sweat` | cheeks, sweat drop |
| `use` | start from another pose and change only what's listed (chains: a pose can `use` one that `use`s another) |

The shot can also set `"armW": { "dot": 3.0 }` (arm weight for this framing, 07) and `"light"` (the key light per character, 06).

## Keys

In `shots.json`, each shot can carry `"act": { "dot": [[time, pose, duration, ease], ...] }`. The move INTO a key starts at its time and lasts `duration` (default 0.2 s). Eases: `io` (default), `out`, `in`, `back` (overshoot and settle: use on every reaction), `snap`.

Times are expressions on the voice (see project-format.md), so reactions hit the words:

```json
"dotKeys": [[0, "readScreen"],
  ["@ws S1 Ninety-seven -0.14", "antic", 0.12, "io"],       eyes screwed shut, deep squash, just before she speaks
  ["@ws S1 Ninety-seven", "shock", 0.18, "back"],           jolt: pin eyes, glasses jump, scream mouth, hands on cheeks
  ["@ws S1 emails?", "shockLean", 0.3, "io"],               lean in toward Gus
  ["@ws S2 They +0.2", "shockHold", 0.4],                   wide eyes, small "O", hold while he answers
  ["@ws S3 Oh. -0.08", "deflate", 0.22, "io"],              half-lidded, worried brows, frown
  ["@ws S3 So", "relief", 0.3, "back"],                     happy closed eyes, big grin, blush, hand on chest, sparkles
  ["@ws S3 then.", "reliefSmile", 0.3]]
```
(the Knight example; Gus: `mugLook` side-eye glance with one brow up, `point` with one brow raised and a flat mouth on "say", `shrug` deadpan on "disabled", eyes closed on the `sip`.)

Define a key list once under `"acting"` and reuse it by name in every shot of the scene (`"act": { "dot": "dotKeys" }`), so the acting is continuous across cuts.

## Acting rules that came out of the fix rounds

1. **Every reaction has anticipation → action → overshoot → settle.** Squash (sy 0.9) 0.1 s before, the jolt with `back` ease, then a hold.
   **Each reaction is its own drawing, and big.** Moving the idle drawing about reads as a puppet (the round-3 owner note). Change the eyes (pin, side, half, happy), the brows (one up), the mouth (scream, frown, grin, flat), the glasses, add marks or sparkles, and push it: Dot's shock is pin eyes in huge whites, glasses jumping up the face and a scream at 1.45×.
2. **The listener acts too.** While Dot speaks, Gus looks over (`mugLook`), lifts the mug, points on the key word ("say"), shrugs on the next. A still listener reads as a cut-out.
3. **Props stay in the hand.** Use `prop` + a grip hand (the mug moves with the arm), not a prop floating in the set.
4. **Gestures must be big enough for the wide.** Thin arms with small gestures read as antennae in a two-shot: give the wide heavy arms (`armW` 2.5–3.0). Hands on the sides of the head with elbows flared, not on top. In a close-up the same arm reads as a thick black tentacle: thin it (`armW` 1.55–1.9).
5. **Keep hands inside the frame** on close-ups (a pointing hand left the frame in a first pass).
6. **Hit one gesture per stressed word**, not one per word. Point on "say", shrug on "disabled".
7. **Background extras loop small motions** (typing, glancing, the odd stretch) so every shot has movement. They are drawn from behind with no legs at desks.
8. **Personified objects get the same principles.** The sleeping "old code" breathes, squashes when woken, jumps with eyes popping, then pumps both arms while firing orders.
9. **Keep surprise marks off the hair.** Marks above a bob plus springing hair read as antennae; the marks now sit beside the head and `hairUp` stays 0.

## Default pose libraries

- **dot**: readScreen, antic, shock, shockLean, shockHold, deflate, relief, reliefSmile, worried, point
- **gus**: mugIdle, mugLook, mugUp, point, shrug, sipStart, sip, mugDown, lean
- **tech**: idle, walk (holding a drive), raise, insert, done
- **bellGuy**: bgIdle, bgAntic, bgCheer

Add poses to a cast member in `project.json` → `castOverrides` → `<id>` → `poses`.
