import { describe, expect, it } from 'vitest'
import { moveId } from '../../src/index'
import {
  calculate,
  DEFAULT_FIELD,
  ImpossibleState,
  newAttacker,
  newDefender,
  UncalculableMove,
} from '../../src/damage/index'
import { MissingFromDex } from '../../src/index'
import { fixtureDex } from '../fixtures/dex'
import { buildSet } from './helpers'

function caught(run: () => unknown): unknown {
  try {
    run()
  } catch (error) {
    return error
  }
  throw new Error('expected the call to throw')
}

const chomp = buildSet({ species: 'garchomp' })
const rotom = buildSet({ species: 'rotom-wash' })

function calculateWith(move: string, attacker = chomp, defender = rotom) {
  return () =>
    calculate({
      attacker: newAttacker({ set: attacker }),
      defender: newDefender({ set: defender }),
      move: moveId(move),
      field: DEFAULT_FIELD,
      dex: fixtureDex,
    })
}

describe('UncalculableMove.status', () => {
  const error = UncalculableMove.status(moveId('swords-dance'))

  it('records the reason', () => {
    expect(error.reason).toBe('status')
  })

  it('records the move', () => {
    expect(error.move).toBe('swords-dance')
  })

  it('writes the message', () => {
    expect(error.message).toBe('"swords-dance" is a status move and deals no damage')
  })

  it('names itself', () => {
    expect(error.name).toBe('UncalculableMove')
  })
})

describe('UncalculableMove.noPower', () => {
  const error = UncalculableMove.noPower(moveId('beat-up'))

  it('records the reason', () => {
    expect(error.reason).toBe('no-power')
  })

  it('writes the message', () => {
    expect(error.message).toBe('"beat-up" has no base power and no rule for computing one')
  })
})

describe('ImpossibleState.unreachable', () => {
  it('names the value that fell through', () => {
    expect(ImpossibleState.unreachable({ kind: 'hail' } as never).message).toBe(
      'Unhandled variant: {"kind":"hail"}',
    )
  })

  it('names itself', () => {
    expect(ImpossibleState.unreachable('snow' as never).name).toBe('ImpossibleState')
  })
})

describe('calculate on input it cannot answer', () => {
  it('throws UncalculableMove for a status move', () => {
    expect(caught(calculateWith('swords-dance'))).toBeInstanceOf(UncalculableMove)
  })

  it('says a status move is why', () => {
    expect(calculateWith('swords-dance')).toThrow(
      '"swords-dance" is a status move and deals no damage',
    )
  })

  it('throws MissingFromDex for a move the dataset does not hold', () => {
    expect(calculateWith('hyper-beam')).toThrow('No move in the dataset with id "hyper-beam"')
  })

  it('throws MissingFromDex for an attacker the dataset does not hold', () => {
    expect(caught(calculateWith('earthquake', buildSet({ species: 'missingno' })))).toBeInstanceOf(
      MissingFromDex,
    )
  })

  it('names the defender the dataset does not hold', () => {
    expect(calculateWith('earthquake', chomp, buildSet({ species: 'missingno' }))).toThrow(
      'No species in the dataset with id "missingno"',
    )
  })
})
