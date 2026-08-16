/**
 * The shipped formats.
 *
 * A registry, not a switch. Callers look a format up by id and then ask it for
 * its rules; nothing in the codebase reads an id and branches on it.
 */

import type { Format } from '../format.js'
import type { FormatId } from '../ids.js'
import { gen9Ou, gen9Ubers } from './smogon.js'
import { unrestricted } from './unrestricted.js'
import { regulationG, regulationH, regulationI } from './vgc.js'

export {
  VERIFIED_ON,
  VGC_RESTRICTED_SPECIES,
  regulationG,
  regulationH,
  regulationI,
} from './vgc.js'
export { gen9Ou, gen9Ubers } from './smogon.js'
export { unrestricted } from './unrestricted.js'

/**
 * Every format the app ships with, in the order the format picker shows them:
 * the current VGC regulations first, then the singles tiers, then the sandbox.
 */
export const SHIPPED_FORMATS: readonly Format[] = [
  regulationI,
  regulationH,
  regulationG,
  gen9Ou,
  gen9Ubers,
  unrestricted,
]

const BY_ID: ReadonlyMap<string, Format> = new Map(
  SHIPPED_FORMATS.map((format) => [format.id, format]),
)

export function shippedFormat(id: FormatId): Format | undefined {
  return BY_ID.get(id)
}
