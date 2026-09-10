# Review answers — 2026-09-01

Screens captured by `laila/scripts/review.py` from `review/someones-pc.json`, answered by Matthew.

| #   | Screen     | Question                                        | Answer       |
| --- | ---------- | ----------------------------------------------- | ------------ |
| 1   | landing    | Does this page say what the tool does?          | **clear**    |
| 2   | teams      | Can you tell the three teams apart at a glance? | **yes**      |
| 3   | bench      | At this width, is the slot grid readable?       | **readable** |
| 4   | set-editor | Would you edit a spread on this screen?         | **yes**      |
| 5   | damage     | Are the sixteen rolls easy to read here?        | **easy**     |
| 6   | speed      | Does the ladder show where your team sits?      | **yes**      |
| 7   | coverage   | Is the type grid usable at phone width?         | **usable**   |
| 8   | legality   | Do the named violations tell you what to fix?   | **yes**      |
| 9   | box        | Does the empty Box tell you what to do next?    | **yes**      |
| 10  | formats    | Is it obvious the rules were checked by hand?   | **buried**   |

All ten answered. Screen 6 came back separately on the evening of 1 September — _"someones pc item 6 the answer is yes, it shows."_

## What he wrote beside the one-word answers

Three screens came back with an instruction attached rather than only a word.
His words, verbatim, with the word each was recorded under:

**1 — landing, recorded as `clear`.** _"overall yes. Coverage change to
'visualize Offensive and Defensive type effectiveness', remove 'nothing is
locked in here'."_ Two edits to the landing copy: the Coverage blurb takes that
exact sentence, and the phrase "nothing is locked in here" comes out wherever
it appears.

**4 — set-editor, recorded as `yes`.** _"yes, but moves need a UI rework around
special physical status and the power of moves and what not."_ He would edit a
spread on this screen, and the move rows are the part that needs redesigning:
the physical/special/status split and a move's power are not carrying their
weight. This is a design task, not a copy fix.

**10 — formats, recorded as `buried`.** _"move the date it was checked into the
key value table at the top (last verified: date time)."_ The hand-check date is
currently somewhere it does not read. It belongs in the key/value table at the
top of the page, labelled `Last verified:` with the date and the time.

He offered no word on 10 — `buried` is Laila's reading of an instruction that
only makes sense if the date is hard to find. If that reading is wrong, the
answer to change is 10 and nothing else.

**6 — speed, answered separately.** _"Does the ladder show where your team
sits?"_ — _"the answer is yes, it shows."_ Answered on the evening of
1 September, after the sheet was first written. Nothing to change on that
screen.

## The fixture these screens were captured against

`pnpm db:seed` does not reproduce it, and running it destroys it. Three things
to know before anyone runs it again:

- **The seed writes six members into Reg H Rain. The review needs seven.** The
  seventh is a hand-made duplicate of the Pelipper at slot 02, and it is the
  only reason the team breaks three clauses at once — over team size, Species
  Clause, Item Clause. Seeded alone, the legality screen has nothing to show.
- **`pnpm test:e2e` leaves a duplicate behind.** `a set duplicates in place`
  duplicates the first card of Reg H Rain and never removes it, so every run
  adds an eighth member.
- **The seed generates fresh uuids.** `review/someones-pc.json` and
  `review/still-frames.json` pin the team and set ids in their paths, so a
  reseed 404s every screen below the team level.

The pinned ids, for restoring by hand: team `bdc4eece-3279-4968-b0ac-bd3ada1e2021`
is Reg H Rain, `12ed4e65-8f14-4e9a-9fa3-c3f3073bc54b` is OU Balance,
`099d1ec7-d3f6-4d2b-b964-63bac0086f79` is Reg G Miraidon; set
`866c3c78-4cf4-415d-b3fb-b5836d2d2f96` is the duplicate Pelipper the set-editor
screen opens.
