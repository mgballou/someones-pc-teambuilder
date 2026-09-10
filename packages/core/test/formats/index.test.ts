import { describe, expect, it } from 'vitest'
import {
  gen9Ou,
  gen9Ubers,
  regulationG,
  regulationH,
  regulationI,
  SHIPPED_FORMATS,
  shippedFormat,
  unrestricted,
  SMOGON_VERIFIED_ON,
  VGC_VERIFIED_ON,
  VGC_RESTRICTED_SPECIES,
} from '../../src/formats/index'
import { abilityId, itemId, sourceFreshness } from '../../src/index'
import type { FormatId } from '../../src/index'

describe('the shipped registry', () => {
  it('holds every format in the design table', () => {
    expect(SHIPPED_FORMATS).toHaveLength(6)
  })

  it('gives every format a unique id', () => {
    const ids = SHIPPED_FORMATS.map((format) => format.id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  it('finds a format by id', () => {
    expect(shippedFormat('gen9-ou' as FormatId)).toBe(gen9Ou)
  })

  it('returns nothing for an id it does not hold', () => {
    expect(shippedFormat('gen9-nu' as FormatId)).toBeUndefined()
  })

  it('gives every format a team of six', () => {
    expect(SHIPPED_FORMATS.every((format) => format.teamSize === 6)).toBe(true)
  })

  it('runs Terastal in every format', () => {
    expect(SHIPPED_FORMATS.every((format) => format.gimmick === 'terastal')).toBe(true)
  })

  it('cites an authority on every format', () => {
    expect(SHIPPED_FORMATS.every((format) => format.source.citation.length > 0)).toBe(true)
  })

  it('dates every citation', () => {
    expect(
      SHIPPED_FORMATS.every((format) => /^\d{4}-\d{2}-\d{2}$/.test(format.source.verifiedOn)),
    ).toBe(true)
  })

  it('dates the VGC regulations apart from the Smogon tiers', () => {
    expect(regulationG.source.verifiedOn).not.toBe(gen9Ou.source.verifiedOn)
  })

  it('reads every VGC regulation on one day', () => {
    const vgc = [regulationG, regulationH, regulationI]

    expect(vgc.every((format) => format.source.verifiedOn === VGC_VERIFIED_ON)).toBe(true)
  })

  it('reads both Smogon tiers on one day', () => {
    expect(
      [gen9Ou, gen9Ubers].every((format) => format.source.verifiedOn === SMOGON_VERIFIED_ON),
    ).toBe(true)
  })

  it('says in every citation that the ruleset is curated rather than live', () => {
    const hedged = SHIPPED_FORMATS.filter((format) =>
      /curated|snapshot|sandbox/i.test(format.source.citation),
    )

    expect(hedged).toHaveLength(SHIPPED_FORMATS.length)
  })
})

describe('the VGC regulations', () => {
  it('brings four of six', () => {
    const vgc = [regulationG, regulationH, regulationI]

    expect(vgc.every((format) => format.bringSize === 4)).toBe(true)
  })

  it('fixes every Pokémon to level 50', () => {
    const vgc = [regulationG, regulationH, regulationI]

    expect(vgc.every((format) => format.level.kind === 'fixed' && format.level.level === 50)).toBe(
      true,
    )
  })

  it('runs the Item Clause', () => {
    const vgc = [regulationG, regulationH, regulationI]

    expect(vgc.every((format) => format.clauses.includes('item'))).toBe(true)
  })

  it('bars every category but ordinary in Regulation H', () => {
    expect(regulationH.legality.bannedClassifications).toEqual([
      'legendary',
      'mythical',
      'sub-legendary',
      'restricted',
      'paradox',
      'ultra-beast',
      'mega',
      'totem',
    ])
  })

  it('leaves Regulation H with no restricted allowance', () => {
    expect(regulationH.legality.maxRestricted).toBe(0)
  })

  it('names Bloodmoon Ursaluna in Regulation H, which no category catches', () => {
    expect(regulationH.legality.bannedSpecies).toContain('ursaluna-bloodmoon')
  })

  it('allows one restricted Pokémon in Regulation G', () => {
    expect(regulationG.legality.maxRestricted).toBe(1)
  })

  it('allows two restricted Pokémon in Regulation I', () => {
    expect(regulationI.legality.maxRestricted).toBe(2)
  })

  it('names no season, because a regulation letter runs in more than one', () => {
    const vgc = [regulationG, regulationH, regulationI]

    expect(vgc.every((format) => !/\d{4}/.test(format.name))).toBe(true)
  })

  it('says in the citation when the regulation was the live one', () => {
    expect(regulationI.source.citation).toContain('1 April 2026')
  })

  it('gives Regulation G and Regulation I the same restricted list', () => {
    expect(regulationG.legality.restrictedSpecies).toEqual(regulationI.legality.restrictedSpecies)
  })

  it('caps the box legendaries rather than banning them', () => {
    expect(regulationG.legality.bannedSpecies).not.toContain('miraidon')
  })

  it('holds both cover legendaries in the restricted list', () => {
    expect(VGC_RESTRICTED_SPECIES).toEqual(expect.arrayContaining(['koraidon', 'miraidon']))
  })

  it('bars mythicals from Regulation G', () => {
    expect(regulationG.legality.bannedClassifications).toContain('mythical')
  })

  it('leaves paradox Pokémon alone in Regulation G', () => {
    expect(regulationG.legality.bannedClassifications).not.toContain('paradox')
  })
})

describe('the Smogon tiers', () => {
  it('brings all six', () => {
    expect([gen9Ou, gen9Ubers].every((format) => format.bringSize === 6)).toBe(true)
  })

  it('caps the level at 100 rather than fixing it', () => {
    expect([gen9Ou, gen9Ubers].every((format) => format.level.kind === 'capped')).toBe(true)
  })

  it('runs the Species Clause without the Item Clause', () => {
    expect(gen9Ou.clauses.includes('species') && !gen9Ou.clauses.includes('item')).toBe(true)
  })

  it('bans by name rather than by category', () => {
    expect(gen9Ou.legality.bannedClassifications).toEqual([])
  })

  it('bars the Uber tier from OU', () => {
    expect(gen9Ou.legality.bannedSpecies).toEqual(
      expect.arrayContaining(['flutter-mane', 'miraidon', 'chien-pao']),
    )
  })

  it('bars nothing by name in Ubers', () => {
    expect(gen9Ubers.legality.bannedSpecies).toEqual([])
  })

  it('bars Moody in both tiers', () => {
    expect(
      [gen9Ou, gen9Ubers].every((format) =>
        format.legality.bannedAbilities.includes(abilityId('moody')),
      ),
    ).toBe(true)
  })

  it('bars the evasion items in both tiers', () => {
    expect(
      [gen9Ou, gen9Ubers].every((format) =>
        format.legality.bannedItems.includes(itemId('bright-powder')),
      ),
    ).toBe(true)
  })

  it('gives no restricted allowance, because Smogon has no such tier', () => {
    expect(gen9Ou.legality.restrictedSpecies).toEqual([])
  })
})

describe('the sandbox', () => {
  it('bans nothing', () => {
    expect(unrestricted.legality).toEqual({
      bannedClassifications: [],
      bannedSpecies: [],
      bannedItems: [],
      bannedMoves: [],
      bannedAbilities: [],
      restrictedSpecies: [],
      maxRestricted: 0,
      allowlist: null,
      allowsUnavailableSpecies: true,
    })
  })

  it('is the only shipped format that admits a species Generation 9 lacks', () => {
    expect(SHIPPED_FORMATS.filter((format) => format.legality.allowsUnavailableSpecies)).toEqual([
      unrestricted,
    ])
  })

  it('applies no clause', () => {
    expect(unrestricted.clauses).toEqual([])
  })

  it('claims no outside authority', () => {
    expect(unrestricted.source.authority).toBe('custom')
  })

  it('never goes stale, because it answers to nobody', () => {
    expect(sourceFreshness(unrestricted.source, '2099-01-01')).toEqual({ kind: 'unchanging' })
  })
})

describe('freshness', () => {
  it('calls a reading fresh on the day it was taken', () => {
    expect(sourceFreshness(gen9Ou.source, SMOGON_VERIFIED_ON).kind).toBe('fresh')
  })

  it('calls a reading fresh on the last day of its window', () => {
    expect(sourceFreshness(gen9Ou.source, '2026-09-16').kind).toBe('fresh')
  })

  it('calls a reading stale one day past its window', () => {
    expect(sourceFreshness(gen9Ou.source, '2026-09-17').kind).toBe('stale')
  })

  it('reports how old the reading is', () => {
    const report = sourceFreshness(gen9Ou.source, '2026-09-17')

    expect(report.kind === 'stale' && report.ageInDays).toBe(32)
  })

  it('gives the VGC regulations a shorter window than the Smogon tiers', () => {
    const vgc = sourceFreshness(regulationG.source, VGC_VERIFIED_ON)
    const smogon = sourceFreshness(gen9Ou.source, SMOGON_VERIFIED_ON)

    expect(
      vgc.kind === 'fresh' && smogon.kind === 'fresh' && vgc.staleAfterDays < smogon.staleAfterDays,
    ).toBe(true)
  })

  it('counts a day across a month boundary', () => {
    expect(sourceFreshness(gen9Ou.source, '2026-08-17').kind).toBe('fresh')
  })

  it('rejects a date that is not an ISO day', () => {
    expect(() => sourceFreshness(gen9Ou.source, '16 August 2026')).toThrow('Expected an ISO date')
  })
})
