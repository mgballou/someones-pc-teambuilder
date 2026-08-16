# Someone's PC — Design

**Status:** approved · **Date:** 2026-08-16

A team-building planning companion for competitive Pokémon.

---

## 1. What this is, and what it replaces

Three earlier versions exist, all from 2023. `Someones-PC` was Express + EJS + Mongo with Google
OAuth. `api-someonespc` and `react-someones-pc` split that into a REST backend and a Vite
frontend. All three modelled a Pokémon as:

```js
{
  ;(name, dexNumber, sprite, nickname, type1, type2, abilities, stats, heldItem, nature)
}
```

There are no moves in that model. No EVs, no IVs, no format, no level. The planning documents
list "Setting EV's and IV's, movesets, held items" as a _stretch goal_, below "shiny sprites",
"favourite pokemon as avatar", and "have the colorset match user's avatar".

That is the diagnosis. The old app was a Pokédex scrapbook with a login. Contributors treated
the subject as a children's game and built accordingly: a 1-in-10 roll for a shiny sprite, a
type-colored navbar, share buttons, comments. None of it helps anyone build a team.

**This version is a tool.** The audience is the late-teen and adult competitive scene — VGC and
Smogon singles. Everything in §Tone of `CLAUDE.md` follows from that.

---

## 2. The core idea: the Box and the Bench

The name is worth keeping, and it maps onto something genuinely useful.

**The Box** is a personal library of saved sets. Not a team — a shelf. You build a spread once
and reuse it across a dozen teams. This is the piece every competitive builder ends up
maintaining by hand in a text file, and it is exactly what a "PC" is for.

**The Bench** is where one team is built. Six slots, the format's rules applied live, and the
analysis panels reading the team as it stands.

Sets are **copied**, not referenced, on the way between the two. A set pulled from the Box into
a team is a snapshot; editing it on the team does not reach back into the Box, and vice versa.
The alternative — shared references — means editing one team silently changes another, which is
the single worst thing a builder can do to someone.

```
   BOX                      BENCH
   ┌──────────┐   copy in   ┌─────────────────┐
   │ saved    │ ──────────► │ Team · Reg H    │
   │ sets     │ ◄────────── │ 6 slots         │
   │ (shelf)  │   save out  │ + analysis      │
   └──────────┘             └─────────────────┘
```

---

## 3. Architecture

```
packages/core/     domain types, calculator, analysis, Showdown I/O. pure.
packages/dex/      PokéAPI client, ingest pipeline, built dataset.
apps/web/          Next.js 16, React 19, Postgres via Drizzle, Auth.js.
```

Dependencies flow **web → dex → core**.

### 3.1 Why the core is pure

`packages/core` has no clock, no ambient randomness and no I/O, enforced by lint. Three things
fall out of that:

- Every calculator test is a plain assertion against a fixture. No mocks, no flake.
- The damage calc returns **all sixteen rolls** rather than one, because it cannot roll dice.
  That turned out to be the right interface anyway — "0 to 6 rolls to KO" is the answer a player
  wants, and a single number never was.
- The analysis panels can run on the client, on the server, or in a test, unchanged.

### 3.2 Why `Dex` is an interface in `core`

`core` declares the data it needs; `dex` supplies it. The calculator is therefore testable
against a nine-species fixture rather than a 1,351-form dataset, and nothing in the domain layer
knows PokéAPI exists.

### 3.3 Why the dataset is built, not fetched

PokéAPI is free and generous, and it is also ~1,351 forms × several requests deep. Fetching that
at runtime would be slow, rate-limited, and would make the app useless offline and untestable in
CI.

`pnpm ingest` walks PokéAPI once, validates every response with zod, normalizes it into the
domain types, and writes a compact dataset into `packages/dex/data/`. The dataset is committed.
The app reads it synchronously at startup. Re-running ingest is how the app learns about a new
generation.

### 3.4 Why there is a database

Teams belong to a person and follow them across devices. Postgres via Drizzle, Auth.js for
sessions. The schema is small: `users`, `teams`, `sets`, `box_entries`.

A reviewer must still be able to clone and run this. `docker compose up -d db` plus
`pnpm db:push && pnpm db:seed` is the whole setup, and the seed writes a demo account with three
real teams in it.

---

## 4. Format as a first-class dimension

A `Format` declares its own rules: team size, what you bring, the level rule, which gimmick
exists, its clauses, and its legality ruleset. **No function anywhere reads a format id and
branches on it.** Adding a regulation is a data change.

Shipping:

| Format             | Style   | Team | Bring | Level | Gimmick  |
| ------------------ | ------- | ---- | ----- | ----- | -------- |
| VGC Regulation H   | doubles | 6    | 4     | 50    | Terastal |
| VGC Regulation I   | doubles | 6    | 4     | 50    | Terastal |
| VGC Regulation G   | doubles | 6    | 4     | 50    | Terastal |
| Smogon Gen 9 OU    | singles | 6    | 6     | 100   | Terastal |
| Smogon Gen 9 Ubers | singles | 6    | 6     | 100   | Terastal |
| Unrestricted       | either  | 6    | 6     | 100   | Terastal |

Legality uses two mechanisms because real formats use both: **category bans** (Regulation H bans
every legendary, mythical and paradox at once) and **name bans** (Smogon tiers ban one Pokémon
at a time). Regulation G additionally allows two _restricted_ legendaries, which is a cap, not a
ban.

**Legality is curated.** PokéAPI has no tiers. Every format carries a `source` — authority,
citation, and the date it was last verified — and the interface shows it next to every verdict.

---

## 5. The analysis layer

Four panels, all pure functions of `(team, format, dex)`.

**Damage calculator.** Gen 9 formula, integer-exact. Sixteen rolls, spread reduction, crits,
STAB including Tera and Adaptability, weather, terrain, screens, burn, and a curated registry of
items and abilities. Anything outside the registry is reported as unmodelled rather than
silently ignored.

**Speed tiers.** Where each member sits on a ladder against the format's common benchmarks, with
modifiers applied — Choice Scarf, Tailwind, Booster Energy, +1, and the paralysis halving.

**Type coverage.** Offensive: what your actual movesets hit, and what nothing on the team touches
for super-effective damage. Defensive: the six-by-eighteen grid, with shared weaknesses called
out. "Four of your six take double from Ground" is the check this exists for.

**Legality.** Every violation named, with the rule that produced it and the source of that rule.

---

## 6. Interface

Direction: **the PC box, taken seriously.** Physical panels, a tactile slot grid, a tight
palette, monospace numerics. The nostalgia is structural — box chrome, slot borders, the
prev/next box header — and never written into the copy.

Navigation is two levels. Top level: **Box**, **Teams**, **Formats**. Inside a team, a subnav
across **Build**, **Damage**, **Speed**, **Coverage**, **Legality** — the team header stays put,
the panel changes.

The manipulation requirements drive the build screen:

- Drag to reorder within a team, keyboard-reachable alternative on every slot.
- Duplicate a set in place, one action.
- Copy or move a set to another team from the set's own menu, with the target chosen in an
  overlay.
- Save a set to the Box, and pull from the Box into a slot.
- Quick edits — nature, item, a single EV — inline on the set card, without opening a page.

Full rules in `docs/ui-sensibility.md`, which is normative.

---

## 7. What this does not do

Deliberately out of scope, so the tool stays honest about what it knows:

- **No usage statistics.** No "43% of teams run this". The app has no such data and will not
  invent it.
- **No teambuilding suggestions.** It does not recommend a sixth member. It shows you what you
  have built and what is missing from it; the judgement is yours.
- **No battle simulation.** It calculates; it does not play.
- **No move legality by method.** Egg chains, event moves and version exclusives are not
  modelled, and the move picker says so.
- **No social layer.** No comments, no likes, no public feed. Teams export as a Showdown paste,
  which is how this ecosystem already shares.
