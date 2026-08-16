/**
 * The public surface of `@spc/core`.
 *
 * Everything the rest of the workspace may import lives here. Reaching into
 * `@spc/core/src/...` from another package is a layering break and lint says
 * so. Each module below adds its own exports to this file — keep the sections
 * in dependency order, primitives first.
 */

// Primitives
export * from './ids.js'
export * from './pokemon-type.js'
export * from './stats.js'

// Domain records
export * from './species.js'
export * from './move.js'
export * from './item.js'
export * from './set.js'
export * from './team.js'
export * from './format.js'

// The data seam
export * from './dex.js'
