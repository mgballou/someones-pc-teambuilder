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
 */

import type { Dex } from '../dex'
import type { Format } from '../format'
import { levelFor } from '../format'
import { abilityId, itemId } from '../ids'
import type { AbilityId, ItemId, SetId, SpeciesId } from '../ids'
import type { PokemonSet } from '../set'
import type { Species } from '../species'
import { displayName } from '../species'
import type { Nature } from '../stats'
import { applyBoost, BOOSTABLE_STATS, computeStat, MAX_EV_PER_STAT, MAX_IV } from '../stats'
import type { Team } from '../team'
import { isSpeciesLegal } from './legality'

/** Abilities that raise the holder's highest stat, Speed included. */
const BOOST_ABILITIES: readonly AbilityId[] = ['protosynthesis', 'quark-drive'].map(abilityId)

/** The item that switches those abilities on without the weather or terrain. */
const BOOSTER_ENERGY: ItemId = itemId('booster-energy')

const CHOICE_SCARF: ItemId = itemId('choice-scarf')

/* --------------------------------------------------------------- modifiers */

/**
 * A thing that changes a Speed number. A union rather than a set of named
 * fields, so a report can carry +1 and +2 without the type growing a field per
 * stage.
 */
export type SpeedModifier =
  | { readonly kind: 'none' }
  | { readonly kind: 'choice-scarf' }
  | { readonly kind: 'tailwind' }
  | { readonly kind: 'boost'; readonly stages: number }
  | { readonly kind: 'paralysis' }
  | { readonly kind: 'booster' }

export const SPEED_MODIFIERS: readonly SpeedModifier[] = [
  { kind: 'none' },
  { kind: 'choice-scarf' },
  { kind: 'tailwind' },
  { kind: 'boost', stages: 1 },
  { kind: 'boost', stages: 2 },
  { kind: 'booster' },
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

export type SpeedReport = {
  readonly level: number
  readonly members: readonly MemberSpeed[]
  /** Members and benchmarks together, fastest first. */
  readonly ladder: readonly LadderEntry[]
  readonly basis: BenchmarkBasis
}

export type AnalyzeSpeedInput = {
  readonly team: Team
  readonly format: Format
  readonly dex: Dex
  /** How many benchmarks the ladder holds. */
  readonly benchmarkCount?: number
}

const DEFAULT_BENCHMARK_COUNT = 10

export function analyzeSpeed({
  team,
  format,
  dex,
  benchmarkCount = DEFAULT_BENCHMARK_COUNT,
}: AnalyzeSpeedInput): SpeedReport {
  const members = team.members.flatMap((set) => {
    const species = dex.species(set.species)
    return species === undefined ? [] : [memberSpeed({ set, species, format })]
  })

  const benchmarks = buildBenchmarks({ format, dex, count: benchmarkCount })

  const ladder: LadderEntry[] = [
    ...benchmarks,
    ...members.map((member): LadderEntry => ({
      kind: 'member',
      setId: member.setId,
      species: member.species,
      label: member.name,
      speed: member.effective,
    })),
  ].sort((a, b) => b.speed - a.speed || compareLabels(a, b))

  return { level: levelFor(format, 100), members, ladder, basis: BENCHMARK_BASIS }
}

/* ------------------------------------------------------------- the members */

function memberSpeed({
  set,
  species,
  format,
}: {
  readonly set: PokemonSet
  readonly species: Species
  readonly format: Format
}): MemberSpeed {
  const level = levelFor(format, set.level)
  const speed = computeStat(
    { base: species.baseStats.spe, iv: set.ivs.spe, ev: set.evs.spe, level },
    set.nature,
    'spe',
  )

  const scarfed = set.item === CHOICE_SCARF
  const boosted = canUseBoosterSpeed({ set, species, format })

  const modifiers = SPEED_MODIFIERS.map((modifier) => ({
    modifier,
    speed: applyModifier(speed, modifier),
    available: isAvailable({ modifier, scarfed, boosted }),
  }))

  let effective = speed
  if (scarfed) effective = applyModifier(effective, { kind: 'choice-scarf' })
  if (boosted) effective = applyModifier(effective, { kind: 'booster' })

  return {
    setId: set.id,
    species: species.id,
    name: displayName(species),
    level,
    speed,
    effective,
    modifiers,
  }
}

function isAvailable({
  modifier,
  scarfed,
  boosted,
}: {
  readonly modifier: SpeedModifier
  readonly scarfed: boolean
  readonly boosted: boolean
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
    default: {
      const exhaustive: never = modifier
      return exhaustive
    }
  }
}

/**
 * Protosynthesis and Quark Drive raise the holder's highest stat, and raise
 * Speed by 1.5x rather than the 1.3x the other four get. So the boost only
 * lands here when Speed is the highest of the five computed stats.
 */
function canUseBoosterSpeed({
  set,
  species,
  format,
}: {
  readonly set: PokemonSet
  readonly species: Species
  readonly format: Format
}): boolean {
  const hasAbility = set.ability !== null && BOOST_ABILITIES.includes(set.ability)
  if (!hasAbility && set.item !== BOOSTER_ENERGY) return false

  const level = levelFor(format, set.level)
  const computed = BOOSTABLE_STATS.map((stat) => ({
    stat,
    value: computeStat(
      { base: species.baseStats[stat], iv: set.ivs[stat], ev: set.evs[stat], level },
      set.nature,
      stat,
    ),
  }))

  const highest = computed.reduce((best, entry) => (entry.value > best.value ? entry : best))
  return highest.stat === 'spe'
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
