/**
 * The public surface of `@spc/core`.
 *
 * Everything the rest of the workspace may import lives here. Reaching into
 * `@spc/core/src/...` from another package is a layering break and lint says
 * so. Each module below adds its own exports to this file — keep the sections
 * in dependency order, primitives first.
 */

// Primitives
export * from './ids'
export * from './pokemon-type'
export * from './stats'

// Domain records
export * from './species'
export * from './move'
export * from './item'
export * from './set'
export * from './team'
export * from './format'

// The data seam
export * from './dex'

// Formats that ship with the app
export * from './formats/index'

// The damage calculator
export * from './damage/index'

// Analysis
export * from './analysis/index'

// Text interchange
export * from './showdown/index'
