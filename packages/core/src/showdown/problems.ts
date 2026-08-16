/**
 * What a paste got wrong.
 *
 * Importing is forgiving in input and strict in output: a line the dataset
 * cannot resolve never becomes a half-built set and never becomes a thrown
 * error. It becomes one of these, alongside whatever else parsed cleanly, and
 * the caller decides whether to show it, ignore it or refuse the import.
 */

import type { AbilityId, ItemId, MoveId, SpeciesId } from '../ids'

/** Where a problem was found. */
export type ProblemLocation = {
  /** 1-based line number in the original paste. */
  readonly line: number
  /** 1-based index of the set block the line belongs to. */
  readonly block: number
  /** The offending line, whitespace trimmed. */
  readonly text: string
}

/** Every problem carries its location, so the union stays a union of whole shapes. */
type Located<T> = ProblemLocation & T

export type ParseProblem =
  | Located<{ readonly kind: 'unknown-species'; readonly id: SpeciesId }>
  | Located<{ readonly kind: 'unknown-move'; readonly id: MoveId }>
  | Located<{ readonly kind: 'unknown-item'; readonly id: ItemId }>
  | Located<{ readonly kind: 'unknown-ability'; readonly id: AbilityId }>
  | Located<{ readonly kind: 'unknown-nature'; readonly value: string }>
  | Located<{ readonly kind: 'unknown-tera-type'; readonly value: string }>
  | Located<{ readonly kind: 'unknown-stat'; readonly value: string }>
  | Located<{ readonly kind: 'ev-total-exceeded'; readonly total: number; readonly max: number }>
  | Located<{ readonly kind: 'too-many-moves'; readonly limit: number }>
  /** A line the format defines but this app does not model, such as Happiness. */
  | Located<{ readonly kind: 'unsupported-field'; readonly field: string }>
  | Located<{ readonly kind: 'malformed-line' }>

export type ProblemKind = ParseProblem['kind']

/** Plain one-line description, for the interface. States the fact, nothing more. */
export function describeProblem(problem: ParseProblem): string {
  switch (problem.kind) {
    case 'unknown-species':
      return `No species "${problem.id}" in the dataset`
    case 'unknown-move':
      return `No move "${problem.id}" in the dataset`
    case 'unknown-item':
      return `No item "${problem.id}" in the dataset`
    case 'unknown-ability':
      return `No ability "${problem.id}" in the dataset`
    case 'unknown-nature':
      return `"${problem.value}" is not a nature`
    case 'unknown-tera-type':
      return `"${problem.value}" is not a Tera type`
    case 'unknown-stat':
      return `"${problem.value}" is not a stat`
    case 'ev-total-exceeded':
      return `${problem.total} EVs spent, ${problem.max} allowed`
    case 'too-many-moves':
      return `More than ${problem.limit} moves. The rest were dropped`
    case 'unsupported-field':
      return `${problem.field} is not modelled and was dropped`
    case 'malformed-line':
      return 'Line not understood'
    default: {
      const exhaustive: never = problem
      return exhaustive
    }
  }
}
