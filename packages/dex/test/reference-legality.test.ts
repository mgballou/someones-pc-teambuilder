/**
 * The shipped rulesets against a published reference.
 *
 * `@pkmn/dex` is Pokémon Showdown's own data layer. It knows two things this
 * package cannot derive from PokéAPI — whether Generation 9 holds a form at
 * all, and which Smogon tier it sits in — and the hostile read of 6 September
 * used exactly those two fields to find five faults here. So the checks below
 * are the report's own comparisons, kept, rather than assertions written from
 * the answers it gave.
 *
 * A reference, never a dependency. Nothing in `src/` imports it, and it is a
 * dev dependency of this package alone.
 *
 * Names are matched the way the report matched them: by id first, then by
 * national dex number and base stats where that is unique. A form neither
 * lookup resolves is skipped rather than reported, so a naming difference can
 * never fail a test — which is why the counts below are asserted too. An
 * assertion that skipped everything would otherwise pass.
 */

import { Dex as ReferenceDex } from '@pkmn/dex'
import { describe, expect, it } from 'vitest'
import type { Format, LegalityReport, Species } from '@spc/core'
import {
  analyzeSpeed,
  formatId,
  gen9Ou,
  gen9Ubers,
  isSpeciesLegal,
  moveId,
  newSet,
  regulationG,
  regulationH,
  regulationI,
  setId,
  SHIPPED_FORMATS,
  speciesId,
  teamId,
  unrestricted,
  validateTeam,
} from '@spc/core'
import { BUNDLED_DATASET } from '../src/bundled'
import { buildDex } from '../src/dataset'

const dex = buildDex(BUNDLED_DATASET)
const reference = ReferenceDex.forGen(9)

type ReferenceSpecies = ReturnType<typeof reference.species.get>

const BY_STATS = new Map<string, ReferenceSpecies[]>()
for (const entry of reference.species.all()) {
  const key = statKey(entry.num, entry.baseStats)
  const bucket = BY_STATS.get(key)
  if (bucket === undefined) BY_STATS.set(key, [entry])
  else bucket.push(entry)
}

function statKey(
  num: number,
  stats: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number },
): string {
  return [num, stats.hp, stats.atk, stats.def, stats.spa, stats.spd, stats.spe].join(',')
}

function resolve(species: Species): ReferenceSpecies | undefined {
  const direct: ReferenceSpecies | undefined = reference.species.get(species.id)
  if (direct !== undefined && direct.exists) return direct
  const candidates = BY_STATS.get(statKey(species.dexNumber, species.baseStats))
  return candidates?.length === 1 ? candidates[0] : undefined
}

/** The reference's two ways of saying a form cannot be used in Generation 9. */
function usableInGen9(entry: ReferenceSpecies): boolean {
  return entry.isNonstandard === null && entry.tier !== 'Illegal'
}

const RESOLVED: readonly (readonly [Species, ReferenceSpecies])[] = BUNDLED_DATASET.species.flatMap(
  (species) => {
    const entry = resolve(species)
    return entry === undefined ? [] : [[species, entry] as const]
  },
)

/** Every shipped format except the sandbox, which is the one that allows these. */
const REAL_FORMATS: readonly Format[] = SHIPPED_FORMATS.filter((format) => format !== unrestricted)

function legalButUnusable(format: Format): readonly string[] {
  return RESOLVED.filter(
    ([species, entry]) => isSpeciesLegal(species, format) && !usableInGen9(entry),
  ).map(([species]) => species.id)
}

describe('the reference match', () => {
  it('resolves nearly every form in the dataset, so nothing below passes by skipping', () => {
    expect(RESOLVED.length).toBeGreaterThan(1300)
  })
})

/** Finding 11. */
describe('a species Generation 9 cannot use', () => {
  it('is what the dataset records it as, form for form', () => {
    const disagreements = RESOLVED.filter(
      ([species, entry]) => species.availableIn.includes(9) !== usableInGen9(entry),
    ).map(([species]) => species.id)

    expect(disagreements).toEqual([])
  })

  it('is not a rare case — the dataset holds hundreds of them', () => {
    expect(
      BUNDLED_DATASET.species.filter((s) => !s.availableIn.includes(9)).length,
    ).toBeGreaterThan(400)
  })

  it('is legal in no shipped regulation or tier', () => {
    const offenders = REAL_FORMATS.flatMap((format) =>
      legalButUnusable(format).map((id) => `${format.shortName}: ${id}`),
    )

    expect(offenders).toEqual([])
  })

  it('is legal in the sandbox, which is the one format that says so', () => {
    expect(legalButUnusable(unrestricted).length).toBeGreaterThan(400)
  })
})

/** Finding 12. */
describe('a Mega Evolution', () => {
  const megas = BUNDLED_DATASET.species.filter((species) => species.id.includes('-mega'))

  it('is classified as one, whatever its base species is', () => {
    expect(megas.filter((species) => species.classification !== 'mega')).toEqual([])
  })

  it('is nearly a hundred forms, so the check above is not vacuous', () => {
    expect(megas.length).toBeGreaterThan(90)
  })

  it('is recorded as absent from Generation 9', () => {
    expect(megas.filter((species) => species.availableIn.length > 0)).toEqual([])
  })

  it('is legal in no shipped regulation or tier', () => {
    const offenders = REAL_FORMATS.flatMap((format) =>
      megas
        .filter((species) => isSpeciesLegal(species, format))
        .map((s) => `${format.shortName}: ${s.id}`),
    )

    expect(offenders).toEqual([])
  })
})

/** Finding 13. */
describe('the Smogon OU ban list', () => {
  it('bars every species the reference tiers Uber or above', () => {
    const accepted = RESOLVED.filter(
      ([species, entry]) =>
        isSpeciesLegal(species, gen9Ou) &&
        usableInGen9(entry) &&
        (entry.tier === 'Uber' || entry.tier === 'AG'),
    ).map(([species]) => species.id)

    expect(accepted).toEqual([])
  })

  it('leaves the tiers below Uber alone, so it has not simply banned everything', () => {
    const ou = RESOLVED.filter(
      ([species, entry]) =>
        usableInGen9(entry) && entry.tier === 'OU' && isSpeciesLegal(species, gen9Ou),
    )

    expect(ou.length).toBeGreaterThan(10)
  })
})

/** Finding 14. */
describe('the moves the two team clauses turn on', () => {
  const referenceMoves = reference.moves.all().filter((move) => move.isNonstandard === null)

  const ours = (
    pick: (move: (typeof BUNDLED_DATASET.moves)[number]) => boolean,
  ): readonly string[] =>
    BUNDLED_DATASET.moves
      .filter(pick)
      .map((move) => move.id)
      .sort()

  /** The reference strips punctuation from an id; ours keeps the hyphen. */
  const theirs = (pick: (move: (typeof referenceMoves)[number]) => boolean): readonly string[] =>
    referenceMoves
      .filter(pick)
      .map((move) => move.id)
      .sort()

  const flatten = (ids: readonly string[]): readonly string[] =>
    [...ids].map((id) => id.replace(/-/gu, '')).sort()

  it('reads the same one-hit knockout moves as the reference', () => {
    expect(flatten(ours((move) => move.variablePower?.kind === 'ohko'))).toEqual(
      theirs((move) => move.ohko !== undefined && move.ohko !== false),
    )
  })

  it('reads the same evasion-raising moves as the reference', () => {
    expect(flatten(ours((move) => move.raisesEvasion))).toEqual(
      theirs((move) => move.target === 'self' && (move.boosts?.evasion ?? 0) > 0),
    )
  })

  it('found some of each, so two empty lists cannot agree their way to a pass', () => {
    expect(ours((move) => move.raisesEvasion).length).toBe(2)
  })

  it('found the four one-hit knockout moves', () => {
    expect(ours((move) => move.variablePower?.kind === 'ohko').length).toBe(4)
  })
})

/** Finding 15, which is finding 11 read through the speed ladder. */
describe('a speed benchmark', () => {
  const emptyTeam = (format: Format) => ({
    id: teamId('t'),
    name: 'empty',
    format: formatId(format.id),
    members: [],
    notes: '',
    tags: [],
  })

  const benchmarks = (format: Format): readonly string[] =>
    analyzeSpeed({ team: emptyTeam(format), format, dex, benchmarkCount: 2000 })
      .ladder.filter((entry) => entry.kind === 'benchmark')
      .map((entry) => entry.species)

  it('never names a species Generation 9 cannot use', () => {
    const offenders = [regulationG, regulationH, regulationI, gen9Ou].flatMap((format) => {
      const pool = new Set(benchmarks(format))
      return RESOLVED.filter(
        ([species, entry]) => pool.has(species.id) && !usableInGen9(entry),
      ).map(([species]) => `${format.shortName}: ${species.id}`)
    })

    expect(offenders).toEqual([])
  })

  it('still draws from hundreds of species, so an empty ladder cannot pass', () => {
    expect(benchmarks(regulationG).length).toBeGreaterThan(700)
  })

  it('puts a real Pokémon at the top of the Regulation G ladder', () => {
    expect(benchmarks(regulationG)[0]).toBe('regieleki')
  })
})

/**
 * The four teams the report built, kept as teams.
 *
 * Every check above reads a list; these read a verdict, which is the thing a
 * person actually sees. Each one came back "legal, zero violations" on
 * 6 September.
 */
describe("the report's own teams", () => {
  /** `moves` is one move per slot, by position. An absent entry leaves it empty. */
  const verdict = (
    format: Format,
    species: readonly string[],
    moves: readonly string[] = [],
  ): LegalityReport => {
    const members = species.map((id, index) => {
      const set = newSet({
        id: setId(`s${index}`),
        species: speciesId(id),
        level: format.level.kind === 'fixed' ? format.level.level : 100,
      })
      const move = moves[index]
      return move === undefined ? set : { ...set, moves: [moveId(move), null, null, null] as const }
    })
    return validateTeam({
      team: {
        id: teamId('t'),
        name: 'reproduction',
        format: formatId(format.id),
        members,
        notes: '',
        tags: [],
      },
      format,
      dex,
    })
  }

  it('refuses six Pokémon Generation 9 does not hold, in Regulation G', () => {
    const report = verdict(regulationG, [
      'butterfree',
      'pidgeot',
      'nidoking',
      'nidoqueen',
      'raticate',
      'fearow',
    ])

    expect(report.violations.filter((v) => v.kind === 'species-unavailable')).toHaveLength(6)
  })

  it('refuses four Mega Evolutions in Regulation G', () => {
    const report = verdict(regulationG, [
      'mewtwo-mega-y',
      'rayquaza-mega',
      'latios-mega',
      'latias-mega',
      'garchomp',
      'amoonguss',
    ])

    expect(report.legal).toBe(false)
  })

  it('refuses the same four under Regulation I, whose restricted cap is one', () => {
    const report = verdict(regulationI, [
      'mewtwo-mega-y',
      'rayquaza-mega',
      'latios-mega',
      'latias-mega',
      'garchomp',
      'amoonguss',
    ])

    expect(report.legal).toBe(false)
  })

  it('refuses six Sheer Cold users in Smogon Ubers', () => {
    const report = verdict(
      gen9Ubers,
      ['kyogre', 'suicune', 'articuno', 'glalie', 'lapras', 'dewgong'],
      ['sheer-cold', 'sheer-cold', 'sheer-cold', 'sheer-cold', 'sheer-cold', 'sheer-cold'],
    )

    expect(report.violations.filter((v) => v.kind === 'ohko-clause')).toHaveLength(6)
  })

  it('refuses Minimize in Smogon OU', () => {
    const report = verdict(
      gen9Ou,
      ['sandaconda', 'garchomp', 'amoonguss', 'dragapult', 'gholdengo', 'corviknight'],
      ['minimize'],
    )

    expect(report.violations.filter((v) => v.kind === 'evasion-clause')).toHaveLength(1)
  })

  it('still passes a team that is actually legal, so this is not refusing everything', () => {
    const report = verdict(regulationG, [
      'garchomp',
      'amoonguss',
      'incineroar',
      'rillaboom',
      'urshifu-rapid-strike',
      'calyrex-shadow',
    ])

    expect(report.legal).toBe(true)
  })
})
