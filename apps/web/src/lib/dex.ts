import 'server-only'

import type { Dex, Format, FormatId, Species, SpeciesId } from '@spc/core'
import { requireFormat } from '@spc/core'
import { loadDex } from '@spc/dex'

/**
 * The app's single handle on the dataset.
 *
 * Loading is synchronous and happens once per process. Everything downstream
 * treats the dex as a plain value, which is what lets pages resolve ids into
 * view models on the server and hand components plain objects.
 */

let cached: Dex | null = null

export function dex(): Dex {
  const loaded = cached ?? loadDex()
  cached = loaded
  return loaded
}

export function formatOf(formatId: FormatId): Format {
  return requireFormat(dex(), formatId)
}

export function speciesOf(id: SpeciesId): Species | undefined {
  return dex().species(id)
}

export function speciesName(id: SpeciesId): string {
  const found = dex().species(id)
  return found === undefined ? id : displayNameOf(found)
}

export function displayNameOf(species: Species): string {
  return species.formName === null ? species.name : `${species.name}-${species.formName}`
}
