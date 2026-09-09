import { describe, expect, it } from 'vitest'
import { ENFORCED_CLAUSES, UNENFORCED_CLAUSES, validateTeam } from '../../src/analysis/index'
import type { Violation } from '../../src/analysis/index'
import {
  gen9Ou,
  regulationG,
  regulationH,
  regulationI,
  SHIPPED_FORMATS,
  unrestricted,
} from '../../src/formats/index'
import { CLAUSES, reorderMember } from '../../src/index'
import type { Format, SetId, Team } from '../../src/index'
import { fixtureDex } from '../fixtures/dex'
import { CLEAN_SIX, makeTeam } from './support'

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

describe('a species Generation 9 does not hold', () => {
  const withPidgeot = (format: Format): Team =>
    makeTeam(format, [
      ...CLEAN_SIX.slice(0, 5),
      { id: 'z-pidgeot', species: 'pidgeot', ability: 'keen-eye', item: 'sitrus-berry' },
    ])

  it('is rejected by Regulation G, which bans it under no rule of its own', () => {
    expect(
      validateTeam({ team: withPidgeot(regulationG), format: regulationG, dex: fixtureDex }).legal,
    ).toBe(false)
  })

  it('names the availability rule rather than a ban list', () => {
    expect(
      violationsOfKind(withPidgeot(regulationG), regulationG, 'species-unavailable')[0]?.rule,
    ).toBe('availability')
  })

  it('reports the generation it is absent from', () => {
    expect(
      violationsOfKind(withPidgeot(regulationG), regulationG, 'species-unavailable')[0]?.generation,
    ).toBe(9)
  })

  it('is rejected by every regulation and tier alike', () => {
    const verdicts = [regulationG, regulationH, regulationI, gen9Ou].map(
      (format) => validateTeam({ team: withPidgeot(format), format, dex: fixtureDex }).legal,
    )

    expect(verdicts).toEqual([false, false, false, false])
  })

  it('is admitted by the sandbox, which exists for match-ups no format allows', () => {
    expect(
      violationsOfKind(withPidgeot(unrestricted), unrestricted, 'species-unavailable'),
    ).toEqual([])
  })

  it('keeps a Mega Evolution out of Regulation G', () => {
    const team = makeTeam(regulationG, [
      ...CLEAN_SIX.slice(0, 5),
      {
        id: 'z-mewtwo-mega-y',
        species: 'mewtwo-mega-y',
        ability: 'insomnia',
        item: 'sitrus-berry',
      },
    ])

    expect(violationsOfKind(team, regulationG, 'species-unavailable')[0]?.species).toBe(
      'mewtwo-mega-y',
    )
  })

  it('is not what rejects a restricted Pokémon that Generation 9 does hold', () => {
    const team = makeTeam(regulationG, [
      ...CLEAN_SIX.slice(0, 5),
      { id: 'z-mewtwo', species: 'mewtwo', ability: 'pressure', item: 'sitrus-berry' },
    ])

    expect(violationsOfKind(team, regulationG, 'species-unavailable')).toEqual([])
  })
})

describe('the OHKO Clause', () => {
  const sheerCold = (format: Format): Team =>
    makeTeam(format, [
      {
        ...CLEAN_SIX[0]!,
        moves: ['sheer-cold', 'earthquake', 'protect', 'swords-dance'],
        level: 100,
      },
      ...CLEAN_SIX.slice(1, 6).map((seed) => ({ ...seed, level: 100 })),
    ])

  it('rejects a one-hit knockout move in a format that declares it', () => {
    expect(validateTeam({ team: sheerCold(gen9Ou), format: gen9Ou, dex: fixtureDex }).legal).toBe(
      false,
    )
  })

  it('names the move it rejected', () => {
    expect(violationsOfKind(sheerCold(gen9Ou), gen9Ou, 'ohko-clause')[0]?.move).toBe('sheer-cold')
  })

  it('leaves the same move alone in a format that declares no such clause', () => {
    expect(violationsOfKind(sheerCold(regulationG), regulationG, 'ohko-clause')).toEqual([])
  })
})

describe('the Evasion Clause', () => {
  const minimize = (format: Format): Team =>
    makeTeam(format, [
      {
        ...CLEAN_SIX[0]!,
        moves: ['minimize', 'earthquake', 'protect', 'swords-dance'],
        level: 100,
      },
      ...CLEAN_SIX.slice(1, 6).map((seed) => ({ ...seed, level: 100 })),
    ])

  it('rejects an evasion-raising move in a format that declares it', () => {
    expect(validateTeam({ team: minimize(gen9Ou), format: gen9Ou, dex: fixtureDex }).legal).toBe(
      false,
    )
  })

  it('names the move it rejected', () => {
    expect(violationsOfKind(minimize(gen9Ou), gen9Ou, 'evasion-clause')[0]?.move).toBe('minimize')
  })

  it('leaves the same move alone in a format that declares no such clause', () => {
    expect(violationsOfKind(minimize(regulationG), regulationG, 'evasion-clause')).toEqual([])
  })
})

describe('the clauses this package claims to check', () => {
  it('is the set validateTeam enforces', () => {
    expect([...ENFORCED_CLAUSES].sort()).toEqual(['evasion', 'item', 'ohko', 'species'])
  })

  it('accounts for every clause a shipped format declares', () => {
    const declared = new Set(SHIPPED_FORMATS.flatMap((format) => format.clauses))
    const unaccounted = [...declared].filter(
      (clause) => !ENFORCED_CLAUSES.has(clause) && !UNENFORCED_CLAUSES.has(clause),
    )

    expect(unaccounted).toEqual([])
  })

  it('accounts for every clause the union holds', () => {
    const unaccounted = CLAUSES.filter(
      (clause) => !ENFORCED_CLAUSES.has(clause) && !UNENFORCED_CLAUSES.has(clause),
    )

    expect(unaccounted).toEqual([])
  })

  it('never claims a clause it also records as unchecked', () => {
    const both = [...ENFORCED_CLAUSES].filter((clause) => UNENFORCED_CLAUSES.has(clause))

    expect(both).toEqual([])
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
