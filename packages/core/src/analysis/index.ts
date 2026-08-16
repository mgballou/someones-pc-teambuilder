/**
 * The analysis layer.
 *
 * Three pure functions of a team, a format and the dex. No clock, no
 * randomness, no I/O — the same call returns the same report in a test, on the
 * server and in the browser.
 */

export * from './legality'
export * from './coverage'
export * from './speed'
