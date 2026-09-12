# Someone's PC

A team-building planning companion for competitive Pokémon. You author **sets**, arrange them
into **teams** under a **format**, and the app tells you what you built — damage rolls, speed
tiers, coverage gaps, and whether it is legal where you intend to play it.

**Read `docs/specs/2026-08-16-someones-pc-design.md` before starting work.** It holds the
design, the decisions and their reasons. This file holds only how to write code here.

The audience is the adult and late-teen competitive scene. Every interface decision serves
the competitive player. See §Tone.

---

## Commands

```bash
pnpm install
pnpm setup          # install + start postgres + push schema + seed
pnpm dev            # web app, localhost:3000
pnpm test           # vitest, all packages
pnpm test:watch
pnpm test:e2e       # playwright
pnpm typecheck      # tsc --noEmit across the workspace
pnpm lint           # eslint + prettier check
pnpm fix            # eslint --fix + prettier --write
pnpm check          # typecheck + lint + test. run before every commit.
pnpm ingest         # rebuild the dataset from PokéAPI
```

---

## Layout and dependency direction

```
packages/core/     domain types, the calculator, analysis, Showdown I/O.
                   pure. no DOM, no React, no I/O, no clock, no randomness.
packages/dex/      the PokéAPI client + the ingest pipeline + the built dataset.
                   the only package that knows an HTTP request exists.
apps/web/          Next.js 16 + React 19. auth, Postgres, the box, the bench.
```

Dependencies flow one way: **web → dex → core**.

`core` never imports `dex`. It declares the `Dex` interface it needs (`core/src/dex.ts`) and
`dex` implements it. That inversion is what keeps the calculator testable against a hand-built
fixture instead of a 1,351-form dataset.

---

## The core's four rules

Load-bearing. Breaking any one costs more than it saves.

1. **No `Date.now()`, no `Math.random()`, no I/O inside `packages/core`.** Enforced by lint.
   A damage roll takes its randomness as an explicit roll index (0–15), which is why the calc
   returns _all sixteen_ rolls rather than one, and why every calc test is a plain assertion.

2. **A `PokemonSet` is data, and only data.** No methods, no class. It serializes to JSON,
   round-trips through a Showdown paste, and survives a schema bump. Anything that wants to
   _do_ something with a set is a function that takes one.

3. **Format is a parameter, never a branch.** No function anywhere reads a format id and
   switches on it. A `Format` declares its team size, its level rule, its gimmick, its clauses
   and its legality; callers ask the format. Adding Regulation J must be a data change.

4. **Integer maths is exact.** Every `Math.floor` in `stats.ts` and the damage chain matches the
   games. Never "simplify" one into a round, never reorder two. A stat that is one point wrong
   is a calculator that lies.

---

## TypeScript

- `strict: true`, plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
- **No `any`.** `unknown` at boundaries, narrowed immediately. No `as` casts except where a
  type guard genuinely cannot express it, with a comment saying why.
- **Discriminated unions over string flags.** An item effect is
  `{ kind: 'choice', … } | { kind: 'life-orb' }`, never `{ type: string }`. Exhaustive `switch`
  with a `never` default.
- **Branded ids.** `SpeciesId`, `MoveId`, `ItemId`, `AbilityId`, `FormatId`, `SetId`, `TeamId`.
  Passing a move id where a species id belongs must fail typecheck.
- **`as const` for every literal set**, so ids are unions of literals.
- **`readonly` on every domain field and array.** The domain is immutable; the only mutation in
  the codebase is React state and the Drizzle query builder.
- **Object parameters once a function takes three or more arguments.** Two or fewer stay
  positional.
- **No default exports** outside Next.js's required ones, which lint carves out.
- **No barrel re-exports across packages** beyond each package's `src/index.ts`.
- **Errors are typed classes with a static factory**: `MissingFromDex.species(id)`. Never
  `throw new Error('...')` with a hand-written string.
- **Zod validates every PokéAPI response at the boundary**, once, in `packages/dex`. Nothing
  downstream re-checks shapes.

---

## Naming

| Concept              | Pattern                                | Example                                  |
| -------------------- | -------------------------------------- | ---------------------------------------- |
| Pure domain function | verb                                   | `calculate`, `validate`, `parse`         |
| Selector             | noun or `verbNoun`, pure and read-only | `baseStatTotal`, `evsRemaining`          |
| Predicate            | `canX` / `isX` / `hasX` / `allowsX`    | `isSpreadMove`, `hasClause`              |
| Type                 | noun                                   | `Species`, `PokemonSet`, `DamageResult`  |
| Report from a check  | `{X}Report`                            | `LegalityReport`, `CoverageReport`       |
| Client impl          | `{Which}PokeApiClient`                 | `LivePokeApiClient`, `FakePokeApiClient` |
| Typed error          | `{Reason}` + static factory            | `MissingFromDex.species(id)`             |
| React component      | noun of what it shows                  | `BoxGrid`, `SetCard`, `SpeedLadder`      |
| Hook                 | `use{Noun}`                            | `useTeam`, `useCalc`                     |
| Server action        | `{verb}{Noun}`                         | `createTeam`, `duplicateSet`             |
| Test file            | mirrors the source path                | `src/damage.ts` → `test/damage.test.ts`  |

---

## Testing

Vitest. Tests mirror source paths.

- **Never mock the core.** It is pure and fast. Build real sets from fixtures.
- **The damage calculator is tested against known values**, taken from the published formula
  and cross-checked by hand. A calc test asserts a _range_ of sixteen rolls, not one number.
- **Prefer a property to three examples.** Properties worth pinning: a set's computed stats
  never exceed the level-100 maximum; a Showdown paste round-trips to an identical set; a
  team legal in a format stays legal after a reorder; spread damage is never more than
  single-target damage.
- **`FakePokeApiClient` backs every dex test**, so the network is never a test dependency.
- **No comments in tests** unless the test is genuinely unusual.
- One assertion per `expect`.

---

## Interface

`docs/ui-sensibility.md` is normative for everything in `apps/web`. Read it. The direction is
**the PC box, taken seriously** — physical panels, a tactile slot grid, a tight palette,
monospace numerics. Nostalgic in structure, adult in execution. The rules most easily broken:

- **One primary action per region.** Navigation never takes the accent.
- **Nothing rebuilds to show that it is loading.** Placeholders in place, sized to content.
- **No raw values outside the token definitions.** Semantic names only — `surface`, `line`,
  `accent`. Never `zinc-800`, never `#e8563f`.
- **Type colors are data, not decoration.** A type badge is colored because the color _is_ the
  type. Nothing else on the page borrows those eighteen hues.
- **Every terminal state names what happens next.** The empty box is the highest-leverage
  screen in the app.
- **Numbers are tabular.** Stats, damage rolls and speed tiers align in a column or they are
  unreadable.

---

## Tone

The audience is doing work, and the app should read like a tool they reached for, not a game
they are playing.

- **Never gamify.** No XP, no badges, no streaks, no achievements, no unlockables, no
  celebration animation when a team is finished. The person is doing work.
- **Never surprise.** No random shiny rolls, no easter eggs that change data. A tool that
  sometimes shows a different sprite than the one you chose is a tool you cannot trust.
- **Sprites are identification, not decoration.** They exist so you can find a Pokémon at a
  glance in a grid of thirty. They are never the point of a screen.
- **Copy is plain.** "4 of 6" not "Your team is coming along!". No exclamation marks. No
  second person cheerleading. Say what is true.
- **The nostalgia is structural.** The box, the slot grid, the panel chrome. It is never
  written into the copy.
- **These are build rules, not public copy.** They decide what gets made. They never appear in
  the README, the docs or the interface as a position the app is arguing for, and never as a
  contrast against earlier versions or the people who built them. Say what the app does, not
  what it refuses to do.

---

## Honesty rules

This app makes claims about a competitive game. Several are approximations, and the code says so.

- **Legality is curated, not derived.** PokéAPI has no concept of a tier or a regulation. Every
  `Format` carries a `source` with an authority and a `verifiedOn` date, and the interface shows
  it next to every legality verdict. Never write copy implying legality is authoritative or live.
- **Learnsets are by-generation, not by-method.** The dataset knows Garchomp can learn
  Earthquake in Gen 9, and it folds in what a Pokémon's pre-evolutions learn, because a Pokémon
  keeps what it knew before it evolved. It does not model breeding chains, version exclusivity,
  or event-only moves. The move picker says so.
- **The damage calculator models a curated set of abilities and items.** Anything outside the
  model is `{ kind: 'unmodelled' }` and the result carries a note naming what it did not
  account for. A calculator that silently ignores Adaptability is worse than one that says it
  cannot.
- **Two abilities are settled by convention, and the conventions are these.** They are what is
  left after the calculator was checked match-up by match-up against `@smogon/calc`, and each
  is a decision rather than a gap.
  - **Intimidate is assumed to have triggered.** A defender carrying it takes a stage off the
    attacker's Attack on every calculation, and the result says so and tells the caller to clear the
    stage from the attacker's boosts if it is already counted there. The reference leaves it off
    until it is switched on by hand. This calculator has no turn and no switch-in, and the question
    a team builder is asking is what happens after the switch, so the stage is applied. Never make
    it silent, and never make it turn on a turn count the core cannot hold. The attacker's own
    ability decides what the stage becomes, and the calculator applies it and says so: Simple
    doubles it, Contrary reverses it, Defiant and Competitive answer it with two stages of their
    own, Clear Body, Inner Focus, Own Tempo and Oblivious block it, and Guard Dog turns it into a
    raise. `stage-change.ts` runs them in the games' order, which decides one corner: an attacker
    already at -6 Attack cannot be lowered, so Defiant, Competitive and Guard Dog have nothing to
    answer. The reference answers anyway and reads -5. A Mold Breaker attacker does not stop it:
    Mold Breaker reaches the execution of a move and Intimidate happened on entry, so the stage
    stands. Hyper Cutter, White Smoke, Full Metal Body, Mirror Armor and Scrappy also stop
    Intimidate in the games, are outside the ability model, and arrive with their own note saying
    so.
  - **A Ruin ability does not touch a Pokémon carrying the same Ruin ability.** Sword of Ruin
    "decreases the Defense stat of all Pokémon on the field other than Pokémon with this
    Ability by 25%" and "does not stack if more than one Pokémon with Sword of Ruin is on the
    field" (Bulbapedia). Chi-Yu facing Chi-Yu is a match-up in which neither Beads of Ruin does
    anything, and the same holds for the other three. It reads like a convention and is not
    one — it is the rule, and the reference has it right.
- **Speed tiers are computed from the dataset, not from usage statistics.** The app has no
  usage data. A benchmark is "max-speed Jolly Garchomp", never "the 43rd most used lead".

---

## Anti-patterns

- ❌ `Date.now()` or `Math.random()` anywhere under `packages/core`.
- ❌ Reading a format id and branching on it.
- ❌ `core` importing `dex`, or either importing from `apps/web`.
- ❌ A calc test that hits the network or imports the real dataset.
- ❌ Business logic in a React component, a hook, or an event handler. Components render state
  and dispatch intents; server actions are thin shells over core functions.
- ❌ `any`, a default export outside Next's required ones, or a stringly-typed id.
- ❌ Re-validating a shape downstream of the zod boundary.
- ❌ A raw color, measure or duration outside the token definitions.
- ❌ Treating a form as its base species. Landorus-Therian is not Landorus.
- ❌ Copy that gamifies, congratulates, or hides an approximation.

---

## Git

- Branch off `main`. Never commit to `main` directly.
- Commit messages: imperative, one line, no trailers, **no AI attribution**.
- Run `pnpm check` before every commit.
- PR descriptions follow the format in the global `CLAUDE.md`.
