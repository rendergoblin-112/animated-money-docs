# 3. The script and the title question

The script is `script.json`: one entry per voiced line, in order. A "line" is one TTS call: the narrator usually has 4 lines (hook, setup, stakes, title question) and each skit line is its own entry.

```json
{ "id": "NA", "speaker": "narrator", "facts": ["F1", "F2", "F3"],
  "text": "[curious] On August first, 2012, Knight Capital lost more than four hundred and sixty million dollars... in about forty-five minutes.",
  "take": { "audio": "vo/NA_will_cur.mp3", "align": "vo/NA_will_cur.align.json", "tempo": 1.08, "gap": 0.0 } }
```

## Writing rules

1. **Write to the beat map** (01). Hook (1 sentence), setup (3–4 short sentences), skit (2–5 lines), stakes (2–4 short sentences), title question (1 sentence starting "So").
2. **Count it.** 148–179 words/min after assembly. A 35 s open holds about 95–105 words in total. The narrator lines get sped up 1.08–1.10× (atempo, pitch kept), so write for the pace, then time-stretch.
3. **6–7 words per clause.** Each clause is a cut point. Put a comma or full stop where you want a cut.
4. **Spell every number out** in `text` exactly as it should be said ("four hundred and sixty million", "eight-oh-one", "ninety-seven"). The typing cards and counters show digits; the voice reads words. Spelled-out numbers also make the lip sync and the word anchors work.
5. **Delivery tag first** for the narrator: `[curious]` (see 08-voices). Never in skit lines unless you've tested it.
6. **Ellipsis for a beat.** "…dollars... in about forty-five minutes." gives a natural breath before the typing card. `script.json` "special" can cap or remove a pause after one word: `["NA", "dollars", 0.16]`.
7. **The words on the typing cards are the narrator's words**, said at that moment. Choose clauses that read well alone: "in about 45 minutes." / "Power Peg disabled."

## The skit

- Two recurring characters (default: Dot, high and eager; Gus, low and deadpan). 1–8 words a line.
- Line 1 reacts to the number just said: repeat it as a question ("Ninety-seven emails?").
- Line 2 confirms it flatly, with a fact already in FACTS.md ("They all say 'disabled.'").
- Line 3 (optional) is the punchline: a confident misreading the narrator immediately corrects ("Oh. So it's off, then." → "It wasn't.").
- The narrator comes back within 0.1 s of the punchline. The correction is the first word of the stakes.
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
- [ ] Words/min 148–179 after `voice_build.py`.
- [ ] Nothing in the skit adds a fact; no real person is voiced.
