# Interface Sensibility

**The front-end bar for Someone's PC.** How a person moves through this app, and what it owes
them at every step. Normative for everything in `apps/web`.

> **How to read this:** every section is normative. "Prefer", "always", "never" are deliberate.
> Where two rules collide, the more specific one wins. Section numbers are stable — source files
> cite them by number, so a section may be rewritten but never renumbered.

`CLAUDE.md` holds how to write code here. The design spec holds what the app does. This holds
what the code has to produce.

---

## 0. The bar, in one page

Three earlier versions shipped **Level 0** and called it an interface. Level 0 is real work and
it is not enough. **Level 1 is the bar.**

|            | **Level 0 — it works**                        | **Level 1 — the bar**                                                     |
| ---------- | --------------------------------------------- | ------------------------------------------------------------------------- |
| Flow       | Pages: teams index, team show, pokemon edit.  | A bench. The team and its consequences on screen together.                |
| Landing    | A hero and a Sign Up button.                  | A box with teams already in it, and one obvious next move.                |
| Unit       | A Pokémon row.                                | **The set.** Species plus spread plus moves, judged as one thing.         |
| Actions    | Add, Edit, Delete, Save, all equal.           | **One primary per region.** Everything else is quiet.                     |
| Feedback   | Save, then reload to see the result.          | Analysis updates as you edit. The calc says what it did not model.        |
| Dead ends  | "No pokemon found."                           | Every empty state names the one thing to do and offers it.                |
| Color      | A type-colored banner, because Pokémon.       | Eighteen hues reserved for type identity. Nothing else borrows them.      |
| Depth      | A border, sometimes.                          | A named surface stack. Panel, slot, well. Each height is a decision.      |
| Numbers    | `text-sm`, proportional, ragged.              | Tabular figures, aligned, monospace. A stat column you can scan.          |
| Frame      | Routes swap the whole view.                   | A persistent team header. The subnav swaps one panel.                     |
| Waiting    | Spinner over everything.                      | Placeholders **in place**, sized to content. Nothing unmounts.            |
| Tone       | "Your team is looking great!"                 | "4 of 6." The person is working.                                          |

The gap is not polish. Each row on the right is a decision the left column never made.

---

## 1. The six failures

Every rule below exists to prevent one of these.

**1. It reads like a toy.** Sprites everywhere, rounded everything, a congratulatory tone. The
subject is a children's game; the users are adults doing analysis. → **§4, §12**

**2. It reads as pages, not an instrument.** Editing an EV navigates. The coverage grid is
behind a link. You cannot see a change and its consequence at the same time. → **§2, §7**

**3. It buries the thing the person thinks in.** They reason in _the team_ and _what this edit
did to it_. A form that collects fields and shows the verdict on another screen makes them hold
the causal link in their head. → **§2.2, §2.3**

**4. It reads flat.** A heading is body text at a larger size. Thirty numbers at one weight.
Nothing tells the eye where to start. → **§5, §6**

**5. It drives no behavior.** Six equal buttons, so none is the answer. → **§3**

**6. It lies about what it knows.** A legality verdict presented as authoritative when the
banlist was typed by hand. A damage roll that silently ignored an ability. → **§12**

---

## 2. Flow

### 2.1 The Box and the Bench

Two places, and the app is always clearly in one of them.

**The Box** is the library — saved sets and saved teams. It is a grid, it is scannable, and it
is where you start. **The Bench** is one team under one format, with the analysis attached.

Sets **copy** between them. Nothing is shared by reference. A set pulled from the Box into a
team is a snapshot, and the interface says so the first time it happens.

### 2.2 The unit is the set

The person is not picking a species. They are authoring a **set** — species, ability, item,
nature, spread, four moves, Tera type — and that whole object is what gets named, cloned,
saved, pasted and judged. Every card shows enough of it to be recognized without opening it:
species, item, ability, nature, the EV line, four moves.

A species is material the set is made of. It matters, and it is not the unit.

### 2.3 Show the consequence, always

The highest-value thing this interface does is connect an edit to its effect.

- **Analysis updates as you edit.** Change a nature and the speed ladder moves under your hand.
  The engine is pure and local; there is no request to wait on and nothing may pretend there is.
- **Legality is live and specific.** Not a badge saying "illegal" — the violated rule, named,
  with the source of that rule beside it.
- **The team header carries the standing numbers**: members of team size, EVs remaining on the
  focused set, and the count of shared weaknesses. These are the three things people check.
- **Every analysis panel names its own limits.** The calc lists what it did not model. The
  legality panel shows the ruleset's authority and verification date. Always visible, never a
  tooltip.

### 2.4 The manipulation loop is the product

Building six sets means a great deal of copying, cloning and rearranging. This is the loop, so
it gets the best of everything:

- **Duplicate is one action, in place**, and the copy lands directly after the original.
- **Move and copy to another team** live on the set's own menu, with the target picked in an
  overlay. Both say what happened and offer undo.
- **Reorder by drag**, and by a keyboard control on every slot that does the same thing. The
  drag is the accelerant, never the only path.
- **Quick edits happen on the card** — nature, item, a single EV, one move. Opening the full
  editor is for building something new, not for adjusting something built.
- **Every destructive action is undoable** for as long as the view lasts. Deleting a set you
  spent ten minutes on must never be one misclick.

### 2.5 The app holds your place, not you

- **An edit in progress survives a reload.** Someone mid-spread who refreshes has lost nothing.
- **Scroll position is remembered per region** and restored on return.
- **A cursor keys on set id, never on index.** Reordering must not move the selection.
- **A filter that shrinks a list clamps the cursor**, it does not reset it.
- **Returning to a team returns to the panel you left** — if you were on Coverage, you land on
  Coverage.

### 2.6 Sequence decisions; do not flatten them

Adding a set is one decision (which species), then a second (ability, item, nature), then the
spread, then moves. The move picker does not exist until there is a species to learn them.

**An empty slot shows one control, not fifteen.**

### 2.7 A dead end is a bug

Every terminal state names what happens next:

- **An empty Box** — the highest-leverage screen in the app, and the only one where a call to
  action has no competition. It offers a first move: start a team, or paste one in.
- **An empty team slot** — offers the two real paths, a new set or one from the Box.
- **A coverage report on a team with no moves** — says the team has no damaging moves yet,
  rather than drawing an empty grid.
- **A calc with no target chosen** — names the choice, does not show a zero.

"Nothing here" is not a design.

### 2.8 Reversal is part of the flow

- **Every edit is reversible** by changing it back. Nothing about a set is committed elsewhere.
- **Deleting a team is the one irreversible act**, and it confirms once, naming the team.
- **Undo is in reach** for every destructive action for the life of the view.
- **Every control disables together while a confirm is open**, so a second input cannot race it.

### 2.9 Choose the depth of each step

| Depth                      | Costs                            | Use for                                            |
| -------------------------- | -------------------------------- | -------------------------------------------------- |
| **A full-screen takeover** | Changes where you are            | Sign in. Deleting a team.                          |
| **An overlay**             | Borrows attention, gives it back | Picking a species, a move, an item. Choosing a team to move a set to. |
| **An inline reveal**       | Nothing                          | Quick edits on a card. A calc's detail. A violation's explanation. |

**The bench must be actionable without scrolling on a laptop.**

### 2.10 Speed is part of flow

The interface responds to the input, not to the network. 100ms is where an action feels
_caused_ rather than _requested_.

The domain core is pure and runs locally, so **every analysis recomputes instantly**. Only
loading and saving touch the server. **Never round-trip to recalculate.**

### 2.11 Accelerate the repeated path

- **An accelerator is printed on the control it triggers**, so it teaches itself.
- **Everything reachable by drag or shortcut is reachable by a plain control** that does the
  same thing. WCAG 2.5.7, and also just correct.
- **An accelerator never fires while someone is typing.** One guard, checked centrally.
- **Undo is part of the fast path.**

---

## 3. One action per region

Every region answers "what is the one thing to do here" before it is designed. That action
carries the accent; everything else in the region is quiet.

| Region          | The one action        |
| --------------- | --------------------- |
| Empty Box       | Start a team          |
| Box, populated  | Open a team           |
| Empty slot      | Add a Pokémon         |
| Filled slot     | Edit the set          |
| Set editor      | Done                  |
| Damage panel    | Choose the other side |
| Legality panel  | Fix the first problem |

**Navigation never takes the accent.** A nav item is not an action.

---

## 4. Color

### 4.1 Tokens carry jobs, not values

Semantic names only — `surface`, `surface-raised`, `well`, `line`, `line-strong`, `text`,
`text-dim`, `accent`, `danger`, `warn`, `ok`. **Never a raw hex, never a Tailwind palette number
outside the token definitions.**

### 4.2 One accent, and it means _act_

A single accent color across the whole app. It appears on the one primary action per region and
nowhere else. Not on headings, not on nav, not on decoration. If the accent is on screen twice
in one region, the region has two primary actions and the design is wrong.

### 4.3 The eighteen type hues are reserved

Type colors are **data**. A Fire badge is that color because the color _is_ the type — it is how
someone reads a grid of thirty sprites at a glance. Therefore:

- Type hues appear on type badges, in the coverage grid, and on the Tera indicator. **Nowhere
  else.**
- Nothing decorative borrows one. No type-colored headers, no type-colored page backgrounds.
  This is precisely what the old versions did and it is why they read as a toy.
- Type hues must pass contrast against both surfaces they sit on. Where a canonical hue cannot,
  it is darkened for the badge background and the canonical hue is kept for the text or the
  grid cell, never the reverse.

### 4.4 Effectiveness has its own scale

The coverage grid is a diverging scale — resisted, neutral, super-effective — and it must not
reuse the type hues or the accent. It must also carry a **non-color channel**: the multiplier is
printed in the cell (`0`, `¼`, `½`, `2`, `4`). Nobody reads a red-green grid the same way.

### 4.5 Both themes are designed

Light and dark are both first-class. Use `prefers-color-scheme` as the default signal and let an
explicit toggle override it in both directions. The box chrome reads as hardware in both — this
is the hardest part of the aesthetic and it is not optional.

---

## 5. Surface and depth

The aesthetic is **the PC box, taken seriously**: physical panels, real edges, a sense that the
thing has a front face.

A named stack, and every element's height is a decision:

| Surface          | What sits on it                              |
| ---------------- | -------------------------------------------- |
| `page`           | The backdrop behind the chrome                |
| `panel`          | The box body, the bench, an analysis card     |
| `raised`         | A filled slot, a set card                     |
| `well`           | An empty slot, an input, the paste box        |

Rules:

- **An empty slot is a well, not a card.** It is recessed. That is what makes a filled slot read
  as an object sitting in it, and it is the whole reason the grid feels physical.
- **Depth comes from a line plus a one-step surface change**, not from a soft shadow. Shadows
  are for things that genuinely float — overlays, drag ghosts, nothing else.
- **Edges are crisp.** Small radii, consistent across the app. The chrome is hardware.
- **A heading owns a surface.** Weight comes from structure, not from `font-size` alone.

---

## 6. Type and numbers

### 6.1 Numbers are tabular, always

Stats, EVs, damage rolls, speed values and percentages use **tabular figures in a monospace
face**, aligned right in a column. A stat column with proportional digits is unreadable and it
is the single most common failure in tools like this.

### 6.2 One formatter per kind of number

Damage ranges, percentages, EV lines and speed values each have exactly one shared formatting
function, used everywhere. A percentage that renders `56.3%` in one panel and `56%` in another
is a bug.

### 6.3 Hierarchy is structural

Three text sizes in the body of the app, not seven. Distinguish by weight, surface and spacing
before reaching for a size.

### 6.4 The set card's typography is the app's signature

It carries species, item, ability, nature, an EV line and four moves in a small space and must
stay scannable. Get this one right and the rest follows.

---

## 7. Frame and navigation

### 7.1 Two levels, and both persist

Top level: **Box**, **Teams**, **Formats**. Inside a team, a subnav across **Build**, **Damage**,
**Speed**, **Coverage**, **Legality**.

**The team header never unmounts.** Name, format, member count and standing warnings stay put
while the panel below changes. Switching from Build to Coverage must not feel like a page load,
because it is not one.

### 7.2 The current position is always legible

Which team, which format, which panel — all readable without scrolling, at every moment.

### 7.3 The subnav carries state, not just labels

A panel with something wrong in it says so on its own tab — a count on Legality, a marker on
Coverage when a weakness is shared by three or more. The person should not have to visit a panel
to learn it needs them.

---

## 8. Waiting

- **Nothing unmounts to show that it is loading.** Placeholders sit in place, sized to the
  content that will replace them, so nothing moves when it arrives.
- **No spinner over a region that already has content.** Fade the region, keep it in place.
- **The analysis never shows a loading state at all**, because it is local and synchronous. If
  an analysis panel ever spins, something has been built wrong.
- **Only the server round-trips get a pending state**: loading the Box, saving, signing in.
- **A save that fails says what failed and keeps the edit.** Never discard a person's work to
  report an error.

---

## 9. Motion

- **Motion explains a change of position**, nothing else. A set moving to a new slot animates
  because it moved. A panel does not animate because it appeared.
- **Nothing bounces.** No spring easing, no overshoot, no celebration. See §12.
- **Reduced motion is designed, not stripped.** Under `prefers-reduced-motion` every transition
  becomes instantaneous, and nothing visible under normal motion goes missing.
- **Drag has a real ghost and a real drop target.** Both are visible from the first pixel of
  movement.

---

## 10. Input and forms

- **The spread editor is the most-used control in the app.** Six stats, an EV slider and a
  number field per stat, remaining EVs shown at all times, and the resulting stat value updating
  live beside each row. Nature's ×1.1 and ×0.9 are marked on the affected rows.
- **A number field accepts typing and never fights the cursor.** No reformatting mid-entry, no
  clamping until blur.
- **Every picker is searchable and keyboard-first.** Species, move, item, ability. Arrow keys,
  Enter, Escape. Typing filters immediately.
- **The move picker shows what matters for the choice**: type, category, power, accuracy — not
  a bare list of names.
- **Validation is inline and immediate**, next to the field, never a summary at the top on
  submit.

---

## 11. Accessibility

- **Contrast is checked against both themes**, including every type hue in both places it is
  used.
- **The coverage grid never encodes meaning in color alone** — §4.4.
- **Every drag has a keyboard equivalent** — §2.11.
- **Focus is always visible**, and focus order follows the visual order.
- **The slot grid is a real grid to a screen reader**, with each slot naming its position and
  contents.
- **Live regions announce the results of an action** — a set duplicated, a team saved, a
  violation resolved.

---

## 12. Honesty and tone

### 12.1 Say what is true

- **Every legality verdict shows its source.** Authority, citation and verification date, next
  to the verdict, permanently. The banlists are hand-maintained and the interface never implies
  otherwise.
- **Every damage result lists what it did not model.** An unmodelled item or ability is named in
  the result, not silently dropped.
- **Speed benchmarks say they are computed from base stats**, not drawn from usage statistics
  the app does not have.
- **The move picker says learnsets are by generation, not by method.**

### 12.2 Never gamify

No XP, no badges, no streaks, no achievements, no progress celebration, no confetti, no
"complete!" state. Finishing a team is not an accomplishment the app gets to have an opinion
about.

### 12.3 Never surprise

No random shiny rolls. No easter eggs that change data. The sprite shown is the one that was
chosen, every time. A tool that is sometimes playful is a tool that is never trusted.

### 12.4 Copy is plain

- "4 of 6", not "Your team is coming along!"
- "Illegal: Flutter Mane is a Paradox Pokémon", not "Oops!"
- No exclamation marks. No second-person cheerleading. No emoji in product copy.
- Name the thing and what to do about it. Then stop.

### 12.5 The nostalgia is structural

The box, the slot grid, the panel chrome, the prev/next header. That is where the reference
lives. It never appears in the writing, and it never overrides a decision that would make the
tool work better.
