import type { PokemonSet, SetId, Team, TeamId } from '../../src/index.js'
import {
  abilityId,
  EMPTY_EVS,
  formatId,
  itemId,
  moveId,
  newSet,
  newTeam,
  PERFECT_IVS,
  speciesId,
} from '../../src/index.js'

/** Minting a branded id from a literal is the one thing a type guard cannot do. */
const asSetId = (value: string): SetId => value as SetId
const asTeamId = (value: string): TeamId => value as TeamId

const nicknamed: PokemonSet = {
  ...newSet({ id: asSetId('nicknamed'), species: speciesId('garchomp'), nature: 'adamant' }),
  nickname: 'Sharkbait',
  gender: 'male',
  ability: abilityId('rough-skin'),
  item: itemId('choice-band'),
  teraType: 'ground',
  evs: { hp: 0, atk: 252, def: 4, spa: 0, spd: 0, spe: 252 },
  ivs: { ...PERFECT_IVS, spa: 0 },
  moves: [moveId('earthquake'), moveId('dragon-claw'), moveId('swords-dance'), moveId('protect')],
}

const genderlessShiny: PokemonSet = {
  ...newSet({
    id: asSetId('genderless-shiny'),
    species: speciesId('flutter-mane'),
    nature: 'timid',
  }),
  shiny: true,
  ability: abilityId('protosynthesis'),
  item: itemId('booster-energy'),
  teraType: 'stellar',
  evs: { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 },
  moves: [moveId('moonblast'), moveId('shadow-ball'), moveId('protect'), null],
}

const partialEvs: PokemonSet = {
  ...newSet({ id: asSetId('partial-evs'), species: speciesId('amoonguss'), nature: 'calm' }),
  gender: 'female',
  ability: abilityId('regenerator'),
  item: itemId('rocky-helmet'),
  evs: { hp: 236, atk: 0, def: 4, spa: 0, spd: 12, spe: 0 },
  moves: [moveId('spore'), moveId('rage-powder'), moveId('protect'), moveId('shadow-ball')],
}

const zeroIvs: PokemonSet = {
  ...newSet({ id: asSetId('zero-ivs'), species: speciesId('shedinja'), level: 100 }),
  ivs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
  moves: [moveId('shadow-ball'), null, null, null],
}

const bare: PokemonSet = {
  ...newSet({ id: asSetId('bare'), species: speciesId('urshifu-rapid-strike') }),
  evs: EMPTY_EVS,
  moves: [moveId('surging-strikes'), moveId('close-combat'), null, null],
}

const gigantamaxed: PokemonSet = {
  ...newSet({ id: asSetId('gigantamaxed'), species: speciesId('dondozo'), nature: 'impish' }),
  gender: 'male',
  ability: abilityId('unaware'),
  item: itemId('leftovers'),
  gigantamax: true,
  teraType: 'grass',
  level: 100,
  evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
  ivs: { ...PERFECT_IVS, atk: 0, spe: 0 },
  moves: [moveId('body-press'), moveId('wave-crash'), moveId('protect'), null],
}

export const NICKNAMED_SET = nicknamed

export const VARIED_SETS: readonly PokemonSet[] = [
  nicknamed,
  genderlessShiny,
  partialEvs,
  zeroIvs,
  bare,
  gigantamaxed,
]

export const SIX_SET_TEAM: Team = {
  ...newTeam({ id: asTeamId('varied'), name: 'Varied', format: formatId('vgc-2026-reg-h') }),
  members: VARIED_SETS,
}
