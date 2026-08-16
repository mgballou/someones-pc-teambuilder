import { describe, expect, it } from 'vitest'
import { analyzeCoverage } from '../../src/analysis/index'
import { regulationH } from '../../src/formats/index'
import type { Team } from '../../src/index'
import { fixtureDex } from '../fixtures/dex'
import { makeTeam } from './support'

const coverageOf = (team: Team) => analyzeCoverage({ team, dex: fixtureDex })

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
