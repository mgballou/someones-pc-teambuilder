/**
 * The shipped formats.
 *
 * A registry, not a switch. Callers look a format up by id and then ask it for
 * its rules; nothing in the codebase reads an id and branches on it.
 */

import type { Format } from '../format'
import type { FormatId } from '../ids'
import { gen9Ou, gen9Ubers } from './smogon'
import { unrestricted } from './unrestricted'
import { regulationG, regulationH, regulationI } from './vgc'

export {
  VGC_STALE_AFTER_DAYS,
  VGC_VERIFIED_ON,
  VGC_RESTRICTED_SPECIES,
  regulationG,
  regulationH,
  regulationI,
} from './vgc'
export { SMOGON_STALE_AFTER_DAYS, SMOGON_VERIFIED_ON, gen9Ou, gen9Ubers } from './smogon'
export { unrestricted } from './unrestricted'

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

/**
 * Ids a shipped format used to carry, and the id it carries now.
 *
 * The VGC regulations were first shipped with the year in their ids. A team
 * saved then stores the old id, and still has to open.
 */
const RENAMED: ReadonlyMap<string, FormatId> = new Map([
  ['vgc-2026-reg-g', regulationG.id],
  ['vgc-2026-reg-h', regulationH.id],
  ['vgc-2026-reg-i', regulationI.id],
])

/** The id a format carries now, for an id that may have been stored under an old one. */
export function currentFormatId(id: FormatId): FormatId {
  return RENAMED.get(id) ?? id
}
