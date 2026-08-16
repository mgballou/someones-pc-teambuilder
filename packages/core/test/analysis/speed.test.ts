import { describe, expect, it } from 'vitest'
import { analyzeSpeed, ladderEntrySpeed } from '../../src/analysis/index'
import type { LadderEntry, SpeedModifier } from '../../src/analysis/index'
import { gen9Ou, regulationH } from '../../src/formats/index'
import type { Team } from '../../src/index'
import { fixtureDex } from '../fixtures/dex'
import { makeTeam } from './support'

const speedOf = (team: Team, format = regulationH) =>
  analyzeSpeed({ team, format, dex: fixtureDex })

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

    expect(fastest?.speed).toBe(169)
  })

  it('labels a benchmark by how it was computed', () => {
    const fastest = speedOf(bare).ladder.find((entry) => entry.kind === 'benchmark')

    expect(fastest?.label).toBe('Max Speed Jolly Garchomp')
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

    expect(species).toContain('urshifu-rapid-strike')
  })

  it('says the benchmarks came from base stats and not from usage', () => {
    expect(speedOf(bare).basis.kind).toBe('max-investment')
  })
})
