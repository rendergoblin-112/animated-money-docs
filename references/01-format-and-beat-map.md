# 1. The format and the cold open beat map

Every number here was measured frame by frame on the cold opens of 5 drawn finance-documentary videos (30 fps, every frame, cut detection checked by eye, captions and audio measured with librosa). "n/5" means how many of the 5 follow the rule. Cut counts carry about ±15% uncertainty. Use the bands as targets, not as laws. `tools/editcheck.py` and `tools/audiocheck.py` measure your own open against them.

"Cold open" = from 0:00 to the black chapter card. The measured opens ran 37–86 s. This skill builds the short form: **30–40 s, 16:9, 1920×1080, 30 fps.**

## The beat map for a 30–40 s open

| Time (s) | Beat | What happens | Measured basis |
|---|---|---|---|
| 0–3 | **Hook** | One narrator sentence over the first picture: a person or a dollar figure, plus a time frame. First cut at 1.0–2.4 s. | hook names a person or a $ figure 5/5; first cut 1.0–2.4 s 5/5 |
| 3–8 | **Black typing card** | The end of the hook sentence types out in white on black, in sync with the voice. | a text card by 8 s, 5/5 |
| 8–19 | **Setup** | Who, what number, why it's strange. 5–7 picture shots, one per line or clause. | 21–29 raw cuts/min in opens |
| 19–25 | **Skit** | 2–5 short lines between two recurring characters (not the narrator), 3–6 s in all (6–7 s at natural speed). It reacts to the number just said. The last line is the punchline; the narrator comes back after a normal hand-off (0.3–0.5 s heard; the measured opens used ≤ 0.1 s, which sounded rushed). | skit lands at 19–29 s 5/5; 2–6 lines |
| 25–31 | **Stakes** | The consequence, fast: counters roll, things go red. | |
| ~28–35 | **Title question, said out loud** | The narrator asks it: "So how / why / where …?" The same words type out on a black card as they're said. | spoken as a "So …" question 3/5; typed while said in the 2 shortest |
| 31–34 | **Title card** | Over the last picture shot (not on black): the title builds in word by word over 1.0–2.5 s on a plain dark panel, key words on a red band, then speed-line burst + white flash (0.3–0.5 s) and a hard cut. Speech has stopped. One impact sting at speech level. (The engine letters it with its own upright brush alphabet, key phrase on a painted red swipe.) | 3/5 (the 3 most recent) |
| 34–36 | **Chapter card** | Black, the chapter name appears whole (no typing), held ~2.1 s. The only near-quiet moment. | 5/5, 1.9–2.2 s |

The example (`examples/knight-capital`, round 3, read at natural speed) lands: first cut 1.80 s, first card 4.63 s, skit 21.13–27.58 s (3 lines), title question 34.30–37.57 s, title card 37.60–39.80 s, chapter card 39.80–41.87 s. Total 41.87 s.

**Natural speed moves some of these numbers.** The measured opens read fast (148–179 wpm) with almost no pauses. Read as a person talks (130–170 wpm, 0.35–0.6 s between sentences), the same story runs a little longer, shots get a little longer (median 2.0 s), the skit runs 6–7 s and fewer cuts land exactly on a line start (65%). That's the accepted trade: **cut words to fit; never speed up the voice to hit a band** (08).

## The numbers to hit

| Measure | Band | Notes |
|---|---|---|
| Cuts per minute (raw) | **21.1–29.3** (×0.85 precision: 18–25) | a 35 s open = 11–15 picture shots + 2–3 typing cards + the title card |
| Median shot | **1.7–2.0 s** | 10th–90th pct about 0.8–3.7 s; **nothing over 5.2 s** |
| Cuts on a line start | **64–85%** within 0.3 s of a sentence/line start (chance: 20–26%) | so: cut where the narrator starts a clause |
| Shots that move | **83–91%** | push-in is the main move |
| Push / pan / static | **43–61% / 19–35% / 9–17%** | push speed 3.4–6.2% scale a second |
| Black typing cards | **3.2–5.0 a minute** in the open | type-on 0.6–3.6 s, hold 0.2–0.6 s, hard cut |
| Speech rate | measured **148–179 words/min** (median 166) | the skill aims for a natural read, **about 130–170**: cut words, never speed up |
| Gaps between lines | measured **≤ 0.1 s** | **not followed**: the skill keeps heard pauses (0.35–0.6 s between sentences, 0.3–0.5 s between speakers), because the tight gaps sounded rushed (08) |
| Narrator pitch | measured **125–136 Hz** median, one male narrator | a guide only; the default narrator (Roger) reads about 113–125 Hz on statements |
| Skit voices | measured **1.6–1.9×** the narrator (215–259 Hz) and/or **0.65–0.86×** (101–117 Hz) | guides only; never pitch-shift to reach them |
| Speech level | **−15.2 to −15.9 dBFS** median RMS (100 ms windows) | all 5 within 0.7 dB. With fewer effects the voice carries more of the −14 LUFS master: the example reads −14.2 |
| Music bed | 13–17 dB under speech, **never silent**: 0 windows under −45 dB before the chapter card | the skill sits it about 16–19 dB under and keeps it audible under every natural pause (09) |
| Peaks | 95th percentile −10.0 to −10.8 dBFS | |
| Title impact | −11.5 to −15.4 dB RMS (speech level or louder), decays over ~1.25 s to −26..−30 | |
| Chapter-card floor | −27 to −57 dB | |
| Loudness | about −14 LUFS integrated | |

## Hook patterns (structure only)

- Shock number + time frame: "[company] lost [$N] in [time]." (2/5)
- Introduce + problem: "This is [name]. And [name] has a huge problem." (2/5)
- In-scene, present tense: "In [place], [person] is [doing X]." (1/5)

The first caption runs 0.9–3.0 s. The hook line ends by 3–10 s.

## Transitions

Hard cuts are the default (77–98%). Whip pans: 1–9 per 3 minutes, 7–10 frames each with heavy motion blur. White flash (1–2 frames): 0–4 per 3 minutes, used into the title card and for "snap" moments. No dissolves in a short open.

## On-screen text

- Typing cards: pure black, one line (two at most) of upright white hand lettering, centred at x 50%, y 47%, text height 7–10% of the frame. The narrator's own words at that moment. 124 px Patrick Hand in this engine (phone-readable).
- Chapter card: same black, text appears whole, 136 px, held 1.9–2.2 s.
- On picture: comic capitals in white, yellow or red for numbers, place/date tags and labels. No burned-in subtitles.
- Upright fonts only. No italic or slanted type, no rotated labels (a fix round on the approved build).
