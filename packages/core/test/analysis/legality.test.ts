import { describe, expect, it } from 'vitest'
import { validateTeam } from '../../src/analysis/index.js'
import type { Violation } from '../../src/analysis/index.js'
import {
  gen9Ou,
  regulationG,
  regulationH,
  regulationI,
  unrestricted,
} from '../../src/formats/index.js'
import { reorderMember } from '../../src/index.js'
import type { Format, SetId, Team } from '../../src/index.js'
import { fixtureDex } from '../fixtures/dex.js'
import { CLEAN_SIX, makeTeam } from './support.js'

function violationsOfKind<K extends Violation['kind']>(
  team: Team,
  format: Format,
  kind: K,
): readonly Extract<Violation, { kind: K }>[] {
  const report = validateTeam({ team, format, dex: fixtureDex })
  return report.violations.filter(
    (violation): violation is Extract<Violation, { kind: K }> => violation.kind === kind,
  )
}

describe('validateTeam', () => {
  it('rejects a paradox Pokémon in Regulation H', () => {
    const team = makeTeam(regulationH, [
      ...CLEAN_SIX.slice(0, 5),
      { id: 'z-flutter-mane', species: 'flutter-mane', ability: 'protosynthesis' },
    ])

    expect(validateTeam({ team, format: regulationH, dex: fixtureDex }).legal).toBe(false)
  })

  it('names the category rule that rejected the paradox Pokémon', () => {
    const team = makeTeam(regulationH, [
      { id: 'z-flutter-mane', species: 'flutter-mane', ability: 'protosynthesis' },
      ...CLEAN_SIX.slice(0, 3),
    ])

    expect(violationsOfKind(team, regulationH, 'classification-banned')[0]?.rule).toBe(
      'banned-classification',
    )
  })

  it('reports which category the paradox Pokémon fell into', () => {
    const team = makeTeam(regulationH, [
      { id: 'z-flutter-mane', species: 'flutter-mane', ability: 'protosynthesis' },
      ...CLEAN_SIX.slice(0, 3),
    ])

    expect(violationsOfKind(team, regulationH, 'classification-banned')[0]?.classification).toBe(
      'paradox',
    )
  })

  it("carries the format's source on every violation", () => {
    const team = makeTeam(regulationH, [
      { id: 'z-flutter-mane', species: 'flutter-mane', ability: 'protosynthesis' },
      ...CLEAN_SIX.slice(0, 3),
    ])

    expect(violationsOfKind(team, regulationH, 'classification-banned')[0]?.source).toEqual(
      regulationH.source,
    )
  })

  it('catches two Choice Scarfs under the Item Clause', () => {
    const team = makeTeam(regulationH, [
      { ...CLEAN_SIX[0]!, item: 'choice-scarf' },
      { ...CLEAN_SIX[1]!, item: 'choice-scarf' },
      CLEAN_SIX[2]!,
      CLEAN_SIX[3]!,
    ])

    expect(violationsOfKind(team, regulationH, 'item-clause')).toHaveLength(1)
  })

  it('names both slots holding the duplicated item', () => {
    const team = makeTeam(regulationH, [
      { ...CLEAN_SIX[0]!, item: 'choice-scarf' },
      { ...CLEAN_SIX[1]!, item: 'choice-scarf' },
      CLEAN_SIX[2]!,
      CLEAN_SIX[3]!,
    ])

    expect(violationsOfKind(team, regulationH, 'item-clause')[0]?.setIds).toEqual([
      'a-garchomp',
      'b-incineroar',
    ])
  })

  it('leaves the Item Clause alone in a format that does not have it', () => {
    const team = makeTeam(gen9Ou, [
      { ...CLEAN_SIX[0]!, item: 'choice-scarf', level: 100 },
      { ...CLEAN_SIX[1]!, item: 'choice-scarf', level: 100 },
      ...CLEAN_SIX.slice(2).map((seed) => ({ ...seed, level: 100 })),
    ])

    expect(violationsOfKind(team, gen9Ou, 'item-clause')).toHaveLength(0)
  })

  it('catches two Pokémon sharing a National Dex number', () => {
    const team = makeTeam(regulationH, [
      CLEAN_SIX[0]!,
      { ...CLEAN_SIX[0]!, id: 'a2-garchomp', item: 'life-orb' },
      CLEAN_SIX[1]!,
      CLEAN_SIX[2]!,
    ])

    expect(violationsOfKind(team, regulationH, 'species-clause')[0]?.dexNumber).toBe(445)
  })

  it('accepts a clean six under Regulation H', () => {
    const team = makeTeam(regulationH, CLEAN_SIX)

    expect(validateTeam({ team, format: regulationH, dex: fixtureDex }).violations).toEqual([])
  })

  it('keeps a legal team legal after a reorder', () => {
    const team = makeTeam(regulationH, CLEAN_SIX)
    const moved = reorderMember(team, 'f-rotom-wash' as SetId, 0)

    expect(validateTeam({ team: moved, format: regulationH, dex: fixtureDex }).legal).toBe(true)
  })

  it('rejects a move the species cannot learn', () => {
    const team = makeTeam(regulationH, [
      { ...CLEAN_SIX[2]!, moves: ['earthquake', 'spore', 'protect', 'rage-powder'] },
      CLEAN_SIX[0]!,
      CLEAN_SIX[1]!,
      CLEAN_SIX[3]!,
    ])

    expect(violationsOfKind(team, regulationH, 'move-not-learnable')[0]?.move).toBe('earthquake')
  })

  it('rejects an ability the form does not have', () => {
    const team = makeTeam(regulationH, [
      { ...CLEAN_SIX[0]!, ability: 'levitate' },
      CLEAN_SIX[1]!,
      CLEAN_SIX[2]!,
      CLEAN_SIX[3]!,
    ])

    expect(violationsOfKind(team, regulationH, 'ability-not-available')).toHaveLength(1)
  })

  it('rejects a spread over the EV total', () => {
    const team = makeTeam(regulationH, [
      { ...CLEAN_SIX[0]!, evs: { hp: 252, atk: 252, spe: 252 } },
      CLEAN_SIX[1]!,
      CLEAN_SIX[2]!,
      CLEAN_SIX[3]!,
    ])

    expect(violationsOfKind(team, regulationH, 'ev-total')[0]?.total).toBe(756)
  })

  it('rejects more than 252 EVs in one stat', () => {
    const team = makeTeam(regulationH, [
      { ...CLEAN_SIX[0]!, evs: { spe: 253 } },
      CLEAN_SIX[1]!,
      CLEAN_SIX[2]!,
      CLEAN_SIX[3]!,
    ])

    expect(violationsOfKind(team, regulationH, 'ev-cap')[0]?.stat).toBe('spe')
  })

  it('rejects a level the format does not fix to', () => {
    const team = makeTeam(regulationH, [
      { ...CLEAN_SIX[0]!, level: 100 },
      CLEAN_SIX[1]!,
      CLEAN_SIX[2]!,
      CLEAN_SIX[3]!,
    ])

    expect(violationsOfKind(team, regulationH, 'level')[0]?.level).toBe(100)
  })

  it('reports a team below the number it must bring', () => {
    const team = makeTeam(regulationH, [CLEAN_SIX[0]!, CLEAN_SIX[1]!])

    expect(violationsOfKind(team, regulationH, 'team-size')[0]?.min).toBe(4)
  })

  it('reports a species the dataset does not hold', () => {
    const team = makeTeam(unrestricted, [
      ...CLEAN_SIX.slice(0, 5),
      { id: 'z-ghost', species: 'not-a-pokemon' },
    ])

    expect(violationsOfKind(team, unrestricted, 'missing-from-dataset')[0]?.entry).toBe('species')
  })

  it('accepts one restricted Pokémon in Regulation I', () => {
    const team = makeTeam(regulationI, [
      ...CLEAN_SIX.slice(0, 5),
      { id: 'z-miraidon', species: 'miraidon', ability: 'hadron-engine' },
    ])

    expect(validateTeam({ team, format: regulationI, dex: fixtureDex }).legal).toBe(true)
  })

  it('caps restricted Pokémon rather than banning them', () => {
    const team = makeTeam(regulationG, [
      ...CLEAN_SIX.slice(0, 5),
      { id: 'z-miraidon', species: 'miraidon', ability: 'hadron-engine' },
    ])

    expect(violationsOfKind(team, regulationG, 'species-banned')).toHaveLength(0)
  })

  it('bans a named species in Gen 9 OU', () => {
    const team = makeTeam(gen9Ou, [
      ...CLEAN_SIX.slice(0, 5).map((seed) => ({ ...seed, level: 100 })),
      { id: 'z-flutter-mane', species: 'flutter-mane', ability: 'protosynthesis', level: 100 },
    ])

    expect(violationsOfKind(team, gen9Ou, 'species-banned')[0]?.species).toBe('flutter-mane')
  })
})

describe('legality under reordering', () => {
  const rotations = (team: Team): readonly Team[] =>
    team.members.map((member, index) => reorderMember(team, member.id, index === 0 ? 3 : 0))

  it('gives the same verdict for every rotation of a legal team', () => {
    const team = makeTeam(regulationH, CLEAN_SIX)
    const verdicts = rotations(team).map(
      (rotated) => validateTeam({ team: rotated, format: regulationH, dex: fixtureDex }).legal,
    )

    expect(verdicts.every((legal) => legal)).toBe(true)
  })

  it('gives an identical report for every rotation of an illegal team', () => {
    const team = makeTeam(regulationH, [
      { ...CLEAN_SIX[0]!, item: 'choice-scarf', ability: 'levitate' },
      { ...CLEAN_SIX[1]!, item: 'choice-scarf', level: 100 },
      { id: 'z-flutter-mane', species: 'flutter-mane', ability: 'protosynthesis' },
      { ...CLEAN_SIX[3]!, evs: { hp: 300 } },
    ])
    const baseline = validateTeam({ team, format: regulationH, dex: fixtureDex })
    const rotated = rotations(team).map((next) =>
      validateTeam({ team: next, format: regulationH, dex: fixtureDex }),
    )

    expect(rotated.every((report) => JSON.stringify(report) === JSON.stringify(baseline))).toBe(
      true,
    )
  })
})
