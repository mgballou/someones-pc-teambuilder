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

/**
 * Conditional base power.
 *
 * Sixteen moves that read their printed power flat and said nothing about it.
 * Every case here is the reproduction the hostile review named, rebuilt against
 * the same oracle.
 */

const KINGAMBIT: Combatant = {
  species: 'kingambit',
  reference: 'Kingambit',
  ability: 'defiant',
  referenceAbility: 'Defiant',
  evs: { atk: 252 },
}

const BURNED_URSALUNA: Combatant = {
  species: 'ursaluna',
  reference: 'Ursaluna',
  ability: 'guts',
  referenceAbility: 'Guts',
  evs: { atk: 252 },
  status: 'burn',
}

const TALONFLAME: Combatant = {
  species: 'talonflame',
  reference: 'Talonflame',
  ability: 'flame-body',
  referenceAbility: 'Flame Body',
  evs: { atk: 252 },
}

const DRACOZOLT: Combatant = {
  species: 'dracozolt',
  reference: 'Dracozolt',
  ability: 'volt-absorb',
  referenceAbility: 'Volt Absorb',
  evs: { atk: 252 },
}

const GLIMMORA: Combatant = {
  species: 'glimmora',
  reference: 'Glimmora',
  ability: 'toxic-debris',
  referenceAbility: 'Toxic Debris',
  evs: { spa: 252 },
}

const RAGING_BOLT: Combatant = {
  species: 'raging-bolt',
  reference: 'Raging Bolt',
  ability: 'protosynthesis',
  referenceAbility: 'Protosynthesis',
  evs: { spa: 252 },
  boostedStat: 'auto',
}

const IRON_LEAVES: Combatant = {
  species: 'iron-leaves',
  reference: 'Iron Leaves',
  ability: 'quark-drive',
  referenceAbility: 'Quark Drive',
  evs: { atk: 252 },
  boostedStat: 'auto',
}

const KORAIDON: Combatant = {
  species: 'koraidon',
  reference: 'Koraidon',
  ability: 'orichalcum-pulse',
  referenceAbility: 'Orichalcum Pulse',
  evs: { atk: 252 },
}

const TYRANITAR: Combatant = {
  species: 'tyranitar',
  reference: 'Tyranitar',
  ability: 'sand-stream',
  referenceAbility: 'Sand Stream',
  evs: { hp: 252, def: 252 },
}

const CLEFABLE: Combatant = {
  species: 'clefable',
  reference: 'Clefable',
  ability: 'unaware',
  referenceAbility: 'Unaware',
  evs: { spa: 252 },
}

const BOOSTED_FLUTTER_MANE: Combatant = {
  species: 'flutter-mane',
  reference: 'Flutter Mane',
  ability: 'protosynthesis',
  referenceAbility: 'Protosynthesis',
  evs: { spa: 252 },
  boosts: { spa: 2, spe: 2 },
  boostedStat: 'auto',
}

const CLOYSTER: Combatant = {
  species: 'cloyster',
  reference: 'Cloyster',
  ability: 'shell-armor',
  referenceAbility: 'Shell Armor',
  evs: { atk: 252 },
}

const VENUSAUR: Combatant = {
  species: 'venusaur',
  reference: 'Venusaur',
  ability: 'overgrow',
  referenceAbility: 'Overgrow',
  evs: { spa: 252 },
}

const DEFENSIVE_GARCHOMP: Combatant = { ...GARCHOMP, evs: { hp: 252, def: 252 } }

const PELIPPER_ATTACKER: Combatant = { ...PELIPPER, evs: { spa: 252 } }

const CHARIZARD_ATTACKER: Combatant = { ...CHARIZARD, evs: { spa: 252 } }

const BLISSEY_WITH_LEFTOVERS: Combatant = {
  ...BLISSEY,
  item: 'leftovers',
  referenceItem: 'Leftovers',
}

describe('Knock Off against a target that is holding something', () => {
  it('agrees that it is 1.5x into a Blissey with Leftovers', () => {
    expect(
      agrees({
        attacker: KINGAMBIT,
        defender: BLISSEY_WITH_LEFTOVERS,
        move: 'knock-off',
        referenceMove: 'Knock Off',
      }),
    ).toEqual([165, 195])
  })

  it('agrees that it is printed power into a Blissey with nothing', () => {
    expect(
      agrees({
        attacker: KINGAMBIT,
        defender: BLISSEY,
        move: 'knock-off',
        referenceMove: 'Knock Off',
      }),
    ).toEqual([111, 132])
  })
})

describe('Facade off a status', () => {
  it('agrees that a burned Guts Ursaluna doubles it', () => {
    expect(
      agrees({
        attacker: BURNED_URSALUNA,
        defender: BLISSEY,
        move: 'facade',
        referenceMove: 'Facade',
      }),
    ).toEqual([366, 432])
  })

  it('agrees that a healthy Ursaluna does not', () => {
    expect(
      agrees({
        attacker: { ...BURNED_URSALUNA, status: 'none' },
        defender: BLISSEY,
        move: 'facade',
        referenceMove: 'Facade',
      }),
    ).toEqual([123, 145])
  })
})

describe('Acrobatics off an empty hand', () => {
  it('agrees that an itemless Talonflame doubles it', () => {
    expect(
      agrees({
        attacker: TALONFLAME,
        defender: BLISSEY,
        move: 'acrobatics',
        referenceMove: 'Acrobatics',
      }),
    ).toEqual([133, 157])
  })

  it('agrees that a Talonflame holding Leftovers does not', () => {
    expect(
      agrees({
        attacker: { ...TALONFLAME, item: 'leftovers', referenceItem: 'Leftovers' },
        defender: BLISSEY,
        move: 'acrobatics',
        referenceMove: 'Acrobatics',
      }),
    ).toEqual([67, 79])
  })
})

describe('Bolt Beak off turn order', () => {
  it('agrees that a faster Dracozolt doubles it', () => {
    expect(
      agrees({
        attacker: DRACOZOLT,
        defender: BLISSEY,
        move: 'bolt-beak',
        referenceMove: 'Bolt Beak',
      }),
    ).toEqual([235, 277])
  })
})

describe('Brine against a target below half', () => {
  it('agrees that a Blissey at 40% doubles it', () => {
    expect(
      agrees({
        attacker: PELIPPER_ATTACKER,
        defender: { ...SPECIAL_BLISSEY, hpFraction: 0.4 },
        move: 'brine',
        referenceMove: 'Brine',
      }),
    ).toEqual([58, 69])
  })

  it('agrees that a Blissey at full health does not', () => {
    expect(
      agrees({
        attacker: PELIPPER_ATTACKER,
        defender: SPECIAL_BLISSEY,
        move: 'brine',
        referenceMove: 'Brine',
      }),
    ).toEqual([30, 36])
  })
})

describe('Payback off turn order', () => {
  it('agrees that a slower Kingambit doubles it', () => {
    expect(
      agrees({
        attacker: KINGAMBIT,
        defender: BLISSEY,
        move: 'payback',
        referenceMove: 'Payback',
      }),
    ).toEqual([169, 201])
  })
})

describe('Venoshock against a poisoned target', () => {
  it('agrees that a poisoned Blissey doubles it', () => {
    expect(
      agrees({
        attacker: GLIMMORA,
        defender: { ...SPECIAL_BLISSEY, status: 'poison' },
        move: 'venoshock',
        referenceMove: 'Venoshock',
      }),
    ).toEqual([72, 85])
  })

  it('agrees that a clean Blissey does not', () => {
    expect(
      agrees({
        attacker: GLIMMORA,
        defender: SPECIAL_BLISSEY,
        move: 'venoshock',
        referenceMove: 'Venoshock',
      }),
    ).toEqual([36, 43])
  })
})

describe('Weather Ball under a weather', () => {
  it('agrees that sun makes it 100 base power and Fire', () => {
    expect(
      agrees({
        attacker: CHARIZARD_ATTACKER,
        defender: SPECIAL_BLISSEY,
        move: 'weather-ball',
        referenceMove: 'Weather Ball',
        weather: 'sun',
      }),
    ).toEqual([73, 87])
  })

  it('agrees that clear skies leave it 50 base power and Normal', () => {
    expect(
      agrees({
        attacker: CHARIZARD_ATTACKER,
        defender: SPECIAL_BLISSEY,
        move: 'weather-ball',
        referenceMove: 'Weather Ball',
      }),
    ).toEqual([17, 20])
  })
})

describe('the terrain moves', () => {
  it('agrees that Rising Voltage doubles on Electric Terrain', () => {
    expect(
      agrees({
        attacker: RAGING_BOLT,
        defender: SPECIAL_BLISSEY,
        move: 'rising-voltage',
        referenceMove: 'Rising Voltage',
        terrain: 'electric',
      }),
    ).toEqual([103, 123])
  })

  it('agrees that Terrain Pulse becomes Electric and doubles', () => {
    expect(
      agrees({
        attacker: RAGING_BOLT,
        defender: SPECIAL_BLISSEY,
        move: 'terrain-pulse',
        referenceMove: 'Terrain Pulse',
        terrain: 'electric',
      }),
    ).toEqual([75, 88])
  })

  it('agrees that Terrain Pulse stays Normal on open ground', () => {
    expect(
      agrees({
        attacker: RAGING_BOLT,
        defender: SPECIAL_BLISSEY,
        move: 'terrain-pulse',
        referenceMove: 'Terrain Pulse',
      }),
    ).toEqual([20, 24])
  })

  it('agrees that Psyblade is 1.5x on Electric Terrain', () => {
    expect(
      agrees({
        attacker: IRON_LEAVES,
        defender: BLISSEY,
        move: 'psyblade',
        referenceMove: 'Psyblade',
        terrain: 'electric',
      }),
    ).toEqual([258, 304])
  })

  it('agrees that Misty Explosion is 1.5x on Misty Terrain', () => {
    expect(
      agrees({
        attacker: CLEFABLE,
        defender: SPECIAL_BLISSEY,
        move: 'misty-explosion',
        referenceMove: 'Misty Explosion',
        terrain: 'misty',
      }),
    ).toEqual([67, 79])
  })
})

describe('Collision Course on a super-effective hit', () => {
  it('agrees that it is 4/3x into Tyranitar', () => {
    expect(
      agrees({
        attacker: KORAIDON,
        defender: TYRANITAR,
        move: 'collision-course',
        referenceMove: 'Collision Course',
      }),
    ).toEqual([348, 412])
  })

  it('agrees that it is printed power into a Garchomp it hits neutrally', () => {
    expect(
      agrees({
        attacker: KORAIDON,
        defender: DEFENSIVE_GARCHOMP,
        move: 'collision-course',
        referenceMove: 'Collision Course',
      }),
    ).toEqual([72, 85])
  })
})

describe('Stored Power off stat stages', () => {
  it('agrees that four raised stages make it 100 base power', () => {
    expect(
      agrees({
        attacker: BOOSTED_FLUTTER_MANE,
        defender: SPECIAL_BLISSEY,
        move: 'stored-power',
        referenceMove: 'Stored Power',
      }),
    ).toEqual([76, 90])
  })

  it('agrees that an unboosted user leaves it at 20', () => {
    expect(
      agrees({
        attacker: { ...BOOSTED_FLUTTER_MANE, boosts: {} },
        defender: SPECIAL_BLISSEY,
        move: 'stored-power',
        referenceMove: 'Stored Power',
      }),
    ).toEqual([8, 10])
  })
})

describe('Triple Axel, whose hits climb', () => {
  it('agrees on the sum of 20, 40 and 60 base power', () => {
    expect(
      agrees({
        attacker: CLOYSTER,
        defender: BLISSEY,
        move: 'triple-axel',
        referenceMove: 'Triple Axel',
        hits: 3,
      }),
    ).toEqual([162, 193])
  })
})

describe('Solar Beam, the one that read high', () => {
  it('agrees that rain halves it', () => {
    expect(
      agrees({
        attacker: VENUSAUR,
        defender: SPECIAL_BLISSEY,
        move: 'solar-beam',
        referenceMove: 'Solar Beam',
        weather: 'rain',
      }),
    ).toEqual([28, 34])
  })

  it('agrees that clear skies leave it whole', () => {
    expect(
      agrees({
        attacker: VENUSAUR,
        defender: SPECIAL_BLISSEY,
        move: 'solar-beam',
        referenceMove: 'Solar Beam',
      }),
    ).toEqual([55, 66])
  })
})
