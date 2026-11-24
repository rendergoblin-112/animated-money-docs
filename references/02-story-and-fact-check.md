# 2. Picking a story and fact-checking it

## What makes a good money story for a cold open

- **One shocking number with a time frame.** "$460 million in 45 minutes." "610,000 shares at one yen." If you can't say the hook in one sentence with a number, pick another story.
- **A mechanism a viewer can picture.** A missed server, a typo in a quantity box, a cancel button that didn't work. The setup needs 5–7 drawable shots.
- **A strange detail the skit can react to.** 97 warning e-mails nobody read. Selling 41 times more shares than exist. The skit is built on it.
- **A question left open.** The cold open ends on "So how / why …?" The body of the video answers it, so the open must not.
- **Documented in public sources.** A regulator's order, a court ruling, a company statement, or wire/newspaper reports. If the key numbers are only on forums, skip it.

## The fact sheet (FACTS.md) comes before the script

Every project has a `FACTS.md`. Nothing goes in the script, on a label, a counter, a screen, a tag or the title card unless it is in this table.

| Tag | Fact as the video says it | Exact quote from the source | Source (publisher, date, URL) |
|---|---|---|---|
| F1 | "lost more than 460 million dollars" | Knight "lost over $460 million" | SEC order 34-70694, 16 Oct 2013, https://www.sec.gov/... |

Rules:
1. **One fact, one tag, one quote, one URL.** The quote is copied word for word. If you are paraphrasing a number, the quote must contain that number.
2. **Round only downward and say so.** "over $460 million" can become "more than 460 million", never "nearly half a billion". A "$460 MILLION" title card is a floor, never rounded up.
3. **When sources disagree, pick one and say whose number it is.** Example: one report gives 600,000 shares, the firm's own statement says 610,000. Use the firm's own words and note the other figure in FACTS.md.
4. **Time-stamp estimates.** A first estimate ("at least ¥27 billion" the next day) and a later figure (¥40.7 billion) are different facts with different dates. Say which one you mean ("first estimate…", "later…").
5. **Arithmetic is allowed only from tagged numbers, and is tagged as such** (e.g. "F3 ÷ F2"). Don't invent a derived number the sources don't support.
6. **Every line of the script lists its tags** (`script.json` "facts": ["F1", "F2"]). Dramatised framing gets the tag `D`.

## Dramatised lines (the skit, metaphors) may not add facts

- Skit lines react to a fact already said ("Ninety-seven emails?") or misread it for the joke ("Oh. So it's off, then."). They never introduce a new number, name, date, motive or claim.
- Metaphors ("and it woke up") are tagged `D` and must sit next to the fact they dramatise.
- The skit characters are commentators, not participants. They never play a real person, and their lines must not put words in a real person's mouth.

## People: no likeness, unnamed stays unnamed

- **No real person's likeness.** Real people involved in the story are drawn anonymously: from behind (the `tech` design in the default cast), at a distance, or as hands on a keyboard. No caricature of a named executive either.
- **If the sources don't name someone, the video doesn't either.** "A trader", "one technician". Don't guess, don't give them a made-up name, don't show a name badge.
- **Companies and institutions can be named** when the sources name them, as text (signs, labels, screens). Don't copy their logos or branding: write the name in the engine's own lettering.
- Personified things (old code as a sleepy computer creature) are fine as long as they stand for something in the facts.

## Checklist before writing the script

- [ ] Every number on the beat map has a tag in FACTS.md with a word-for-word quote and a working URL.
- [ ] The hook number, the setup numbers, the skit's reaction number and the title-card number are all tagged.
- [ ] Unused facts are listed at the bottom of FACTS.md "for the body of the video" (so nobody squeezes them into the open).
- [ ] Every person in the story is either named by the sources or kept anonymous.
- [ ] On-screen text list: every label, sign, screen line and counter, each with its tag.
