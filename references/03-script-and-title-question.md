# 3. The script and the title question

The script is `script.json`: one entry per voiced line, in order. A "line" is one TTS call: the narrator usually has 4 lines (hook, setup, stakes, title question) and each skit line is its own entry.

```json
{ "id": "NA", "speaker": "narrator", "facts": ["F1", "F2", "F4"],
  "text": "[curious] On December eighth, 2005, Mizuho Securities swapped two numbers. That mistake would cost at least twenty-seven billion yen.",
  "take": { "audio": "vo/NA_will_2.mp3", "align": "vo/NA_will_2.align.json", "tempo": 1.0 } }
```

## Writing rules

1. **Write to the beat map** (01). Hook (1 sentence), setup (3–4 short sentences), skit (2–5 lines), stakes (2–4 short sentences), title question (1 sentence starting "So").
2. **Count it: about 85–90 words in total** for a 36–40 s open (narrator ~70–75, skit ~14). Assembled with real pauses and no time-stretch (08), that's 150–170 words/min. **Too long? Cut words, never speed.** Let the screen carry what the voice needn't say: a fact on a tag or in a skit line doesn't need the narrator too (J-Com: "More than forty-one times all J-Com's shares" left the narrator; the tag shows it and Dot says "Forty-one times the whole company?"). The J-Com fix went from 106 to 89 words.
   Write it the way a person says it: short sentences, "That mistake would cost…" rather than "First damage estimate:", no colon lists. Reuse the source's own verbs where they're natural (Mizuho: "would cost the firm at least 27 billion yen").
3. **6–7 words per clause.** Each clause is a cut point. Put a comma or full stop where you want a cut.
4. **Spell every number out** in `text` exactly as it should be said ("four hundred and sixty million", "eight-oh-one", "ninety-seven"). The typing cards and counters show digits; the voice reads words. Spelled-out numbers also make the lip sync and the word anchors work.
5. **Delivery tag first** for the narrator: `[curious]` (see 08-voices). Never in skit lines unless you've tested it.
6. **Pauses come from the punctuation and the assembly**, not from tricks: a full stop gets a 0.35–0.6 s pause, a comma keeps what the voice gave it (08). Don't put an ellipsis or a pause right before a number. `script.json` "special" can cap the pause after one word: `["NA", "dollars", 0.16]`.
7. **The words on the typing cards are the narrator's words**, said at that moment. Choose clauses that read well alone: "in about 45 minutes." / "Power Peg disabled."

## The skit

- Two recurring characters (default: Dot, high and eager; Gus, low and deadpan). 1–8 words a line.
- Line 1 reacts to the number just said: repeat it as a question ("Ninety-seven emails?").
- Line 2 confirms it flatly, with a fact already in FACTS.md ("They all say 'disabled.'").
- A skit line can carry a fact that's on screen at that moment, so the narrator doesn't have to say it. Tag the line with that fact and keep the exact wording on screen (Dot's "Forty-one times the whole company?" over the tag "MORE THAN 41 TIMES ALL J-COM SHARES").
- Line 3 (optional) is the punchline: a confident misreading the narrator immediately corrects ("Oh. So it's off, then." → "It wasn't.").
- The narrator comes back right after the punchline (a normal hand-off pause, 0.3–0.5 s). The correction is the first word of the stakes.
- No new facts (02). Tag skit lines with the fact they repeat, or `D`.

## The title question

- Always a question, always starting **"So …"**: "So how does one missed server cost more than four hundred and sixty million dollars?"
- It restates the hook's number and the setup's mechanism in one sentence, and doesn't answer it.
- It is the last narrator line. It types out on a black card while it's said (`type: "card"` with the line's words; `"$460 "` can stand for "four hundred and sixty").
- The **title card** right after is the short form of the question in capitals, 2 lines, key phrase last on a red box: `HOW ONE SERVER / LOST $460 MILLION`.
- The **chapter card** names the first chapter of the body, in sentence case, like a book chapter: "The Code That Stayed Behind".

## Script review checklist

- [ ] Every line has `facts` tags; every tag is in FACTS.md.
- [ ] Hook names a company/person or a dollar figure and a time frame.
- [ ] Skit starts between 19 and 29 s once assembled (check with `editcheck.py`).
- [ ] The title question starts with "So" and is in the last 35% of the open.
- [ ] 150–170 words/min after `voice_build.py`, every take at tempo 1.0 and unshifted, every pause in band (no `!!`).
- [ ] Nothing in the skit adds a fact; no real person is voiced.
