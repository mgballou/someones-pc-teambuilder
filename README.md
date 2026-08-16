# Someone's PC

**A team-building planning companion for competitive Pokémon.**

You author **sets**, arrange them into **teams** under a **format**, and the app tells you what
you built: damage rolls, speed tiers, coverage gaps, and whether it is legal where you intend to
play it. Built for VGC doubles and Smogon singles.

It is a tool for adults who play a game for children, and it is never cute about it. There are
no badges, no streaks, no random shiny rolls, and nothing congratulates you for finishing a
team.

---

## What it does

**The Box** is a library of saved sets — the thing every competitive builder ends up maintaining
by hand in a text file. **The Bench** is where one team gets built, six slots under one format,
with the analysis attached.

Sets are **copied** between the two, never shared by reference. A set pulled from the Box into a
team is a snapshot; editing it there does not reach back into the Box. The alternative means
editing one team silently changes another, which is the worst thing a builder can do to someone.

Four analysis panels, all pure functions of the team as it stands:

| Panel        | What it answers                                                               |
| ------------ | ----------------------------------------------------------------------------- |
| **Damage**   | Gen 9 formula, integer-exact. All sixteen rolls, spread reduction, Tera STAB. |
| **Speed**    | Where each member sits against benchmarks, with Scarf, Tailwind and Booster.  |
| **Coverage** | What your moves hit, and what four of your six take double damage from.       |
| **Legality** | Every violated rule, named, with the source of that rule beside it.           |

Teams import and export as Showdown pastes, which is how this ecosystem already shares.

---

## Run it

```bash
pnpm setup          # install, start postgres, push the schema, seed a demo account
pnpm dev            # http://localhost:3000
```

`pnpm setup` needs Docker for Postgres. It seeds an account with three real teams in it:

```
demo@someones.pc / competitive
```

If you would rather point at your own Postgres, copy `.env.example` to `.env.local` and set
`DATABASE_URL`, then run `pnpm db:push && pnpm db:seed`.

### Commands

```bash
pnpm dev            # web app
pnpm test           # vitest, all packages
pnpm test:e2e       # playwright
pnpm typecheck      # tsc --noEmit across the workspace
pnpm lint           # eslint + prettier
pnpm fix            # autofix both
pnpm check          # typecheck + lint + test
pnpm ingest         # rebuild the dataset from PokéAPI
```

---

## How it is built

```
packages/core/     domain types, the calculator, analysis, Showdown I/O. pure.
packages/dex/      the PokéAPI client, the ingest pipeline, the built dataset.
apps/web/          Next.js 16 + React 19, Postgres via Drizzle, session auth.
```

Dependencies flow one way: **web → dex → core**.

**The core is pure** — no clock, no ambient randomness, no I/O, enforced by lint. Three things
fall out of that:

- Every calculator test is a plain assertion against a fixture. No mocks, no flake.
- The calc returns **all sixteen rolls** rather than one, because it cannot roll dice. That
  turned out to be the right interface anyway — "2HKO, 0 to 6 rolls" is the answer a player
  wants, and a single number never was.
- The analysis panels run on the server, on the client, or in a test, unchanged.

**`core` declares the data it needs and never learns where it comes from.** `Dex` is an
interface in `core/src/dex.ts`; `@spc/dex` implements it against the built dataset, and the test
suite implements it against a thirteen-species fixture. That is why the calculator is testable
without loading a thousand forms.

**Format is a parameter, never a branch.** No function anywhere reads a format id and switches
on it. A `Format` declares its team size, level rule, gimmick, clauses and legality; callers ask
the format. Adding a regulation is a data change.

**The dataset is built, not fetched.** `pnpm ingest` walks PokéAPI once, validates every
response with zod, normalizes it into the domain types and writes a compact dataset that is
committed to the repo. The app reads it synchronously. Fetching that at runtime would be slow,
rate-limited, and would make the app untestable in CI.

---

## What it does not know

Several things here are approximations, and the app says so wherever it shows them.

- **Legality is curated, not derived.** PokéAPI has no concept of a tier or a regulation. Every
  format carries an authority, a citation and the date its ruleset was last checked by hand —
  shown next to every verdict, permanently. Check the official rules before a tournament.
- **The damage calculator models a curated set of items and abilities.** Anything outside the
  model is named in the result rather than silently ignored. A calculator that quietly drops
  Adaptability is worse than one that admits it cannot see it.
- **Learnsets are by generation, not by method.** Egg chains, event-only moves and version
  exclusives are not modelled, so the move picker is broader than what one save file can legally
  produce. It says so.
- **Speed benchmarks are computed from base stats**, at maximum investment with a Speed-raising
  nature. They are not usage statistics — this app has none and will not invent any.
- **Coverage reads a move at its printed type.** Tera Blast's type change is not modelled.

Deliberately out of scope: usage statistics, teambuilding suggestions, battle simulation, and
any social layer. It calculates; it does not play, and it does not have opinions about your
sixth slot.

---

## Where this came from

This is the fourth version. The first three are from 2023 and modelled a Pokémon as:

```js
{
  ;(name, dexNumber, sprite, nickname, type1, type2, abilities, stats, heldItem, nature)
}
```

No moves. No EVs, no IVs, no level, no format. The planning documents list "Setting EV's and
IV's, movesets, held items" as a stretch goal, below shiny-sprite RNG, favourite-Pokémon avatars
and a type-colored navbar.

That is the whole diagnosis. It was a Pokédex scrapbook with a login, built by people treating
the subject as a children's game. This version is a tool for the competitive scene that actually
plays it.

---

## License

MIT
