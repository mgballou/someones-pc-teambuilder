import { describe, expect, it } from 'vitest'
import { analyzeCoverage, coverageNoteText, TYPING_EXAMPLE_LIMIT } from '../../src/analysis/index'
import { regulationH, unrestricted } from '../../src/formats/index'
import type { CoverageReport, PokemonType, Team } from '../../src/index'
import { fixtureDex } from '../fixtures/dex'
import { makeTeam } from './support'

const coverageOf = (team: Team) => analyzeCoverage({ team, dex: fixtureDex })

const coverageIn = (team: Team, format = regulationH) =>
  analyzeCoverage({ team, dex: fixtureDex, format })

const typingIn = (report: CoverageReport, types: readonly PokemonType[]) =>
  report.offensive.byTyping.find((matchup) => matchup.types.join('/') === types.join('/'))

const noteKinds = (report: CoverageReport) => report.notes.map((note) => note.kind)

const groundOnly = makeTeam(regulationH, [
  { id: 'a-garchomp', species: 'garchomp', moves: ['earthquake'] },
  { id: 'b-dondozo', species: 'dondozo', moves: ['earthquake'] },
])

describe('offensive coverage', () => {
  it('names only the types a Ground move hits hard', () => {
    expect(coverageOf(groundOnly).offensive.superEffective).toEqual([
      'fire',
      'electric',
      'poison',
      'rock',
      'steel',
    ])
  })

  it('leaves the rest of the chart uncovered', () => {
    expect(coverageOf(groundOnly).offensive.uncovered).toHaveLength(13)
  })

  it('counts a type the team cannot touch at all as uncovered', () => {
    expect(coverageOf(groundOnly).offensive.uncovered).toContain('flying')
  })

  it('reports the multiplier as zero against an immune type', () => {
    expect(coverageOf(groundOnly).offensive.byType.flying.best).toBe(0)
  })

  it('lists the attacking types the team actually carries', () => {
    expect(coverageOf(groundOnly).offensive.attackingTypes).toEqual(['ground'])
  })

  it('marks STAB from the printed typing', () => {
    expect(coverageOf(groundOnly).offensive.byType.fire.bestHits[0]?.stab).toBe(true)
  })

  it('grants STAB from a Tera type without changing the move type', () => {
    const team = makeTeam(regulationH, [
      { id: 'a-dondozo', species: 'dondozo', moves: ['earthquake'], teraType: 'ground' },
    ])

    expect(coverageOf(team).offensive.byType.fire.bestHits[0]?.stab).toBe(true)
  })

  it('leaves the multiplier alone when a Tera type differs from the move type', () => {
    const team = makeTeam(regulationH, [
      { id: 'a-dondozo', species: 'dondozo', moves: ['earthquake'], teraType: 'fairy' },
    ])

    expect(coverageOf(team).offensive.byType.fire.best).toBe(2)
  })

  it('survives a team with no damaging moves', () => {
    const team = makeTeam(regulationH, [
      { id: 'a-amoonguss', species: 'amoonguss', moves: ['spore', 'rage-powder', 'protect'] },
    ])

    expect(coverageOf(team).offensive.unarmed).toBe(true)
  })

  it('reports every type as uncovered when nothing damages', () => {
    const team = makeTeam(regulationH, [
      { id: 'a-amoonguss', species: 'amoonguss', moves: ['spore', 'protect'] },
    ])

    expect(coverageOf(team).offensive.uncovered).toHaveLength(18)
  })

  it('survives an empty team', () => {
    expect(coverageOf(makeTeam(regulationH, [])).offensive.superEffective).toEqual([])
  })

  it('notes a move the dataset does not hold rather than dropping it', () => {
    const team = makeTeam(regulationH, [
      { id: 'a-garchomp', species: 'garchomp', moves: ['not-a-move'] },
    ])

    expect(coverageOf(team).notes[0]?.kind).toBe('unknown-move')
  })
})

describe('defensive coverage', () => {
  const iceWeak = makeTeam(regulationH, [
    { id: 'a-garchomp', species: 'garchomp' },
    { id: 'b-landorus', species: 'landorus-therian' },
    { id: 'c-dragonite', species: 'dragonite' },
  ])

  it('ranks the most-shared weakness first', () => {
    expect(coverageOf(iceWeak).defensive.sharedWeaknesses[0]?.type).toBe('ice')
  })

  it('counts the members that share it', () => {
    expect(coverageOf(iceWeak).defensive.sharedWeaknesses[0]?.count).toBe(3)
  })

  it('names the members that share it', () => {
    expect(coverageOf(iceWeak).defensive.sharedWeaknesses[0]?.members).toEqual([
      'a-garchomp',
      'b-landorus',
      'c-dragonite',
    ])
  })

  it('ranks the rest by how many members carry them', () => {
    expect(coverageOf(iceWeak).defensive.sharedWeaknesses.map((weakness) => weakness.type)).toEqual(
      ['ice', 'dragon', 'fairy'],
    )
  })

  it('ignores a weakness only one member carries', () => {
    expect(
      coverageOf(iceWeak).defensive.sharedWeaknesses.map((weakness) => weakness.type),
    ).not.toContain('water')
  })

  it('records the full multiplier of a doubled weakness', () => {
    expect(coverageOf(iceWeak).defensive.grid[0]?.takes.ice).toBe(4)
  })

  it('gives every member all eighteen attacking types', () => {
    expect(Object.keys(coverageOf(iceWeak).defensive.grid[0]?.takes ?? {})).toHaveLength(18)
  })

  it('reports a type nothing on the team resists', () => {
    const team = makeTeam(regulationH, [{ id: 'a-garchomp', species: 'garchomp' }])

    expect(coverageOf(team).defensive.unresisted).toContain('ice')
  })

  it('drops a type the team does resist from the unresisted list', () => {
    const team = makeTeam(regulationH, [{ id: 'a-garchomp', species: 'garchomp' }])

    expect(coverageOf(team).defensive.unresisted).not.toContain('electric')
  })
})

/**
 * Finding 18. Six Levitate holders were told three of them take double from
 * Ground. The grid read printed typing and nothing else, and said so nowhere.
 */
describe('abilities in the defensive grid', () => {
  const levitating = makeTeam(regulationH, [
    { id: 'a-rotom-wash', species: 'rotom-wash', ability: 'levitate' },
    { id: 'b-tyranitar', species: 'tyranitar', ability: 'sand-stream' },
  ])

  const printedTyping = makeTeam(regulationH, [
    { id: 'a-rotom-wash', species: 'rotom-wash' },
    { id: 'b-tyranitar', species: 'tyranitar' },
  ])

  it('reads a Ground hit on a Levitate holder as zero', () => {
    expect(coverageOf(levitating).defensive.grid[0]?.takes.ground).toBe(0)
  })

  it('read it as double before the ability was consulted', () => {
    expect(coverageOf(printedTyping).defensive.grid[0]?.takes.ground).toBe(2)
  })

  it('drops Ground out of the shared weaknesses', () => {
    expect(
      coverageOf(levitating).defensive.sharedWeaknesses.map((weakness) => weakness.type),
    ).not.toContain('ground')
  })

  it('keeps it there when nothing on the team levitates', () => {
    expect(
      coverageOf(printedTyping).defensive.sharedWeaknesses.map((weakness) => weakness.type),
    ).toContain('ground')
  })

  it('names the type the ability made immune', () => {
    expect(coverageOf(levitating).defensive.grid[0]?.abilityImmunities).toEqual(['ground'])
  })

  it('leaves a chart immunity out of that list', () => {
    const team = makeTeam(regulationH, [
      { id: 'a-landorus', species: 'landorus-therian', ability: 'levitate' },
    ])

    expect(coverageOf(team).defensive.grid[0]?.abilityImmunities).toEqual([])
  })

  it('zeroes Water for a Water Absorb holder', () => {
    const team = makeTeam(regulationH, [
      { id: 'a-tyranitar', species: 'tyranitar', ability: 'water-absorb' },
    ])

    expect(coverageOf(team).defensive.grid[0]?.takes.water).toBe(0)
  })

  it('carries the ability the row was read with', () => {
    expect(coverageOf(levitating).defensive.grid[0]?.ability).toBe('levitate')
  })

  it('notes an ability nothing in the codebase models', () => {
    expect(noteKinds(coverageOf(levitating))).toContain('unmodelled-ability')
  })

  it('notes a set that has chosen no ability at all', () => {
    expect(noteKinds(coverageOf(printedTyping))).toContain('no-ability')
  })

  it('notes an ability that changes a hit without changing the chart', () => {
    const team = makeTeam(regulationH, [
      { id: 'a-dondozo', species: 'dondozo', ability: 'thick-fat' },
    ])

    expect(noteKinds(coverageOf(team))).toContain('ability-beyond-the-grid')
  })

  it('says nothing extra about an ability that is only an immunity', () => {
    const team = makeTeam(regulationH, [
      { id: 'a-rotom-wash', species: 'rotom-wash', ability: 'levitate' },
    ])

    expect(noteKinds(coverageOf(team))).not.toContain('ability-beyond-the-grid')
  })

  it('says the other side of the screen is unreadable from here', () => {
    const team = makeTeam(regulationH, [
      { id: 'a-garchomp', species: 'garchomp', ability: 'sand-veil', moves: ['earthquake'] },
    ])

    expect(noteKinds(coverageOf(team))).toContain('foe-abilities-unknown')
  })

  it('writes that note as something a person can read', () => {
    expect(coverageNoteText({ kind: 'foe-abilities-unknown' })).toContain('typing alone')
  })
})

/**
 * Finding 19. Ghost was covered and Dark was covered, and the team could not
 * touch a Ghost/Dark Pokemon. Nobody brings a single type.
 */
describe('coverage against a whole typing', () => {
  const darkAndPoison = makeTeam(regulationH, [
    { id: 'a-garchomp', species: 'garchomp', moves: ['knock-off'] },
    { id: 'b-amoonguss', species: 'amoonguss', moves: ['venoshock'] },
  ])

  it('hits Ghost hard as a single type', () => {
    expect(coverageOf(darkAndPoison).offensive.byType.ghost.best).toBe(2)
  })

  it('hits Fairy hard as a single type', () => {
    expect(coverageOf(darkAndPoison).offensive.byType.fairy.best).toBe(2)
  })

  it('reaches nothing better than neutral against a Ghost/Fairy Pokemon', () => {
    expect(typingIn(coverageOf(darkAndPoison), ['ghost', 'fairy'])?.best).toBe(1)
  })

  it('names that typing as a gap', () => {
    expect(
      coverageOf(darkAndPoison).offensive.uncoveredTypings.map((matchup) =>
        matchup.types.join('/'),
      ),
    ).toContain('ghost/fairy')
  })

  it('leaves both of its halves out of the single-type gap list', () => {
    expect(coverageOf(darkAndPoison).offensive.uncovered).not.toContain('ghost')
  })

  it('counts the species carrying that typing', () => {
    expect(typingIn(coverageOf(darkAndPoison), ['ghost', 'fairy'])?.speciesCount).toBe(1)
  })

  it('names one of them', () => {
    expect(typingIn(coverageOf(darkAndPoison), ['ghost', 'fairy'])?.examples).toEqual([
      'flutter-mane',
    ])
  })

  it('never names more than the example limit', () => {
    const most = coverageOf(darkAndPoison).offensive.byTyping.map(
      (matchup) => matchup.examples.length,
    )

    expect(Math.max(...most)).toBeLessThanOrEqual(TYPING_EXAMPLE_LIMIT)
  })

  it('holds a typing once rather than once per order', () => {
    const keys = coverageOf(darkAndPoison).offensive.byTyping.map((matchup) =>
      matchup.types.join('/'),
    )

    expect(new Set(keys).size).toBe(keys.length)
  })

  it('sorts the typings by how many species carry them', () => {
    const counts = coverageOf(darkAndPoison).offensive.byTyping.map(
      (matchup) => matchup.speciesCount,
    )

    expect(counts.every((count, index) => index === 0 || counts[index - 1]! >= count)).toBe(true)
  })

  it('measures against the typings a format permits', () => {
    expect(
      coverageIn(darkAndPoison).offensive.byTyping.map((matchup) => matchup.types.join('/')),
    ).not.toContain('ghost/fairy')
  })

  it('measures against every typing in the dataset without one', () => {
    expect(
      coverageOf(darkAndPoison).offensive.byTyping.map((matchup) => matchup.types.join('/')),
    ).toContain('ghost/fairy')
  })

  it('keeps the typing in a format that allows the species', () => {
    expect(
      coverageIn(darkAndPoison, unrestricted).offensive.byTyping.map((matchup) =>
        matchup.types.join('/'),
      ),
    ).toContain('ghost/fairy')
  })

  it('names the mover that reached the best it could', () => {
    expect(typingIn(coverageOf(darkAndPoison), ['ghost', 'fairy'])?.bestHits).toHaveLength(2)
  })

  it('reads a single-typed species as a one-type typing', () => {
    expect(typingIn(coverageOf(darkAndPoison), ['water'])?.speciesCount).toBe(1)
  })
})
