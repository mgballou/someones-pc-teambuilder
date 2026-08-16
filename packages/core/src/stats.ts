/**
 * Stats, natures and the stat formula.
 *
 * All arithmetic here is integer-exact against the games. Every `Math.floor`
 * is load-bearing — moving one changes a real stat value by one point, which
 * is the difference between surviving a hit and not.
 */

export const STATS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const
export type Stat = (typeof STATS)[number]

/** The five stats a nature can touch. HP is never modified by nature. */
export const BOOSTABLE_STATS = ['atk', 'def', 'spa', 'spd', 'spe'] as const
export type BoostableStat = (typeof BOOSTABLE_STATS)[number]

export type StatSpread = Readonly<Record<Stat, number>>
export type BoostSpread = Readonly<Record<BoostableStat, number>>

export const ZERO_BOOSTS: BoostSpread = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }

export const MAX_EV_PER_STAT = 252
export const MAX_EV_TOTAL = 508
export const MAX_IV = 31
export const DEFAULT_LEVEL = 50

export const NATURES = [
  'hardy',
  'lonely',
  'brave',
  'adamant',
  'naughty',
  'bold',
  'docile',
  'relaxed',
  'impish',
  'lax',
  'timid',
  'hasty',
  'serious',
  'jolly',
  'naive',
  'modest',
  'mild',
  'quiet',
  'bashful',
  'rash',
  'calm',
  'gentle',
  'sassy',
  'careful',
  'quirky',
] as const

export type Nature = (typeof NATURES)[number]

export function isNature(value: string): value is Nature {
  return (NATURES as readonly string[]).includes(value)
}

/**
 * Which stat each nature raises and lowers. The five neutral natures raise and
 * lower the same stat, which is why they are recorded as `null` rather than
 * omitted — a missing entry would read as "unknown nature".
 */
const NATURE_EFFECTS: Readonly<
  Record<Nature, { readonly up: BoostableStat; readonly down: BoostableStat } | null>
> = {
  hardy: null,
  docile: null,
  serious: null,
  bashful: null,
  quirky: null,
  lonely: { up: 'atk', down: 'def' },
  brave: { up: 'atk', down: 'spe' },
  adamant: { up: 'atk', down: 'spa' },
  naughty: { up: 'atk', down: 'spd' },
  bold: { up: 'def', down: 'atk' },
  relaxed: { up: 'def', down: 'spe' },
  impish: { up: 'def', down: 'spa' },
  lax: { up: 'def', down: 'spd' },
  timid: { up: 'spe', down: 'atk' },
  hasty: { up: 'spe', down: 'def' },
  jolly: { up: 'spe', down: 'spa' },
  naive: { up: 'spe', down: 'spd' },
  modest: { up: 'spa', down: 'atk' },
  mild: { up: 'spa', down: 'def' },
  quiet: { up: 'spa', down: 'spe' },
  rash: { up: 'spa', down: 'spd' },
  calm: { up: 'spd', down: 'atk' },
  gentle: { up: 'spd', down: 'def' },
  sassy: { up: 'spd', down: 'spe' },
  careful: { up: 'spd', down: 'spa' },
}

export function natureEffect(
  nature: Nature,
): { readonly up: BoostableStat; readonly down: BoostableStat } | null {
  return NATURE_EFFECTS[nature]
}

/** 1.1, 0.9 or 1.0 for the given nature and stat. */
export function natureMultiplier(nature: Nature, stat: Stat): number {
  if (stat === 'hp') return 1
  const effect = NATURE_EFFECTS[nature]
  if (effect === null) return 1
  if (effect.up === stat) return 1.1
  if (effect.down === stat) return 0.9
  return 1
}

/** Natures that raise the given stat, for "which nature do I want" pickers. */
export function naturesRaising(stat: BoostableStat): Nature[] {
  return NATURES.filter((nature) => NATURE_EFFECTS[nature]?.up === stat)
}

/** Natures that lower the given stat without also raising it. */
export function naturesLowering(stat: BoostableStat): Nature[] {
  return NATURES.filter((nature) => NATURE_EFFECTS[nature]?.down === stat)
}

export type StatInput = {
  readonly base: number
  readonly iv: number
  readonly ev: number
  readonly level: number
}

/**
 * HP has its own formula and two special cases: Shedinja is always 1, and a
 * base-1 HP species (Shedinja is the only one) must not be given the normal
 * treatment.
 */
export function computeHp({ base, iv, ev, level }: StatInput): number {
  if (base === 1) return 1
  return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10
}

/** Atk, Def, SpA, SpD, Spe. Nature is applied last and truncated, not rounded. */
export function computeStat(input: StatInput, nature: Nature, stat: BoostableStat): number {
  const { base, iv, ev, level } = input
  const raw = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5
  return Math.floor(raw * natureMultiplier(nature, stat))
}

export type ComputeSpreadInput = {
  readonly base: StatSpread
  readonly ivs: StatSpread
  readonly evs: StatSpread
  readonly level: number
  readonly nature: Nature
}

/** Every final stat for a set, in one pass. */
export function computeSpread({
  base,
  ivs,
  evs,
  level,
  nature,
}: ComputeSpreadInput): StatSpread {
  const hp = computeHp({ base: base.hp, iv: ivs.hp, ev: evs.hp, level })
  const other = Object.fromEntries(
    BOOSTABLE_STATS.map((stat) => [
      stat,
      computeStat({ base: base[stat], iv: ivs[stat], ev: evs[stat], level }, nature, stat),
    ]),
  ) as Record<BoostableStat, number>
  return { hp, ...other }
}

/**
 * Apply an in-battle stage boost. Stages run -6..+6; the numerator/denominator
 * pair is the exact ratio the games use, so +1 is 1.5x and -1 is 2/3, never
 * a float approximation.
 */
export function applyBoost(value: number, stage: number): number {
  const clamped = Math.max(-6, Math.min(6, stage))
  const [numerator, denominator] = clamped >= 0 ? [2 + clamped, 2] : [2, 2 - clamped]
  return Math.floor((value * numerator) / denominator)
}

export const EMPTY_EVS: StatSpread = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
export const PERFECT_IVS: StatSpread = {
  hp: MAX_IV,
  atk: MAX_IV,
  def: MAX_IV,
  spa: MAX_IV,
  spd: MAX_IV,
  spe: MAX_IV,
}

export function totalEvs(evs: StatSpread): number {
  return STATS.reduce((total, stat) => total + evs[stat], 0)
}

export function evsRemaining(evs: StatSpread): number {
  return MAX_EV_TOTAL - totalEvs(evs)
}

/** Display label for a stat, in the abbreviations competitive players use. */
export const STAT_LABEL: Readonly<Record<Stat, string>> = {
  hp: 'HP',
  atk: 'Atk',
  def: 'Def',
  spa: 'SpA',
  spd: 'SpD',
  spe: 'Spe',
}
