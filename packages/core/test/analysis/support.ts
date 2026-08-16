import type {
  Format,
  Nature,
  PokemonSet,
  SetId,
  StatSpread,
  Team,
  TeamId,
  TeraType,
} from '../../src/index.js'
import { abilityId, EMPTY_EVS, itemId, moveId, newSet, speciesId } from '../../src/index.js'

/** `ids.ts` ships no `setId`/`teamId` factory, so the tests brand their own. */
const setId = (value: string): SetId => value as SetId
const teamId = (value: string): TeamId => value as TeamId

export type SetSeed = {
  readonly id: string
  readonly species: string
  readonly level?: number
  readonly ability?: string
  readonly item?: string
  readonly nature?: Nature
  readonly moves?: readonly string[]
  readonly evs?: Partial<StatSpread>
  readonly teraType?: TeraType
}

export function makeSet(seed: SetSeed): PokemonSet {
  const base = newSet({
    id: setId(seed.id),
    species: speciesId(seed.species),
    level: seed.level ?? 50,
    ability: seed.ability === undefined ? null : abilityId(seed.ability),
    nature: seed.nature ?? 'hardy',
  })
  const moves = (seed.moves ?? []).map(moveId)
  return {
    ...base,
    item: seed.item === undefined ? null : itemId(seed.item),
    evs: { ...EMPTY_EVS, ...seed.evs },
    moves: [moves[0] ?? null, moves[1] ?? null, moves[2] ?? null, moves[3] ?? null],
    teraType: seed.teraType ?? null,
  }
}

export function makeTeam(format: Format, seeds: readonly SetSeed[]): Team {
  return {
    id: teamId('team-1'),
    name: 'Test team',
    format: format.id,
    members: seeds.map(makeSet),
    notes: '',
    tags: [],
  }
}

/** Six ordinary Pokémon with real abilities, learnable moves and unique items. */
export const CLEAN_SIX: readonly SetSeed[] = [
  {
    id: 'a-garchomp',
    species: 'garchomp',
    ability: 'sand-veil',
    item: 'leftovers',
    nature: 'jolly',
    moves: ['earthquake', 'dragon-claw', 'protect', 'swords-dance'],
  },
  {
    id: 'b-incineroar',
    species: 'incineroar',
    ability: 'intimidate',
    item: 'assault-vest',
    nature: 'adamant',
    moves: ['fake-out', 'knock-off', 'flamethrower', 'close-combat'],
  },
  {
    id: 'c-amoonguss',
    species: 'amoonguss',
    ability: 'regenerator',
    item: 'rocky-helmet',
    nature: 'calm',
    moves: ['spore', 'rage-powder', 'protect', 'shadow-ball'],
  },
  {
    id: 'd-dondozo',
    species: 'dondozo',
    ability: 'unaware',
    item: 'focus-sash',
    nature: 'impish',
    moves: ['wave-crash', 'body-press', 'protect', 'earthquake'],
  },
  {
    id: 'e-dragonite',
    species: 'dragonite',
    ability: 'multiscale',
    item: 'life-orb',
    nature: 'adamant',
    moves: ['dragon-claw', 'aerial-ace', 'protect', 'earthquake'],
  },
  {
    id: 'f-rotom-wash',
    species: 'rotom-wash',
    ability: 'levitate',
    item: 'choice-specs',
    nature: 'modest',
    moves: ['hydro-pump', 'thunderbolt', 'volt-switch', 'will-o-wisp'],
  },
]
