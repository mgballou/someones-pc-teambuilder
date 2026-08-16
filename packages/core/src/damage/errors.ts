import type { MoveId } from '../ids.js'

/**
 * A move the damage formula cannot be run on at all.
 *
 * Distinct from a move that deals zero — an immunity is an answer, and the
 * calculator returns it with rolls of zero and a note. This is the case where
 * the caller asked the wrong question.
 */
export class UncalculableMove extends Error {
  override readonly name = 'UncalculableMove'

  private constructor(
    readonly reason: 'status' | 'no-power',
    readonly move: MoveId,
    message: string,
  ) {
    super(message)
  }

  static status(move: MoveId): UncalculableMove {
    return new UncalculableMove('status', move, `"${move}" is a status move and deals no damage`)
  }

  static noPower(move: MoveId): UncalculableMove {
    return new UncalculableMove(
      'no-power',
      move,
      `"${move}" has no base power and no rule for computing one`,
    )
  }
}

/**
 * A union grew a member and a switch did not. Thrown from the `never` arm of
 * every exhaustive switch in this directory, so the failure names the value
 * instead of falling through with a wrong answer.
 */
export class ImpossibleState extends Error {
  override readonly name = 'ImpossibleState'

  private constructor(message: string) {
    super(message)
  }

  static unreachable(value: never): ImpossibleState {
    return new ImpossibleState(`Unhandled variant: ${JSON.stringify(value)}`)
  }
}
