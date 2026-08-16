import { describe, expect, it } from 'vitest'
import { fixtureDex } from '../fixtures/dex.js'
import { EMPTY_EVS, PERFECT_IVS } from '../../src/index.js'
import {
  describeProblem,
  parse,
  problemsOf,
  resolveSpecies,
  setsOf,
  slugCandidates,
} from '../../src/showdown/index.js'

const only = (paste: string) => {
  const set = setsOf(parse({ paste, dex: fixtureDex }))[0]
  if (set === undefined) throw new Error(`nothing parsed from ${JSON.stringify(paste)}`)
  return set
}

const problems = (paste: string) => problemsOf(parse({ paste, dex: fixtureDex }))

describe('the identity line', () => {
  it('reads a bare species', () => {
    expect(only('Garchomp').species).toBe('garchomp')
  })

  it('reads a species and an item', () => {
    expect(only('Garchomp @ Choice Band').item).toBe('choice-band')
  })

  it('reads a nickname', () => {
    expect(only('Sharkbait (Garchomp) @ Choice Band').nickname).toBe('Sharkbait')
  })

  it('reads the species out of the parentheses', () => {
    expect(only('Sharkbait (Garchomp) @ Choice Band').species).toBe('garchomp')
  })

  it('reads a male marker', () => {
    expect(only('Sharkbait (Garchomp) (M) @ Choice Band').gender).toBe('male')
  })

  it('reads a female marker', () => {
    expect(only('Garchomp (F)').gender).toBe('female')
  })

  it('reads a genderless marker', () => {
    expect(only('Shedinja (N)').gender).toBe('genderless')
  })

  it('leaves gender unset when unmarked', () => {
    expect(only('Garchomp').gender).toBeNull()
  })

  it('leaves the item unset when unnamed', () => {
    expect(only('Garchomp').item).toBeNull()
  })

  it('keeps a nickname that contains parentheses', () => {
    expect(only('(Old) Sharkbait (Garchomp)').nickname).toBe('(Old) Sharkbait')
  })
})

describe('tolerant name resolution', () => {
  it('accepts the canonical form name', () => {
    expect(resolveSpecies(fixtureDex, 'Landorus-Therian')).toBe('landorus-therian')
  })

  it('accepts a space where the dataset has a hyphen', () => {
    expect(resolveSpecies(fixtureDex, 'landorus therian')).toBe('landorus-therian')
  })

  it('ignores case', () => {
    expect(resolveSpecies(fixtureDex, 'URSHIFU-RAPID-STRIKE')).toBe('urshifu-rapid-strike')
  })

  it('offers the apostrophe-deleted slug', () => {
    expect(slugCandidates("Farfetch'd")).toContain('farfetchd')
  })

  it('offers the plain slug too', () => {
    expect(slugCandidates("Farfetch'd")).toContain('farfetch-d')
  })

  it('collapses a period into the separator', () => {
    expect(slugCandidates('Mr. Mime')).toEqual(['mr-mime'])
  })

  it('collapses a colon into the separator', () => {
    expect(slugCandidates('Type: Null')).toEqual(['type-null'])
  })
})

describe('the field lines', () => {
  it('reads an ability', () => {
    expect(only('Garchomp\nAbility: Rough Skin').ability).toBe('rough-skin')
  })

  it('reads the legacy Trait spelling', () => {
    expect(only('Garchomp\nTrait: Rough Skin').ability).toBe('rough-skin')
  })

  it('leaves the ability unset when the line is missing', () => {
    expect(only('Garchomp\n- Earthquake').ability).toBeNull()
  })

  it('reads a level', () => {
    expect(only('Garchomp\nLevel: 100').level).toBe(100)
  })

  it('falls back to the default level', () => {
    expect(only('Garchomp').level).toBe(50)
  })

  it('takes the default level from the caller', () => {
    const set = setsOf(parse({ paste: 'Garchomp', dex: fixtureDex, defaultLevel: 100 }))[0]
    expect(set?.level).toBe(100)
  })

  it('reads shiny', () => {
    expect(only('Garchomp\nShiny: Yes').shiny).toBe(true)
  })

  it('reads a declined shiny', () => {
    expect(only('Garchomp\nShiny: No').shiny).toBe(false)
  })

  it('reads gigantamax', () => {
    expect(only('Dondozo\nGigantamax: Yes').gigantamax).toBe(true)
  })

  it('reads a Tera type', () => {
    expect(only('Garchomp\nTera Type: Ground').teraType).toBe('ground')
  })

  it('reads Stellar', () => {
    expect(only('Garchomp\nTera Type: Stellar').teraType).toBe('stellar')
  })

  it('reads a nature line', () => {
    expect(only('Garchomp\nAdamant Nature').nature).toBe('adamant')
  })

  it('reads a nature written as a field', () => {
    expect(only('Garchomp\nNature: Adamant').nature).toBe('adamant')
  })

  it('falls back to Hardy when no nature is given', () => {
    expect(only('Garchomp\n- Earthquake').nature).toBe('hardy')
  })

  it('keeps Hardy written out', () => {
    expect(only('Garchomp\nHardy Nature').nature).toBe('hardy')
  })
})

describe('EVs and IVs', () => {
  it('reads a spread', () => {
    expect(only('Garchomp\nEVs: 252 Atk / 4 Def / 252 Spe').evs).toEqual({
      hp: 0,
      atk: 252,
      def: 4,
      spa: 0,
      spd: 0,
      spe: 252,
    })
  })

  it('reads a spread written label-first', () => {
    expect(only('Garchomp\nEVs: Atk 252').evs.atk).toBe(252)
  })

  it('reads a spread with no spaces around the separator', () => {
    expect(only('Garchomp\nEVs: 252 Atk/252 Spe').evs.spe).toBe(252)
  })

  it('treats SpD as Special Defense', () => {
    expect(only('Garchomp\nEVs: 252 SpD').evs.spd).toBe(252)
  })

  it('treats SAtk as Special Attack', () => {
    expect(only('Garchomp\nEVs: 252 SAtk').evs.spa).toBe(252)
  })

  it('leaves unmentioned EVs at zero', () => {
    expect(only('Garchomp\nEVs: 252 Atk').evs.hp).toBe(0)
  })

  it('defaults the whole spread to zero', () => {
    expect(only('Garchomp').evs).toEqual(EMPTY_EVS)
  })

  it('reads a partial IV line', () => {
    expect(only('Garchomp\nIVs: 0 SpA').ivs).toEqual({ ...PERFECT_IVS, spa: 0 })
  })

  it('defaults IVs to perfect', () => {
    expect(only('Garchomp').ivs).toEqual(PERFECT_IVS)
  })

  it('reports a spread over the legal total', () => {
    expect(problems('Garchomp\nEVs: 252 HP / 252 Atk / 252 Spe')[0]).toMatchObject({
      kind: 'ev-total-exceeded',
      total: 756,
      max: 508,
    })
  })

  it('keeps the set that overspent', () => {
    expect(only('Garchomp\nEVs: 252 HP / 252 Atk / 252 Spe').evs.hp).toBe(252)
  })

  it('reports a stat it does not know', () => {
    expect(problems('Garchomp\nEVs: 252 Vibes')[0]).toMatchObject({
      kind: 'unknown-stat',
      value: 'Vibes',
    })
  })
})

describe('move lines', () => {
  it('reads a hyphen bullet', () => {
    expect(only('Garchomp\n- Earthquake').moves[0]).toBe('earthquake')
  })

  it('reads a tilde bullet', () => {
    expect(only('Garchomp\n~ Earthquake').moves[0]).toBe('earthquake')
  })

  it('reads a bullet with no space after it', () => {
    expect(only('Garchomp\n-Earthquake').moves[0]).toBe('earthquake')
  })

  it('fills slots in order', () => {
    expect(only('Garchomp\n- Earthquake\n- Protect').moves).toEqual([
      'earthquake',
      'protect',
      null,
      null,
    ])
  })

  it('leaves every slot empty when there are no move lines', () => {
    expect(only('Garchomp').moves).toEqual([null, null, null, null])
  })

  it('strips the bracketed type off Hidden Power', () => {
    expect(problems('Garchomp\n- Hidden Power [Fire]')[0]).toMatchObject({
      kind: 'unknown-move',
      id: 'hidden-power-fire',
    })
  })

  it('strips the trailing base power too', () => {
    expect(problems('Garchomp\n- Hidden Power [Fire] 60')[0]).toMatchObject({
      kind: 'unknown-move',
      id: 'hidden-power-fire',
    })
  })

  it('reports a fifth move', () => {
    const paste = 'Garchomp\n- Earthquake\n- Protect\n- Dragon Claw\n- Swords Dance\n- Fake Out'
    expect(problems(paste)[0]).toMatchObject({ kind: 'too-many-moves', limit: 4 })
  })

  it('keeps the first four', () => {
    const paste = 'Garchomp\n- Earthquake\n- Protect\n- Dragon Claw\n- Swords Dance\n- Fake Out'
    expect(only(paste).moves).toEqual(['earthquake', 'protect', 'dragon-claw', 'swords-dance'])
  })
})

describe('whitespace and line endings', () => {
  const LF = 'Garchomp @ Choice Band\nAbility: Rough Skin\n- Earthquake'

  it('parses CRLF the same as LF', () => {
    const crlf = parse({ paste: LF.replaceAll('\n', '\r\n'), dex: fixtureDex })
    expect(setsOf(crlf)).toEqual(setsOf(parse({ paste: LF, dex: fixtureDex })))
  })

  it('ignores trailing whitespace', () => {
    const padded = LF.split('\n')
      .map((line) => `${line}   `)
      .join('\n')
    expect(setsOf(parse({ paste: padded, dex: fixtureDex }))).toEqual(
      setsOf(parse({ paste: LF, dex: fixtureDex })),
    )
  })

  it('ignores extra blank lines between sets', () => {
    const paste = `\n\n${LF}\n\n\n\nDondozo\n\n`
    expect(setsOf(parse({ paste, dex: fixtureDex }))).toHaveLength(2)
  })

  it('ignores a Pokepaste team header', () => {
    const paste = `=== [gen9vgc2026regh] Rain ===\n\n${LF}`
    expect(setsOf(parse({ paste, dex: fixtureDex }))).toHaveLength(1)
  })
})

describe('problems never cost the caller a set', () => {
  const paste = [
    'Garchomp @ Choice Band',
    'Ability: Rough Skin',
    '- Earthquake',
    '- Splash',
    '',
    'Dondozo',
    '- Body Press',
  ].join('\n')

  it('still returns both sets', () => {
    expect(setsOf(parse({ paste, dex: fixtureDex }))).toHaveLength(2)
  })

  it('reports the unknown move', () => {
    expect(problems(paste)[0]).toMatchObject({ kind: 'unknown-move', id: 'splash' })
  })

  it('locates the unknown move by line', () => {
    expect(problems(paste)[0]?.line).toBe(4)
  })

  it('locates the unknown move by block', () => {
    expect(problems(paste)[0]?.block).toBe(1)
  })

  it('keeps the moves that did resolve', () => {
    expect(setsOf(parse({ paste, dex: fixtureDex }))[0]?.moves[0]).toBe('earthquake')
  })

  it('says the result is partial', () => {
    expect(parse({ paste, dex: fixtureDex }).kind).toBe('partial')
  })
})

describe('things the dataset does not know', () => {
  it('drops a set whose species is unknown', () => {
    expect(setsOf(parse({ paste: 'Pikachu\n- Protect', dex: fixtureDex }))).toEqual([])
  })

  it('reports the unknown species', () => {
    expect(problems('Pikachu\n- Protect')[0]).toMatchObject({
      kind: 'unknown-species',
      id: 'pikachu',
    })
  })

  it('keeps the other sets in the paste', () => {
    const paste = 'Pikachu\n- Protect\n\nDondozo\n- Body Press'
    expect(setsOf(parse({ paste, dex: fixtureDex }))).toHaveLength(1)
  })

  it('reports an unknown item and leaves the slot empty', () => {
    expect(only('Garchomp @ Berserk Gene').item).toBeNull()
  })

  it('names the unknown item', () => {
    expect(problems('Garchomp @ Berserk Gene')[0]).toMatchObject({
      kind: 'unknown-item',
      id: 'berserk-gene',
    })
  })

  it('names the unknown ability', () => {
    expect(problems('Garchomp\nAbility: Vibe Check')[0]).toMatchObject({
      kind: 'unknown-ability',
      id: 'vibe-check',
    })
  })

  it('names the unknown nature', () => {
    expect(problems('Garchomp\nSpicy Nature')[0]).toMatchObject({
      kind: 'unknown-nature',
      value: 'Spicy',
    })
  })

  it('names the unknown Tera type', () => {
    expect(problems('Garchomp\nTera Type: Wood')[0]).toMatchObject({
      kind: 'unknown-tera-type',
      value: 'Wood',
    })
  })

  it('names a field it does not model', () => {
    expect(problems('Garchomp\nHappiness: 0')[0]).toMatchObject({
      kind: 'unsupported-field',
      field: 'Happiness',
    })
  })

  it('reports a line it cannot read at all', () => {
    expect(problems('Garchomp\nwhat even is this')[0]).toMatchObject({
      kind: 'malformed-line',
      line: 2,
    })
  })
})

describe('the result type', () => {
  it('is empty for an empty paste', () => {
    expect(parse({ paste: '   \n\n', dex: fixtureDex }).kind).toBe('empty')
  })

  it('carries no sets when empty', () => {
    expect(setsOf(parse({ paste: '', dex: fixtureDex }))).toEqual([])
  })

  it('carries no problems when clean', () => {
    expect(problemsOf(parse({ paste: 'Garchomp', dex: fixtureDex }))).toEqual([])
  })

  it('mints sequential ids when the caller gives no factory', () => {
    expect(setsOf(parse({ paste: 'Garchomp\n\nDondozo', dex: fixtureDex }))[1]?.id).toBe(
      'imported-2',
    )
  })

  it('describes a problem in one plain line', () => {
    const problem = problems('Garchomp\nAbility: Vibe Check')[0]
    expect(problem === undefined ? '' : describeProblem(problem)).toBe(
      'No ability "vibe-check" in the dataset',
    )
  })
})
