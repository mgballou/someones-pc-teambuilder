import { describe, expect, it } from 'vitest'
import type { Move, MoveFlags } from '@spc/core'
import { BUNDLED_DATASET } from '../../../src/bundled'
import {
  BITE_MOVES,
  BULLET_MOVES,
  BYPASS_SUBSTITUTE_MOVES,
  CONTACT_MOVES,
  IGNORES_DEFENSE_BOOSTS_MOVES,
  POWDER_MOVES,
  PULSE_MOVES,
  PUNCH_MOVES,
  SLICING_MOVES,
  SOUND_MOVES,
  UNPROTECTABLE_MOVES,
  WIND_MOVES,
} from '../../../src/ingest/curated/move-flags'

const moves = new Map<string, Move>(BUNDLED_DATASET.moves.map((m) => [m.id, m]))

const TABLES = [
  ['CONTACT_MOVES', CONTACT_MOVES, 'contact', true],
  ['SOUND_MOVES', SOUND_MOVES, 'sound', true],
  ['PUNCH_MOVES', PUNCH_MOVES, 'punch', true],
  ['BITE_MOVES', BITE_MOVES, 'bite', true],
  ['SLICING_MOVES', SLICING_MOVES, 'slicing', true],
  ['BULLET_MOVES', BULLET_MOVES, 'bullet', true],
  ['WIND_MOVES', WIND_MOVES, 'wind', true],
  ['POWDER_MOVES', POWDER_MOVES, 'powder', true],
  ['PULSE_MOVES', PULSE_MOVES, 'pulse', true],
  ['BYPASS_SUBSTITUTE_MOVES', BYPASS_SUBSTITUTE_MOVES, 'bypassSubstitute', true],
  ['IGNORES_DEFENSE_BOOSTS_MOVES', IGNORES_DEFENSE_BOOSTS_MOVES, 'ignoresDefenseBoosts', true],
  ['UNPROTECTABLE_MOVES', UNPROTECTABLE_MOVES, 'protectable', false],
] as const satisfies readonly (readonly [string, ReadonlySet<string>, keyof MoveFlags, boolean])[]

describe.each(TABLES)('%s', (_, names, flag, value) => {
  it('names only moves the dataset holds', () => {
    expect([...names].filter((id) => !moves.has(id))).toEqual([])
  })

  it(`sets ${flag} to ${String(value)} on every move it names`, () => {
    expect([...names].filter((id) => moves.get(id)?.flags[flag] !== value)).toEqual([])
  })
})
