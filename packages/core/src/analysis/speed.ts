/**
 * Speed tiers.
 *
 * Each member's Speed at the format's level, the same number under the
 * modifiers that decide a turn, and a ladder placing the team against the
 * fastest Pokémon the format actually permits.
 *
 * The benchmarks are computed from base stats in the dataset — max investment,
 * a Speed-raising nature, at the format's own level. They are not usage
 * statistics. This app has none, and a "43rd most used lead" it invented would
 * be the most convincing lie it could tell. See the honesty rules in CLAUDE.md.
 *
 * Every multiplier below truncates, as the games do. A Speed one point wrong is
 * a turn order that is wrong.
 *
 * Three things this file used to leave out, and now says out loud:
 *
 * - **Booster Energy needs the ability**, and Protosynthesis needs the sun. The
 *   item on its own does nothing, which the damage calculator already knew and
 *   this panel did not. A trigger is now required, and the field it reads is a
 *   parameter with no weather in it by default.
 * - **A tie is not an ordering.** Two Pokémon on the same number is a coin
 *   flip, and a ladder that prints one above the other is inventing the result.
 *   `ties` names every group sharing a number.
 * - **Trick Room inverts the turn.** `trickRoomLadder` is the same entries the
 *   other way up, because in doubles that is not an edge case.
 *
 * And one thing the panel above it used to leave out: **the field is a
 * parameter and a person can set it**. Chlorophyll, Swift Swim, Sand Rush,
 * Slush Rush and Surge Surfer double Speed while their condition is standing,
 * and every one of them was listed as unmodelled because nothing could switch
 * the weather on. They are `FIELD_SPEED_ABILITIES` now.
 *
 * What is left is named in `notes` rather than dropped.
 */

import type { Weather, Terrain } from '../damage/types'
import type { Dex } from '../dex'
import type { Format } from '../format'
import { levelFor } from '../format'
import { itemId } from '../ids'
import type { AbilityId, ItemId, SetId, SpeciesId } from '../ids'
import type { PokemonSet } from '../set'
import type { Species } from '../species'
import { displayName } from '../species'
import type { BoostableStat, Nature } from '../stats'
import { applyBoost, BOOSTABLE_STATS, computeStat, MAX_EV_PER_STAT, MAX_IV } from '../stats'
import type { Team } from '../team'
import { isSpeciesLegal } from './legality'

/**
 * What a field-reading ability is waiting for. A union rather than a weather
 * id with `'electric'` smuggled into it, so the one terrain ability in the
 * model does not have to pretend to be weather.
 */
type FieldTrigger =
  | { readonly kind: 'weather'; readonly weather: Weather }
  | { readonly kind: 'terrain'; readonly terrain: Terrain }

function isStanding(trigger: FieldTrigger, field: SpeedField): boolean {
  switch (trigger.kind) {
    case 'weather':
      return field.weather === trigger.weather
    case 'terrain':
      return field.terrain === trigger.terrain
    default: {
      const exhaustive: never = trigger
      return exhaustive
    }
  }
}

function triggerText(trigger: FieldTrigger): string {
  switch (trigger.kind) {
    case 'weather':
      return WEATHER_LABELS[trigger.weather].toLowerCase()
    case 'terrain':
      return TERRAIN_LABELS[trigger.terrain]
    default: {
      const exhaustive: never = trigger
      return exhaustive
    }
  }
}

/**
 * The two abilities that raise the holder's highest stat, and what switches
 * each one on. Held as data rather than as a list of ids, because the trigger
 * is the half this file used to be missing.
 */
const PARADOX_TRIGGERS: Readonly<Record<string, FieldTrigger>> = {
  protosynthesis: { kind: 'weather', weather: 'sun' },
  'quark-drive': { kind: 'terrain', terrain: 'electric' },
}

/**
 * The five abilities that double Speed for as long as the field holds their
 * condition, and nothing else.
 *
 * No item switches one of these on — there is no Booster Energy for
 * Chlorophyll — so an entry is its trigger and nothing more. Adding a sixth is
 * a line here.
 */
const FIELD_SPEED_ABILITIES: Readonly<Record<string, FieldTrigger>> = {
  chlorophyll: { kind: 'weather', weather: 'sun' },
  'swift-swim': { kind: 'weather', weather: 'rain' },
  'sand-rush': { kind: 'weather', weather: 'sand' },
  'slush-rush': { kind: 'weather', weather: 'snow' },
  'surge-surfer': { kind: 'terrain', terrain: 'electric' },
}

/** The item that switches those abilities on without the weather or terrain. */
const BOOSTER_ENERGY: ItemId = itemId('booster-energy')

const CHOICE_SCARF: ItemId = itemId('choice-scarf')

/* ------------------------------------------------------------------- field */

/**
 * The part of the field a Speed reading depends on.
 *
 * Not `Field` from the calculator: screens, sides and battle style decide
 * damage and never decide a turn order. Weather and terrain do, because they
 * are what a Paradox ability and the five doublers wait for. The two members
 * are the calculator's own `Weather` and `Terrain`, so there is one vocabulary
 * for the field in this codebase and not two.
 */
export type SpeedField = {
  readonly weather: Weather
  readonly terrain: Terrain
}

/** No sun, no terrain. What a team builder is looking at before a game starts. */
export const CLEAR_FIELD: SpeedField = { weather: 'none', terrain: 'none' }

const WEATHER_LABELS: Readonly<Record<Weather, string>> = {
  none: 'None',
  sun: 'Sun',
  rain: 'Rain',
  sand: 'Sand',
  snow: 'Snow',
}

const TERRAIN_LABELS: Readonly<Record<Terrain, string>> = {
  none: 'None',
  electric: 'Electric Terrain',
  grassy: 'Grassy Terrain',
  psychic: 'Psychic Terrain',
  misty: 'Misty Terrain',
}

export function weatherLabel(weather: Weather): string {
  return WEATHER_LABELS[weather]
}

export function terrainLabel(terrain: Terrain): string {
  return TERRAIN_LABELS[terrain]
}

/**
 * The field as a person would say it: "sun", "rain and Grassy Terrain", or
 * "a clear field". The panel prints it beside the ladder, because a ladder
 * read in the rain and a ladder read clear are two different ladders and only
 * one of them is on the screen.
 */
export function speedFieldText(field: SpeedField): string {
  const standing: string[] = []
  if (field.weather !== 'none') standing.push(WEATHER_LABELS[field.weather].toLowerCase())
  if (field.terrain !== 'none') standing.push(TERRAIN_LABELS[field.terrain])
  return standing.length === 0 ? 'a clear field' : standing.join(' and ')
}

/* --------------------------------------------------------------- modifiers */

/**
 * A thing that changes a Speed number. A union rather than a set of named
 * fields, so a report can carry +1 and +2 without the type growing a field per
 * stage.
 *
 * Trick Room is deliberately not here. It changes no Speed number at all — it
 * inverts which number goes first — so a multiplier could only lie about it.
 * `SpeedReport.trickRoomLadder` is where it lives.
 */
export type SpeedModifier =
  | { readonly kind: 'none' }
  | { readonly kind: 'choice-scarf' }
  | { readonly kind: 'tailwind' }
  | { readonly kind: 'boost'; readonly stages: number }
  | { readonly kind: 'paralysis' }
  | { readonly kind: 'booster' }
  | { readonly kind: 'field-ability' }

export const SPEED_MODIFIERS: readonly SpeedModifier[] = [
  { kind: 'none' },
  { kind: 'choice-scarf' },
  { kind: 'tailwind' },
  { kind: 'boost', stages: 1 },
  { kind: 'boost', stages: 2 },
  { kind: 'booster' },
  { kind: 'field-ability' },
  { kind: 'paralysis' },
]

export function speedModifierLabel(modifier: SpeedModifier): string {
  switch (modifier.kind) {
    case 'none':
      return 'Unmodified'
    case 'choice-scarf':
      return 'Choice Scarf'
    case 'tailwind':
      return 'Tailwind'
    case 'boost':
      return `${modifier.stages > 0 ? '+' : ''}${modifier.stages}`
    case 'paralysis':
      return 'Paralyzed'
    case 'booster':
      return 'Booster Energy'
    case 'field-ability':
      return 'Field ability'
    default: {
      const exhaustive: never = modifier
      return exhaustive
    }
  }
}

/** Truncating multiply, matching the games' integer maths. */
function scale(value: number, numerator: number, denominator: number): number {
  return Math.floor((value * numerator) / denominator)
}

function applyModifier(speed: number, modifier: SpeedModifier): number {
  switch (modifier.kind) {
    case 'none':
      return speed
    case 'choice-scarf':
      return scale(speed, 3, 2)
    case 'tailwind':
      return speed * 2
    case 'boost':
      return applyBoost(speed, modifier.stages)
    case 'paralysis':
      return scale(speed, 1, 2)
    case 'booster':
      return scale(speed, 3, 2)
    case 'field-ability':
      return speed * 2
    default: {
      const exhaustive: never = modifier
      return exhaustive
    }
  }
}

/* ------------------------------------------------------------------ report */

export type ModifiedSpeed = {
  readonly modifier: SpeedModifier
  readonly speed: number
  /**
   * False when the set cannot reach this number as built — a Booster line on a
   * Pokémon without the ability, or a Scarf line on one holding something else.
   * The number is still shown, because "what if" is what the panel is for.
   */
  readonly available: boolean
}

export type LadderEntry =
  | {
      readonly kind: 'benchmark'
      readonly species: SpeciesId
      readonly label: string
      readonly speed: number
      readonly nature: Nature
    }
  | {
      readonly kind: 'member'
      readonly setId: SetId
      readonly species: SpeciesId
      readonly label: string
      readonly speed: number
    }

export function ladderEntrySpeed(entry: LadderEntry): number {
  switch (entry.kind) {
    case 'benchmark':
    case 'member':
      return entry.speed
    default: {
      const exhaustive: never = entry
      return exhaustive
    }
  }
}

export type MemberSpeed = {
  readonly setId: SetId
  readonly species: SpeciesId
  readonly name: string
  readonly level: number
  /** Computed Speed with nothing applied. */
  readonly speed: number
  /** Speed with the modifiers the set actually carries. */
  readonly effective: number
  readonly modifiers: readonly ModifiedSpeed[]
  /**
   * Everything else on the ladder sitting on this member's effective Speed.
   * Non-empty means the turn is a coin flip and the ladder's order is arbitrary.
   */
  readonly tiedWith: readonly LadderEntry[]
}

/**
 * Entries sharing one number.
 *
 * The games break a Speed tie at random, once, per turn. A ladder that prints
 * an order for these is answering a question it cannot answer, so the group is
 * carried separately and the interface can say so.
 */
export type SpeedTie = {
  readonly speed: number
  readonly entries: readonly LadderEntry[]
  /** True when at least one of the tied entries is on this team. */
  readonly involvesMember: boolean
}

/**
 * How a benchmark was arrived at. Carried on the report so the interface can
 * say it out loud rather than letting the numbers imply an authority they do
 * not have.
 */
export type BenchmarkBasis = {
  readonly kind: 'max-investment'
  readonly evs: number
  readonly ivs: number
  readonly nature: 'speed-raising'
  readonly note: string
}

export const BENCHMARK_BASIS: BenchmarkBasis = {
  kind: 'max-investment',
  evs: MAX_EV_PER_STAT,
  ivs: MAX_IV,
  nature: 'speed-raising',
  note: 'Computed from base stats in the dataset, at maximum Speed investment with a Speed-raising nature, for the species this format allows. Not usage statistics — this app has none.',
}

/**
 * What changes a turn order and is not in this report.
 *
 * Modelling every one of these is real work. Naming them is one array, and it
 * is the difference between a ladder that is partial and a ladder that lies.
 */
export const UNMODELLED_SPEED_EFFECTS: readonly string[] = [
  'What sets the weather and the terrain — the field here is the one you chose, not one read off the team',
  'Abilities that need a turn or a trigger — Speed Boost, Unburden, Quick Feet, Steam Engine',
  'Items that halve Speed — Iron Ball, Macho Brace, the Power items',
  'Sticky Web, Tailwind running out, and move priority, which settles a turn before Speed is read',
]

/** Something the ladder could not account for, named rather than dropped. */
export type SpeedNote =
  | { readonly kind: 'speed-tie'; readonly speed: number; readonly count: number }
  | { readonly kind: 'paradox-dormant'; readonly setId: SetId; readonly ability: AbilityId }
  | { readonly kind: 'booster-without-ability'; readonly setId: SetId }
  | { readonly kind: 'field-ability-dormant'; readonly setId: SetId; readonly ability: AbilityId }
  | { readonly kind: 'unmodelled'; readonly effects: readonly string[] }

export function speedNoteText(note: SpeedNote): string {
  switch (note.kind) {
    case 'speed-tie':
      return `${note.count} entries sit on ${note.speed}. A Speed tie is decided at random each turn, so the order shown between them is not a prediction.`
    case 'paradox-dormant':
      return `${note.ability} is dormant: no Booster Energy, and nothing on the field to switch it on. The ladder reads this set unboosted.`
    case 'booster-without-ability':
      return 'Booster Energy with no Protosynthesis or Quark Drive to spend it. The item does nothing here, and the ladder reads this set unboosted.'
    case 'field-ability-dormant': {
      const trigger = FIELD_SPEED_ABILITIES[note.ability]
      const waitingFor = trigger === undefined ? 'its condition' : triggerText(trigger)
      return `${note.ability} is dormant: the field has no ${waitingFor} in it. The ladder reads this set at its unmodified Speed.`
    }
    case 'unmodelled':
      return `Not accounted for: ${note.effects.join('; ')}.`
    default: {
      const exhaustive: never = note
      return exhaustive
    }
  }
}

export type SpeedReport = {
  readonly level: number
  readonly members: readonly MemberSpeed[]
  /** Members and benchmarks together, fastest first. */
  readonly ladder: readonly LadderEntry[]
  /**
   * The same entries slowest first, which is the order a turn is taken in under
   * Trick Room. Not a second set of numbers — Trick Room changes no Speed.
   */
  readonly trickRoomLadder: readonly LadderEntry[]
  /** Every group of entries sharing a number, fastest first. */
  readonly ties: readonly SpeedTie[]
  readonly basis: BenchmarkBasis
  readonly field: SpeedField
  readonly notes: readonly SpeedNote[]
}

export type AnalyzeSpeedInput = {
  readonly team: Team
  readonly format: Format
  readonly dex: Dex
  /** How many benchmarks the ladder holds. */
  readonly benchmarkCount?: number
  /**
   * The weather and terrain to read the field-reading abilities against —
   * Protosynthesis, Quark Drive, and the five that double Speed outright.
   * Clear by default, which is what a builder is looking at before a game
   * starts.
   */
  readonly field?: SpeedField
}

const DEFAULT_BENCHMARK_COUNT = 10

export function analyzeSpeed({
  team,
  format,
  dex,
  benchmarkCount = DEFAULT_BENCHMARK_COUNT,
  field = CLEAR_FIELD,
}: AnalyzeSpeedInput): SpeedReport {
  const computed = team.members.flatMap((set) => {
    const species = dex.species(set.species)
    return species === undefined ? [] : [memberSpeed({ set, species, format, field })]
  })

  const benchmarks = buildBenchmarks({ format, dex, count: benchmarkCount })

  const ladder: LadderEntry[] = [
    ...benchmarks,
    ...computed.map(({ member }): LadderEntry => ({
      kind: 'member',
      setId: member.setId,
      species: member.species,
      label: member.name,
      speed: member.effective,
    })),
  ].sort((a, b) => b.speed - a.speed || compareLabels(a, b))

  const ties = buildTies(ladder)

  const members = computed.map(({ member }) => ({
    ...member,
    tiedWith: tiedWith(ties, member),
  }))

  return {
    level: levelFor(format, 100),
    members,
    ladder,
    trickRoomLadder: [...ladder].sort((a, b) => a.speed - b.speed || compareLabels(a, b)),
    ties,
    basis: BENCHMARK_BASIS,
    field,
    notes: [
      ...ties
        .filter((tie) => tie.involvesMember)
        .map((tie): SpeedNote => ({
          kind: 'speed-tie',
          speed: tie.speed,
          count: tie.entries.length,
        })),
      ...computed.flatMap(({ notes }) => notes),
      { kind: 'unmodelled', effects: UNMODELLED_SPEED_EFFECTS },
    ],
  }
}

/* ------------------------------------------------------------------- ties */

function buildTies(ladder: readonly LadderEntry[]): readonly SpeedTie[] {
  const bySpeed = new Map<number, LadderEntry[]>()
  for (const entry of ladder) {
    const existing = bySpeed.get(entry.speed)
    if (existing === undefined) bySpeed.set(entry.speed, [entry])
    else existing.push(entry)
  }

  return [...bySpeed.entries()]
    .filter(([, entries]) => entries.length > 1)
    .map(([speed, entries]) => ({
      speed,
      entries,
      involvesMember: entries.some((entry) => entry.kind === 'member'),
    }))
    .sort((a, b) => b.speed - a.speed)
}

function tiedWith(
  ties: readonly SpeedTie[],
  member: Omit<MemberSpeed, 'tiedWith'>,
): readonly LadderEntry[] {
  const tie = ties.find((candidate) => candidate.speed === member.effective)
  if (tie === undefined) return []
  return tie.entries.filter((entry) => entry.kind !== 'member' || entry.setId !== member.setId)
}

/* ------------------------------------------------------------- the members */

type ComputedMember = {
  readonly member: Omit<MemberSpeed, 'tiedWith'>
  readonly notes: readonly SpeedNote[]
}

function memberSpeed({
  set,
  species,
  format,
  field,
}: {
  readonly set: PokemonSet
  readonly species: Species
  readonly format: Format
  readonly field: SpeedField
}): ComputedMember {
  const level = levelFor(format, set.level)
  const speed = computeStat(
    { base: species.baseStats.spe, iv: set.ivs.spe, ev: set.evs.spe, level },
    set.nature,
    'spe',
  )

  const scarfed = set.item === CHOICE_SCARF
  const booster = boosterState({ set, species, format, field })
  const boosted = booster.kind === 'active'
  const fieldAbility = fieldAbilityState({ set, field })
  const doubled = fieldAbility.kind === 'active'

  const modifiers = SPEED_MODIFIERS.map((modifier) => ({
    modifier,
    speed: applyModifier(speed, modifier),
    available: isAvailable({ modifier, scarfed, boosted, doubled }),
  }))

  /**
   * The doubling goes on first, and the order is not arbitrary. Each step here
   * truncates, so a Swift Swim set under a Choice Scarf reads `floor(2s * 3/2)`
   * — which is `3s` exactly — where the other order reads `floor(s * 3/2) * 2`
   * and loses a point on every odd number. The games chain their modifiers and
   * round once; putting the exact multiplier first gets the same answer here.
   */
  let effective = speed
  if (doubled) effective = applyModifier(effective, { kind: 'field-ability' })
  if (scarfed) effective = applyModifier(effective, { kind: 'choice-scarf' })
  if (boosted) effective = applyModifier(effective, { kind: 'booster' })

  return {
    member: {
      setId: set.id,
      species: species.id,
      name: displayName(species),
      level,
      speed,
      effective,
      modifiers,
    },
    notes: [...boosterNotes(set.id, booster), ...fieldAbilityNotes(set.id, fieldAbility)],
  }
}

function isAvailable({
  modifier,
  scarfed,
  boosted,
  doubled,
}: {
  readonly modifier: SpeedModifier
  readonly scarfed: boolean
  readonly boosted: boolean
  readonly doubled: boolean
}): boolean {
  switch (modifier.kind) {
    case 'none':
    case 'tailwind':
    case 'boost':
    case 'paralysis':
      return true
    case 'choice-scarf':
      return scarfed
    case 'booster':
      return boosted
    case 'field-ability':
      return doubled
    default: {
      const exhaustive: never = modifier
      return exhaustive
    }
  }
}

/* ------------------------------------------------ the field-reading abilities */

/**
 * Whether one of the five doublers is doing anything.
 *
 * `dormant` is the case that earns the type: Chlorophyll on a clear field is
 * not the same as no Chlorophyll at all, and a builder who set the weather
 * somewhere else deserves to be told which way the ladder was read.
 */
type FieldAbilityState =
  | { readonly kind: 'active'; readonly ability: AbilityId }
  | { readonly kind: 'dormant'; readonly ability: AbilityId }
  | { readonly kind: 'none' }

function fieldAbilityState({
  set,
  field,
}: {
  readonly set: PokemonSet
  readonly field: SpeedField
}): FieldAbilityState {
  const ability = set.ability
  if (ability === null) return { kind: 'none' }

  const trigger = FIELD_SPEED_ABILITIES[ability]
  if (trigger === undefined) return { kind: 'none' }

  return isStanding(trigger, field) ? { kind: 'active', ability } : { kind: 'dormant', ability }
}

function fieldAbilityNotes(setId: SetId, state: FieldAbilityState): readonly SpeedNote[] {
  switch (state.kind) {
    case 'dormant':
      return [{ kind: 'field-ability-dormant', setId, ability: state.ability }]
    case 'active':
    case 'none':
      return []
    default: {
      const exhaustive: never = state
      return exhaustive
    }
  }
}

/* --------------------------------------------------------- the Paradox pair */

/**
 * Why a set does or does not get the Paradox Speed boost.
 *
 * A boolean could not carry the two cases that were wrong here: the item with
 * no ability behind it, and the ability with nothing to switch it on. Both are
 * a note rather than a silent `false`.
 */
type BoosterState =
  | { readonly kind: 'active'; readonly ability: AbilityId }
  | { readonly kind: 'dormant'; readonly ability: AbilityId }
  | { readonly kind: 'item-without-ability' }
  | { readonly kind: 'not-the-highest-stat'; readonly ability: AbilityId }
  | { readonly kind: 'none' }

/**
 * Protosynthesis and Quark Drive raise the holder's highest stat, and raise
 * Speed by 1.5x rather than the 1.3x the other four get. So the boost lands
 * here only when Speed is the highest of the five computed stats — and only
 * when something has switched the ability on at all.
 *
 * Booster Energy does that in hand; sun does it for Protosynthesis and Electric
 * Terrain for Quark Drive. The item on its own does nothing, which is what
 * `items.ts` has always said and this file used to contradict.
 */
function boosterState({
  set,
  species,
  format,
  field,
}: {
  readonly set: PokemonSet
  readonly species: Species
  readonly format: Format
  readonly field: SpeedField
}): BoosterState {
  const holdsBooster = set.item === BOOSTER_ENERGY
  const ability = set.ability
  const trigger = ability === null ? undefined : PARADOX_TRIGGERS[ability]

  if (ability === null || trigger === undefined) {
    return holdsBooster ? { kind: 'item-without-ability' } : { kind: 'none' }
  }

  const switchedOn = holdsBooster || isStanding(trigger, field)
  if (!switchedOn) return { kind: 'dormant', ability }

  return highestStat({ set, species, format }) === 'spe'
    ? { kind: 'active', ability }
    : { kind: 'not-the-highest-stat', ability }
}

function boosterNotes(setId: SetId, state: BoosterState): readonly SpeedNote[] {
  switch (state.kind) {
    case 'dormant':
      return [{ kind: 'paradox-dormant', setId, ability: state.ability }]
    case 'item-without-ability':
      return [{ kind: 'booster-without-ability', setId }]
    case 'active':
    case 'not-the-highest-stat':
    case 'none':
      return []
    default: {
      const exhaustive: never = state
      return exhaustive
    }
  }
}

function highestStat({
  set,
  species,
  format,
}: {
  readonly set: PokemonSet
  readonly species: Species
  readonly format: Format
}): BoostableStat {
  const level = levelFor(format, set.level)
  const computed = BOOSTABLE_STATS.map((stat) => ({
    stat,
    value: computeStat(
      { base: species.baseStats[stat], iv: set.ivs[stat], ev: set.evs[stat], level },
      set.nature,
      stat,
    ),
  }))

  return computed.reduce((best, entry) => (entry.value > best.value ? entry : best)).stat
}

/* ---------------------------------------------------------- the benchmarks */

function buildBenchmarks({
  format,
  dex,
  count,
}: {
  readonly format: Format
  readonly dex: Dex
  readonly count: number
}): readonly LadderEntry[] {
  const level = levelFor(format, 100)

  return dex
    .allSpecies()
    .filter((species) => isSpeciesLegal(species, format))
    .map((species): LadderEntry => {
      const nature = benchmarkNature(species)
      return {
        kind: 'benchmark',
        species: species.id,
        label: `Max Speed ${natureLabel(nature)} ${displayName(species)}`,
        nature,
        speed: computeStat(
          { base: species.baseStats.spe, iv: MAX_IV, ev: MAX_EV_PER_STAT, level },
          nature,
          'spe',
        ),
      }
    })
    .sort((a, b) => b.speed - a.speed || compareLabels(a, b))
    .slice(0, Math.max(0, count))
}

/**
 * Jolly on a physical attacker, Timid on a special one. Both reach the same
 * Speed; the label is what differs, and a builder reading "Timid Garchomp"
 * would rightly stop trusting the panel.
 */
function benchmarkNature(species: Species): Nature {
  return species.baseStats.atk >= species.baseStats.spa ? 'jolly' : 'timid'
}

function natureLabel(nature: Nature): string {
  return nature.charAt(0).toUpperCase() + nature.slice(1)
}

function compareLabels(a: LadderEntry, b: LadderEntry): number {
  return a.label < b.label ? -1 : a.label > b.label ? 1 : 0
}
