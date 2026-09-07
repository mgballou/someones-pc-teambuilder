import { describe, expect, it } from 'vitest'
import type { Combatant, Scenario } from './reference'
import { differential } from './reference'

const SCIZOR: Combatant = {
  species: 'scizor',
  reference: 'Scizor',
  ability: 'technician',
  referenceAbility: 'Technician',
  nature: 'adamant',
  evs: { atk: 252 },
}

const BRELOOM: Combatant = {
  species: 'breloom',
  reference: 'Breloom',
  ability: 'technician',
  referenceAbility: 'Technician',
  evs: { atk: 252 },
}

const WEAVILE: Combatant = {
  species: 'weavile',
  reference: 'Weavile',
  ability: 'pressure',
  referenceAbility: 'Pressure',
  evs: { spa: 252 },
}

const HAWLUCHA: Combatant = {
  species: 'hawlucha',
  reference: 'Hawlucha',
  ability: 'limber',
  referenceAbility: 'Limber',
  evs: { atk: 252 },
}

const CHI_YU: Combatant = {
  species: 'chi-yu',
  reference: 'Chi-Yu',
  ability: 'beads-of-ruin',
  referenceAbility: 'Beads of Ruin',
  evs: { spa: 252 },
}

const CRAWDAUNT: Combatant = {
  species: 'crawdaunt',
  reference: 'Crawdaunt',
  ability: 'adaptability',
  referenceAbility: 'Adaptability',
  evs: { atk: 252 },
}

const GARCHOMP: Combatant = {
  species: 'garchomp',
  reference: 'Garchomp',
  ability: 'rough-skin',
  referenceAbility: 'Rough Skin',
  evs: { atk: 252 },
}

const OGERPON: Combatant = {
  species: 'ogerpon',
  reference: 'Ogerpon',
  ability: 'defiant',
  referenceAbility: 'Defiant',
  evs: { atk: 252 },
}

const OGERPON_CORNERSTONE: Combatant = {
  species: 'ogerpon-cornerstone-mask',
  reference: 'Ogerpon-Cornerstone',
  ability: 'sturdy',
  referenceAbility: 'Sturdy',
  evs: { atk: 252 },
}

const OGERPON_WELLSPRING: Combatant = {
  species: 'ogerpon-wellspring-mask',
  reference: 'Ogerpon-Wellspring',
  ability: 'water-absorb',
  referenceAbility: 'Water Absorb',
  evs: { atk: 252 },
}

const OGERPON_HEARTHFLAME: Combatant = {
  species: 'ogerpon-hearthflame-mask',
  reference: 'Ogerpon-Hearthflame',
  ability: 'mold-breaker',
  referenceAbility: 'Mold Breaker',
  evs: { atk: 252 },
}

const BARE_BLISSEY: Combatant = {
  species: 'blissey',
  reference: 'Blissey',
  ability: 'natural-cure',
  referenceAbility: 'Natural Cure',
}

const BLISSEY: Combatant = { ...BARE_BLISSEY, evs: { hp: 252, def: 252 } }

const SPECIAL_BLISSEY: Combatant = { ...BARE_BLISSEY, evs: { hp: 252, spd: 252 } }

const CHARIZARD: Combatant = {
  species: 'charizard',
  reference: 'Charizard',
  ability: 'blaze',
  referenceAbility: 'Blaze',
  evs: { hp: 252, def: 252 },
}

const CORVIKNIGHT: Combatant = {
  species: 'corviknight',
  reference: 'Corviknight',
  ability: 'pressure',
  referenceAbility: 'Pressure',
  evs: { hp: 252, def: 252 },
}

const AMOONGUSS: Combatant = {
  species: 'amoonguss',
  reference: 'Amoonguss',
  ability: 'effect-spore',
  referenceAbility: 'Effect Spore',
  evs: { hp: 252, def: 252 },
}

const PELIPPER: Combatant = {
  species: 'pelipper',
  reference: 'Pelipper',
  ability: 'keen-eye',
  referenceAbility: 'Keen Eye',
  evs: { hp: 252, spd: 252 },
}

const GYARADOS: Combatant = {
  species: 'gyarados',
  reference: 'Gyarados',
  ability: 'moxie',
  referenceAbility: 'Moxie',
  evs: { hp: 252, spd: 252 },
}

const SWAMPERT: Combatant = {
  species: 'swampert',
  reference: 'Swampert',
  ability: 'torrent',
  referenceAbility: 'Torrent',
  evs: { hp: 252, spd: 252 },
}

const TOXICROAK: Combatant = {
  species: 'toxicroak',
  reference: 'Toxicroak',
  ability: 'dry-skin',
  referenceAbility: 'Dry Skin',
  evs: { hp: 252, spd: 252 },
}

function agrees(scenario: Scenario): readonly [number, number] {
  const result = differential(scenario)
  expect(result.ours).toEqual(result.reference)
  return result.range
}

describe('Technician', () => {
  it('agrees on Scizor Bullet Punch into Blissey', () => {
    expect(
      agrees({
        attacker: SCIZOR,
        defender: BARE_BLISSEY,
        move: 'bullet-punch',
        referenceMove: 'Bullet Punch',
      }),
    ).toEqual([226, 267])
  })

  it('agrees on Breloom Mach Punch into Blissey', () => {
    expect(
      agrees({
        attacker: BRELOOM,
        defender: BLISSEY,
        move: 'mach-punch',
        referenceMove: 'Mach Punch',
      }),
    ).toEqual([200, 236])
  })
})

describe('Ivy Cudgel', () => {
  it('agrees that the Cornerstone mask makes it Rock', () => {
    expect(
      agrees({
        attacker: OGERPON_CORNERSTONE,
        defender: CHARIZARD,
        move: 'ivy-cudgel',
        referenceMove: 'Ivy Cudgel',
      }),
    ).toEqual([304, 360])
  })

  it('agrees that the Wellspring mask makes it Water', () => {
    expect(
      agrees({
        attacker: OGERPON_WELLSPRING,
        defender: CHARIZARD,
        move: 'ivy-cudgel',
        referenceMove: 'Ivy Cudgel',
      }),
    ).toEqual([152, 180])
  })

  it('agrees that the Hearthflame mask makes it Fire', () => {
    expect(
      agrees({
        attacker: OGERPON_HEARTHFLAME,
        defender: CORVIKNIGHT,
        move: 'ivy-cudgel',
        referenceMove: 'Ivy Cudgel',
      }),
    ).toEqual([126, 150])
  })

  it('agrees that a maskless Ogerpon keeps it Grass', () => {
    expect(
      agrees({
        attacker: OGERPON,
        defender: CHARIZARD,
        move: 'ivy-cudgel',
        referenceMove: 'Ivy Cudgel',
      }),
    ).toEqual([19, 22])
  })
})

describe('Raging Bull', () => {
  const bull = (species: string, reference: string): Combatant => ({
    species,
    reference,
    ability: 'anger-point',
    referenceAbility: 'Anger Point',
    evs: { atk: 252 },
  })

  it('agrees that the Combat breed makes it Fighting', () => {
    expect(
      agrees({
        attacker: bull('tauros-paldea-combat-breed', 'Tauros-Paldea-Combat'),
        defender: BLISSEY,
        move: 'raging-bull',
        referenceMove: 'Raging Bull',
      }),
    ).toEqual([266, 314])
  })

  it('agrees that the Blaze breed makes it Fire', () => {
    expect(
      agrees({
        attacker: bull('tauros-paldea-blaze-breed', 'Tauros-Paldea-Blaze'),
        defender: CORVIKNIGHT,
        move: 'raging-bull',
        referenceMove: 'Raging Bull',
      }),
    ).toEqual([104, 126])
  })

  it('agrees that the Aqua breed makes it Water', () => {
    expect(
      agrees({
        attacker: bull('tauros-paldea-aqua-breed', 'Tauros-Paldea-Aqua'),
        defender: CHARIZARD,
        move: 'raging-bull',
        referenceMove: 'Raging Bull',
      }),
    ).toEqual([128, 152])
  })
})

describe('Freeze-Dry', () => {
  it('agrees that it hits Pelipper for 2x on the Water half', () => {
    expect(
      agrees({
        attacker: WEAVILE,
        defender: PELIPPER,
        move: 'freeze-dry',
        referenceMove: 'Freeze-Dry',
      }),
    ).toEqual([132, 156])
  })

  it('agrees on Gyarados', () => {
    expect(
      agrees({
        attacker: WEAVILE,
        defender: GYARADOS,
        move: 'freeze-dry',
        referenceMove: 'Freeze-Dry',
      }),
    ).toEqual([100, 124])
  })

  it('agrees on Swampert, where Ground would otherwise resist', () => {
    expect(
      agrees({
        attacker: WEAVILE,
        defender: SWAMPERT,
        move: 'freeze-dry',
        referenceMove: 'Freeze-Dry',
      }),
    ).toEqual([112, 136])
  })

  it('agrees on a Blissey that Terastallized into Water', () => {
    expect(
      agrees({
        attacker: WEAVILE,
        defender: { ...SPECIAL_BLISSEY, teraType: 'water' },
        move: 'freeze-dry',
        referenceMove: 'Freeze-Dry',
      }),
    ).toEqual([42, 50])
  })
})

describe('Flying Press', () => {
  it('agrees that the Flying half doubles it against Amoonguss', () => {
    expect(
      agrees({
        attacker: HAWLUCHA,
        defender: AMOONGUSS,
        move: 'flying-press',
        referenceMove: 'Flying Press',
      }),
    ).toEqual([67, 79])
  })

  it('agrees that the Flying half halves it against Corviknight', () => {
    expect(
      agrees({
        attacker: HAWLUCHA,
        defender: CORVIKNIGHT,
        move: 'flying-press',
        referenceMove: 'Flying Press',
      }),
    ).toEqual([26, 31])
  })
})

describe('Dry Skin', () => {
  it('agrees that Fire gains a quarter against it', () => {
    expect(
      agrees({
        attacker: CHI_YU,
        defender: TOXICROAK,
        move: 'heat-wave',
        referenceMove: 'Heat Wave',
      }),
    ).toEqual([144, 169])
  })

  it('agrees that Water is still absorbed outright', () => {
    expect(
      agrees({
        attacker: CRAWDAUNT,
        defender: TOXICROAK,
        move: 'crabhammer',
        referenceMove: 'Crabhammer',
      }),
    ).toEqual([0, 0])
  })
})

describe('Adaptability after Terastallizing', () => {
  it('agrees that Crabhammer loses the bonus off the Tera type', () => {
    expect(
      agrees({
        attacker: { ...CRAWDAUNT, teraType: 'grass' },
        defender: BLISSEY,
        move: 'crabhammer',
        referenceMove: 'Crabhammer',
      }),
    ).toEqual([157, 186])
  })

  it('agrees that Knock Off loses it too', () => {
    expect(
      agrees({
        attacker: { ...CRAWDAUNT, teraType: 'grass' },
        defender: BLISSEY,
        move: 'knock-off',
        referenceMove: 'Knock Off',
      }),
    ).toEqual([102, 121])
  })

  it('agrees that it keeps the bonus without Terastallizing', () => {
    expect(
      agrees({
        attacker: CRAWDAUNT,
        defender: BLISSEY,
        move: 'crabhammer',
        referenceMove: 'Crabhammer',
      }),
    ).toEqual([210, 248])
  })

  it('agrees that Terastallizing into an original type reaches 2.25x', () => {
    expect(
      agrees({
        attacker: { ...CRAWDAUNT, teraType: 'water' },
        defender: BLISSEY,
        move: 'crabhammer',
        referenceMove: 'Crabhammer',
      }),
    ).toEqual([236, 279])
  })
})

describe('Tera Blast under a Stellar Tera', () => {
  it('agrees that it is 100 base power, not 80', () => {
    expect(
      agrees({
        attacker: { ...GARCHOMP, teraType: 'stellar' },
        defender: BLISSEY,
        move: 'tera-blast',
        referenceMove: 'Tera Blast',
        stellarFirstUse: true,
      }),
    ).toEqual([133, 157])
  })
})
