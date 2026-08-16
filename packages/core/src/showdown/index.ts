/**
 * Showdown paste import and export.
 *
 * `serialize` writes the format; `parse` reads it and reports what it could
 * not. `parse(serialize(set))` is the same set — that round-trip is the
 * guarantee the module exists to hold, and every other decision here defers
 * to it.
 *
 * Two things a paste cannot carry, and so do not survive the trip:
 *
 * - **Notes.** The format has no field for them. An imported set has none.
 * - **Genderless.** Showdown marks male and female and nothing else, so a set
 *   whose gender is `'genderless'` exports without a marker and imports back
 *   as `null`. Both mean "no gender to show"; only one of them round-trips.
 */

export * from './parse'
export * from './problems'
export * from './resolve'
export * from './serialize'
