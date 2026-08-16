import { describe, expect, it } from 'vitest'
import { FakePokeApiClient } from '../../src/pokeapi/client.js'
import { SAMPLE_PAYLOADS } from '../../src/pokeapi/fixtures/index.js'
import { normalizeMove } from '../../src/ingest/moves.js'

const client = FakePokeApiClient.of(SAMPLE_PAYLOADS)

const move = async (name: string) => normalizeMove(await client.move(name))

describe('accuracy', () => {
  it('keeps null for a move that cannot miss', async () => {
    expect((await move('aerial-ace')).accuracy).toBeNull()
  })

  it('flags that move as always hitting', async () => {
    expect((await move('aerial-ace')).flags.alwaysHits).toBe(true)
  })

  it('does not flag a self-targeting move as always hitting', async () => {
    expect((await move('swords-dance')).flags.alwaysHits).toBe(false)
  })

  it('keeps a real accuracy as a number', async () => {
    expect((await move('earthquake')).accuracy).toBe(100)
  })
})

describe('targets', () => {
  it('maps all-other-pokemon onto all-adjacent', async () => {
    expect((await move('earthquake')).target).toBe('all-adjacent')
  })

  it('maps selected-pokemon onto selected-target', async () => {
    expect((await move('close-combat')).target).toBe('selected-target')
  })
})

describe('meta', () => {
  it('reads a multi-hit range off PokéAPI', async () => {
    expect((await move('surging-strikes')).multiHit).toEqual({ min: 3, max: 3 })
  })

  it('reads a crit ratio off PokéAPI', async () => {
    expect((await move('surging-strikes')).critRatio).toBe(6)
  })

  it('falls back to the curated table when meta is null', async () => {
    expect((await move('wave-crash')).recoil).toBeCloseTo(0.33)
  })

  it('leaves drain at zero for a move that does not drain', async () => {
    expect((await move('earthquake')).drain).toBe(0)
  })
})

describe('stat changes', () => {
  it('puts a damage-raise change on the user', async () => {
    expect((await move('close-combat')).statChanges[0]?.target).toBe('user')
  })

  it('keeps the change negative', async () => {
    expect((await move('close-combat')).statChanges[0]?.stages).toBe(-1)
  })
})

describe('flags', () => {
  it('reads contact off the curated list', async () => {
    expect((await move('close-combat')).flags.contact).toBe(true)
  })

  it('leaves contact false for a move that does not make it', async () => {
    expect((await move('earthquake')).flags.contact).toBe(false)
  })

  it('marks a self-targeting move unprotectable', async () => {
    expect((await move('swords-dance')).flags.protectable).toBe(false)
  })
})

describe('variable power', () => {
  it('names the rule for a fixed-damage move', async () => {
    expect((await move('night-shade')).variablePower).toEqual({ kind: 'level-damage' })
  })

  it('leaves a constant-power move alone', async () => {
    expect((await move('earthquake')).variablePower).toBeNull()
  })
})
