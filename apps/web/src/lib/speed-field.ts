import { CLEAR_FIELD, TERRAINS, WEATHERS } from '@spc/core'
import type { SpeedField } from '@spc/core'

/**
 * The field the query string asks for.
 *
 * The URL is the state, so a ladder read under rain is a link a person can
 * keep. Anything the URL cannot be trusted to say — a typo, a repeated
 * parameter, a weather that does not exist — reads as clear. A query string
 * nobody typed on purpose is not worth an error page.
 */
export function fieldFromQuery(
  query: Readonly<Record<string, string | string[] | undefined>>,
): SpeedField {
  return {
    weather: oneOf(WEATHERS, query['weather']) ?? CLEAR_FIELD.weather,
    terrain: oneOf(TERRAINS, query['terrain']) ?? CLEAR_FIELD.terrain,
  }
}

function oneOf<T extends string>(
  allowed: readonly T[],
  value: string | string[] | undefined,
): T | null {
  if (typeof value !== 'string') return null
  return allowed.find((option) => option === value) ?? null
}
