# 10. The side-by-side still check (before every full render)

A full render costs minutes and holds the machine; a still costs seconds. **Never render the video until a still of every shot has been checked.**

## The method

1. **Render one still per shot**, 60% into each shot:
   ```bash
   node template/tools/make.mjs <project> --stills          # voice, mouths, shot list, then out/stills/ and stop
   node template/tools/render.mjs sheet <project>/out/stills <project>/out/sheet.jpg 4
   ```
   Or exact frames: `node template/tools/render.mjs <project> stills <dir> 150 408 744 1080`.
2. **Look at every still yourself** (open the PNGs). Go down the checklist below for each.
3. **Put a reference beside it** when you have one: your own previous approved render, or a frame you made earlier in the project.
   ```bash
   node template/tools/run.mjs stillcheck.py frames <approved.mp4> <dir> 150 408 744 1080   # exact frames from a video
   node template/tools/render.mjs pair ours.png ref.png pair.jpg "ours" "approved"
   node template/tools/run.mjs stillcheck.py diff ours.png ref.png                           # PSNR: inf = identical, 36+ = compression only, <30 = changed
   node template/tools/run.mjs stillcheck.py stats out/stills/*.png                         # black point, white point, saturation, warmth
   ```
4. **Fix, re-render only the stills that changed** (`--shots id,id` or the frame numbers), repeat. Each round is a line in your notes: what was wrong, what you changed.
5. **Check the acting at key words**: render stills at the frames of the reaction words too (e.g. the skit's first word + 0.2 s), not only mid-shot.
6. Then render the video, then pull 4 frames from the finished mp4 and compare them to the stills (encoding sanity check).

## Checklist per still

- [ ] The subject is in frame and readable on a phone (title subject in the right third).
- [ ] Heads aren't cropped; hands aren't leaving the frame on close-ups.
- [ ] Gestures read in the wide (arms not thin "antennae"; hands at the sides of the head, not on top); in a close-up an arm doesn't read as a thick black tube (lower `armW` for that shot).
- [ ] Each reaction reads as its own drawing (eyes, brows, mouth changed), not the idle face moved about. Surprise marks clear of the hair.
- [ ] No prop blocks the subject (a bell in front of a clock; a floor fan in the camera path showing as a huge dark disc).
- [ ] **Depth**: something blurred close to the lens (`fg`) actually reads, the subject is sharp, something far glows. A foreground at the very frame edge or invisible: move it or the camera.
- [ ] **The set is drawn**: ink lines on walls, desks and props; no fine distant detail turned into busy thin lines (lower the set's `ink.far`).
- [ ] **The room is full**: lamps, clutter, pictures. No large empty floor or wall in a picture shot.
- [ ] **Lamplight on the faces**: the warm rim is on the lamp's side and the cool shadow on the other; a lit face isn't washed out by bloom from a lamp right behind it (dim the lamp or its pool).
- [ ] Text is upright, spelled right, phone-sized, and every number on screen is in FACTS.md.
- [ ] No screen is blown out to white; blacks are deep (black(p1) ≈ 0–10).
- [ ] Something in the shot is moving (compare two stills 10 frames apart if unsure).
- [ ] Close-ups have soft backgrounds; wides are sharp.
- [ ] Unnamed real people are anonymous (seen from behind, no face).
- [ ] Generic signage (ticker walls, extras' screens) uses invented names.
- [ ] Over-the-shoulder shots: the head covers at most about a quarter of the frame and none of the screen's numbers; the keys and hands show. Render a still on a key hit too: the finger is down, the key lit.
- [ ] Keyboard and hands aren't burnt out to white (lower `capTint` / `light`, or `hands.tint`).
- [ ] Typing cards: white upright text centred on pure black, the narrator's words.
- [ ] Title card: brush lettering upright and whole on a dark panel, the red swipe behind the key phrase only (not overlapping the word before), the title clear of the set's subject, burst + flash at the end; chapter card centred, whole.

## Reproducing an approved render

If you change engine code, re-render the example's stills and diff them against a saved set: `stillcheck.py diff` must say "same" (PSNR inf) for every shot you didn't mean to change. For the whole film, compare decoded frames: `ffmpeg -i new.mp4 -map 0:v -f framemd5 -` against the approved file. The template reproduces the approved round-3 Knight Capital open frame for frame (1256 of 1256 frames identical).

A change in a few shots can still change the **encoded** frames around them: x264's look-ahead and reference frames span neighbouring shots, so unchanged shots next to a changed one come out a little different (≥ 50 dB PSNR). To tell that apart from a real picture change, render PNG stills of those frames before and after and compare the files.
