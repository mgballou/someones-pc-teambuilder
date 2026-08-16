/**
 * The eighteen types, plus Stellar.
 *
 * Stellar is not a defensive type. Nothing is Stellar-typed defensively, and
 * the chart below never has to answer "what is super effective against
 * Stellar". It exists only as a Tera type, where it grants a one-time boost
 * per type and hits Terastallized targets for 2x. `effectivenessOf` therefore
 * treats it as neutral and the calculator handles the special case.
 */

export const POKEMON_TYPES = [
  'normal',
  'fire',
  'water',
  'electric',
  'grass',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
  'dark',
  'steel',
  'fairy',
] as const

export type PokemonType = (typeof POKEMON_TYPES)[number]

/** Tera types are the eighteen plus Stellar. */
export const TERA_TYPES = [...POKEMON_TYPES, 'stellar'] as const
export type TeraType = (typeof TERA_TYPES)[number]

export function isPokemonType(value: string): value is PokemonType {
  return (POKEMON_TYPES as readonly string[]).includes(value)
}

export function isTeraType(value: string): value is TeraType {
  return (TERA_TYPES as readonly string[]).includes(value)
}

/**
 * Attacking type -> defending type -> multiplier.
 *
 * Only non-neutral matchups are listed; anything absent is 1x. Written this
 * way because the exceptions are the content — a full 18x18 grid of mostly
 * `1` hides the twelve entries that matter per row.
 */
const CHART: Readonly<Record<PokemonType, Readonly<Partial<Record<PokemonType, number>>>>> = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  grass: {
    fire: 0.5,
    water: 2,
    grass: 0.5,
    poison: 0.5,
    ground: 2,
    flying: 0.5,
    bug: 0.5,
    rock: 2,
    dragon: 0.5,
    steel: 0.5,
  },
  ice: {
    fire: 0.5,
    water: 0.5,
    grass: 2,
    ice: 0.5,
    ground: 2,
    flying: 2,
    dragon: 2,
    steel: 0.5,
  },
  fighting: {
    normal: 2,
    ice: 2,
    poison: 0.5,
    flying: 0.5,
    psychic: 0.5,
    bug: 0.5,
    rock: 2,
    ghost: 0,
    dark: 2,
    steel: 2,
    fairy: 0.5,
  },
  poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground: {
    fire: 2,
    electric: 2,
    grass: 0.5,
    poison: 2,
    flying: 0,
    bug: 0.5,
    rock: 2,
    steel: 2,
  },
  flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug: {
    fire: 0.5,
    grass: 2,
    fighting: 0.5,
    poison: 0.5,
    flying: 0.5,
    psychic: 2,
    ghost: 0.5,
    dark: 2,
    steel: 0.5,
    fairy: 0.5,
  },
  rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
  fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 },
}

/** Single-matchup multiplier. Stellar attacks are neutral here by design. */
export function effectivenessOf(attacking: TeraType, defending: PokemonType): number {
  if (attacking === 'stellar') return 1
  return CHART[attacking][defending] ?? 1
}

/**
 * Multiplier against a defending typing of one or two types.
 *
 * Grounded Flying types and Ring Target style overrides are the caller's
 * problem — this is the raw chart, and the calculator layers situational
 * immunity handling on top of it.
 */
export function effectivenessAgainst(
  attacking: TeraType,
  defending: readonly PokemonType[],
): number {
  return defending.reduce((total, type) => total * effectivenessOf(attacking, type), 1)
}

/** Every type that hits the given defensive typing for more than 1x. */
export function weaknessesOf(defending: readonly PokemonType[]): PokemonType[] {
  return POKEMON_TYPES.filter((attacking) => effectivenessAgainst(attacking, defending) > 1)
}

/** Every type the given defensive typing resists or is immune to. */
export function resistancesOf(defending: readonly PokemonType[]): PokemonType[] {
  return POKEMON_TYPES.filter((attacking) => effectivenessAgainst(attacking, defending) < 1)
}

/** Every type that cannot damage the given defensive typing at all. */
export function immunitiesOf(defending: readonly PokemonType[]): PokemonType[] {
  return POKEMON_TYPES.filter((attacking) => effectivenessAgainst(attacking, defending) === 0)
}
