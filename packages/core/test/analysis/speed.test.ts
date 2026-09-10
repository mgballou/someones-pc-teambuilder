import { describe, expect, it } from 'vitest'
import {
  analyzeSpeed,
  ladderEntrySpeed,
  speedNoteText,
  UNMODELLED_SPEED_EFFECTS,
} from '../../src/analysis/index'
import type { LadderEntry, SpeedField, SpeedModifier } from '../../src/analysis/index'
import { gen9Ou, regulationH, unrestricted } from '../../src/formats/index'
import type { Team } from '../../src/index'
import { fixtureDex } from '../fixtures/dex'
import { makeTeam } from './support'

const speedOf = (team: Team, format = regulationH) =>
  analyzeSpeed({ team, format, dex: fixtureDex })

const speedOnField = (team: Team, field: SpeedField) =>
  analyzeSpeed({ team, format: regulationH, dex: fixtureDex, field })

const sun: SpeedField = { weather: 'sun', terrain: 'none' }
const electric: SpeedField = { weather: 'none', terrain: 'electric' }

const modifier = (team: Team, kind: SpeedModifier['kind']) =>
  speedOf(team).members[0]?.modifiers.find((entry) => entry.modifier.kind === kind)

const bare = makeTeam(regulationH, [{ id: 'a-garchomp', species: 'garchomp' }])

describe('member speed', () => {
  it('computes Speed at the level the format fixes', () => {
    expect(speedOf(bare).members[0]?.speed).toBe(122)
  })

  it('ignores the level the set asks for when the format fixes one', () => {
    const team = makeTeam(regulationH, [{ id: 'a-garchomp', species: 'garchomp', level: 100 }])

    expect(speedOf(team).members[0]?.level).toBe(50)
  })

  it('multiplies by 1.5 under a Choice Scarf', () => {
    expect(modifier(bare, 'choice-scarf')?.speed).toBe(183)
  })

  it('doubles under Tailwind', () => {
    expect(modifier(bare, 'tailwind')?.speed).toBe(244)
  })

  it('halves under paralysis', () => {
    expect(modifier(bare, 'paralysis')?.speed).toBe(61)
  })

  it('applies a +1 stage as 1.5x', () => {
    expect(
      speedOf(bare).members[0]?.modifiers.find(
        (entry) => entry.modifier.kind === 'boost' && entry.modifier.stages === 1,
      )?.speed,
    ).toBe(183)
  })

  it('marks the Scarf line unavailable to a set not holding one', () => {
    expect(modifier(bare, 'choice-scarf')?.available).toBe(false)
  })

  it('marks the Scarf line available to a set holding one', () => {
    const team = makeTeam(regulationH, [
      { id: 'a-garchomp', species: 'garchomp', item: 'choice-scarf' },
    ])

    expect(modifier(team, 'choice-scarf')?.available).toBe(true)
  })

  it('folds a held Scarf into the effective Speed', () => {
    const team = makeTeam(regulationH, [
      { id: 'a-garchomp', species: 'garchomp', item: 'choice-scarf' },
    ])

    expect(speedOf(team).members[0]?.effective).toBe(183)
  })

  it('grants the Booster boost when Speed is the highest stat', () => {
    const team = makeTeam(regulationH, [
      {
        id: 'a-flutter-mane',
        species: 'flutter-mane',
        ability: 'protosynthesis',
        item: 'booster-energy',
        nature: 'timid',
        evs: { spe: 252 },
      },
    ])

    expect(modifier(team, 'booster')?.available).toBe(true)
  })

  it('withholds the Booster boost when Speed is not the highest stat', () => {
    const team = makeTeam(regulationH, [
      {
        id: 'a-flutter-mane',
        species: 'flutter-mane',
        ability: 'protosynthesis',
        item: 'booster-energy',
        nature: 'modest',
        evs: { spa: 252 },
      },
    ])

    expect(modifier(team, 'booster')?.available).toBe(false)
  })

  it('withholds the Booster boost from a set without the ability or the item', () => {
    expect(modifier(bare, 'booster')?.available).toBe(false)
  })
})

/**
 * Finding 16. The item alone used to be enough, so a Jolly 252 Speed Garchomp
 * holding Booster Energy read 253 instead of 169, and a Protosynthesis holder
 * took the boost in a game with no sun in it.
 */
describe('the Paradox pair', () => {
  const garchompHoldingBooster = makeTeam(regulationH, [
    {
      id: 'a-garchomp',
      species: 'garchomp',
      ability: 'rough-skin',
      item: 'booster-energy',
      nature: 'jolly',
      evs: { spe: 252 },
    },
  ])

  const flutterMane = (item?: string) =>
    makeTeam(regulationH, [
      {
        id: 'a-flutter-mane',
        species: 'flutter-mane',
        ability: 'protosynthesis',
        ...(item === undefined ? {} : { item }),
        nature: 'timid',
        evs: { spe: 252 },
      },
    ])

  const ironLeaves = makeTeam(regulationH, [
    {
      id: 'a-iron-leaves',
      species: 'iron-leaves',
      ability: 'quark-drive',
      nature: 'jolly',
      evs: { spe: 252 },
    },
  ])

  it('leaves Booster Energy inert on a Pokemon with no Paradox ability', () => {
    expect(speedOf(garchompHoldingBooster).members[0]?.effective).toBe(169)
  })

  it('marks that Booster line unreachable', () => {
    expect(modifier(garchompHoldingBooster, 'booster')?.available).toBe(false)
  })

  it('names the wasted item in the notes', () => {
    expect(speedOf(garchompHoldingBooster).notes.map((note) => note.kind)).toContain(
      'booster-without-ability',
    )
  })

  it('leaves a Paradox ability dormant with no sun and no item', () => {
    expect(speedOf(flutterMane()).members[0]?.effective).toBe(
      speedOf(flutterMane()).members[0]?.speed,
    )
  })

  it('names the dormant ability in the notes', () => {
    expect(speedOf(flutterMane()).notes.map((note) => note.kind)).toContain('paradox-dormant')
  })

  it('wakes Protosynthesis in the sun', () => {
    expect(speedOnField(flutterMane(), sun).members[0]?.effective).toBe(307)
  })

  it('leaves Protosynthesis dormant under Electric Terrain', () => {
    expect(speedOnField(flutterMane(), electric).members[0]?.effective).toBe(205)
  })

  it('wakes Quark Drive under Electric Terrain', () => {
    expect(speedOnField(ironLeaves, electric).members[0]?.effective).toBe(256)
  })

  it('leaves Quark Drive dormant in the sun', () => {
    expect(speedOnField(ironLeaves, sun).members[0]?.effective).toBe(171)
  })

  it('wakes the ability with Booster Energy and no weather at all', () => {
    expect(speedOf(flutterMane('booster-energy')).members[0]?.effective).toBe(307)
  })

  it('drops the dormant note once something switches the ability on', () => {
    expect(speedOf(flutterMane('booster-energy')).notes.map((note) => note.kind)).not.toContain(
      'paradox-dormant',
    )
  })

  it('reads a clear field by default', () => {
    expect(speedOf(bare).field).toEqual({ weather: 'none', terrain: 'none' })
  })
})

describe('the ladder', () => {
  const scarfFlip = makeTeam(regulationH, [
    { id: 'a-garchomp', species: 'garchomp' },
    { id: 'b-dragonite', species: 'dragonite', item: 'choice-scarf' },
  ])

  const memberOrder = (team: Team): readonly string[] =>
    speedOf(team)
      .ladder.filter(
        (entry): entry is Extract<LadderEntry, { kind: 'member' }> => entry.kind === 'member',
      )
      .map((entry) => entry.setId)

  it('puts a scarfed Dragonite above an unscarfed Garchomp', () => {
    expect(memberOrder(scarfFlip)).toEqual(['b-dragonite', 'a-garchomp'])
  })

  it('puts them the other way round without the Scarf', () => {
    const team = makeTeam(regulationH, [
      { id: 'a-garchomp', species: 'garchomp' },
      { id: 'b-dragonite', species: 'dragonite' },
    ])

    expect(memberOrder(team)).toEqual(['a-garchomp', 'b-dragonite'])
  })

  it('sorts every entry descending', () => {
    const speeds = speedOf(scarfFlip).ladder.map(ladderEntrySpeed)

    expect(speeds.every((speed, index) => index === 0 || speeds[index - 1]! >= speed)).toBe(true)
  })

  it('computes the fastest benchmark from base stats', () => {
    const fastest = speedOf(bare).ladder.find((entry) => entry.kind === 'benchmark')

    expect(fastest?.speed).toBe(195)
  })

  it('labels a benchmark by how it was computed', () => {
    const fastest = speedOf(bare).ladder.find((entry) => entry.kind === 'benchmark')

    expect(fastest?.label).toBe('Max Speed Jolly Talonflame')
  })

  it('draws benchmarks only from species the format allows', () => {
    const species = speedOf(bare)
      .ladder.filter((entry) => entry.kind === 'benchmark')
      .map((entry) => entry.species)

    expect(species).not.toContain('flutter-mane')
  })

  it('draws a different pool for a format with a different banlist', () => {
    const species = speedOf(bare, gen9Ou)
      .ladder.filter((entry) => entry.kind === 'benchmark')
      .map((entry) => entry.species)

    expect(species).toContain('ogerpon')
  })

  it('says the benchmarks came from base stats and not from usage', () => {
    expect(speedOf(bare).basis.kind).toBe('max-investment')
  })
})

/**
 * The ladder draws its pool through `isSpeciesLegal`, so finding 11 landed here
 * whole: the second-fastest Regulation G benchmark was Ninjask, which Generation
 * 9 does not hold. Nothing in this file changed to fix it, which is the point.
 */
describe('the benchmark pool', () => {
  const pool = (format = regulationH): readonly string[] =>
    analyzeSpeed({ team: bare, format, dex: fixtureDex, benchmarkCount: 1000 })
      .ladder.filter((entry) => entry.kind === 'benchmark')
      .map((entry) => entry.species)

  it('leaves out a species Generation 9 does not hold', () => {
    expect(pool()).not.toContain('pidgeot')
  })

  it('leaves out a Mega Evolution', () => {
    expect(pool()).not.toContain('mewtwo-mega-y')
  })

  it('leaves them out of a Smogon tier too', () => {
    expect(pool(gen9Ou)).not.toContain('pidgeot')
  })

  it('keeps them in the sandbox, which allows what no format does', () => {
    expect(pool(unrestricted)).toContain('pidgeot')
  })

  it('still holds the species the format does allow', () => {
    expect(pool()).toContain('garchomp')
  })
})

/**
 * Finding 17. The ladder printed an order for numbers that are equal, and had
 * no idea Trick Room existed.
 */
describe('ties and Trick Room', () => {
  const onItsOwnBenchmark = makeTeam(regulationH, [
    { id: 'a-garchomp', species: 'garchomp', nature: 'jolly', evs: { spe: 252 } },
  ])

  const tiedAt = (team: Team, speed: number) =>
    speedOf(team).ties.find((tie) => tie.speed === speed)

  it('groups the entries sharing a number', () => {
    const member = speedOf(onItsOwnBenchmark).members[0]

    expect(tiedAt(onItsOwnBenchmark, member?.effective ?? 0)?.entries.length).toBe(2)
  })

  it('marks a tie the team is part of', () => {
    const member = speedOf(onItsOwnBenchmark).members[0]

    expect(tiedAt(onItsOwnBenchmark, member?.effective ?? 0)?.involvesMember).toBe(true)
  })

  it('names what the member is tied with', () => {
    expect(speedOf(onItsOwnBenchmark).members[0]?.tiedWith.map((entry) => entry.label)).toEqual([
      'Max Speed Jolly Garchomp',
    ])
  })

  it('leaves tiedWith empty for a member on a number of its own', () => {
    expect(speedOf(bare).members[0]?.tiedWith).toEqual([])
  })

  it('says in the notes that a tie is not an ordering', () => {
    expect(speedOf(onItsOwnBenchmark).notes.map((note) => note.kind)).toContain('speed-tie')
  })

  it('sorts every tie fastest first', () => {
    const speeds = speedOf(onItsOwnBenchmark).ties.map((tie) => tie.speed)

    expect(speeds.every((speed, index) => index === 0 || speeds[index - 1]! > speed)).toBe(true)
  })

  it('carries the same entries in the Trick Room ladder', () => {
    expect(speedOf(onItsOwnBenchmark).trickRoomLadder.length).toBe(
      speedOf(onItsOwnBenchmark).ladder.length,
    )
  })

  it('sorts the Trick Room ladder slowest first', () => {
    const speeds = speedOf(onItsOwnBenchmark).trickRoomLadder.map(ladderEntrySpeed)

    expect(speeds.every((speed, index) => index === 0 || speeds[index - 1]! <= speed)).toBe(true)
  })

  it('puts the slowest thing on the field first under Trick Room', () => {
    const slowest = Math.min(...speedOf(onItsOwnBenchmark).ladder.map(ladderEntrySpeed))

    expect(speedOf(onItsOwnBenchmark).trickRoomLadder[0]?.speed).toBe(slowest)
  })

  it('changes no Speed number to do it', () => {
    const straight = speedOf(onItsOwnBenchmark)
      .ladder.map(ladderEntrySpeed)
      .sort((a, b) => a - b)
    const inverted = speedOf(onItsOwnBenchmark).trickRoomLadder.map(ladderEntrySpeed)

    expect(inverted).toEqual(straight)
  })

  it('keeps Trick Room out of the multiplier table', () => {
    expect(
      speedOf(onItsOwnBenchmark).members[0]?.modifiers.map((entry) => entry.modifier.kind),
    ).not.toContain('trick-room')
  })
})

describe('what the ladder does not model', () => {
  it('always names the Speed effects it leaves out', () => {
    expect(speedOf(bare).notes.map((note) => note.kind)).toContain('unmodelled')
  })

  it('carries every one of them', () => {
    const note = speedOf(bare).notes.find((entry) => entry.kind === 'unmodelled')

    expect(note?.effects).toEqual(UNMODELLED_SPEED_EFFECTS)
  })

  it('writes a tie note a person can read', () => {
    expect(speedNoteText({ kind: 'speed-tie', speed: 213, count: 2 })).toContain(
      'decided at random',
    )
  })
})
