'use server'

import { revalidatePath } from 'next/cache'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import type { PokemonSet, SetId } from '@spc/core'
import {
  abilityId,
  isNature,
  isTeraType,
  itemId,
  MAX_EV_PER_STAT,
  MAX_EV_TOTAL,
  MAX_IV,
  moveId,
  STATS,
} from '@spc/core'
import { requireUser } from '../auth/session.js'
import { db } from '../db/client.js'
import { pokemonSets } from '../db/schema.js'
import { toDomainSet } from '../data/mappers.js'
import { saveSet } from '../data/teams.js'

/**
 * One action for every edit to a set.
 *
 * The client sends a whole patch rather than one field at a time, because a
 * spread edit changes several stats at once and applying those as separate
 * writes would let a reload land halfway through one.
 */

const statSpread = z.object(
  Object.fromEntries(STATS.map((stat) => [stat, z.number().int().min(0)])) as Record<
    (typeof STATS)[number],
    z.ZodNumber
  >,
)

const patchSchema = z.object({
  nickname: z.string().trim().max(24).nullable().optional(),
  level: z.number().int().min(1).max(100).optional(),
  ability: z.string().nullable().optional(),
  item: z.string().nullable().optional(),
  nature: z.string().optional(),
  teraType: z.string().nullable().optional(),
  shiny: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
  evs: statSpread.optional(),
  ivs: statSpread.optional(),
  moves: z.array(z.string().nullable()).length(4).optional(),
})

export type SetPatch = z.infer<typeof patchSchema>

export type SaveSetResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly message: string }

export async function updateSetAction(
  setId: string,
  patch: SetPatch,
): Promise<SaveSetResult> {
  try {
    const user = await requireUser(new Date())
    const parsed = patchSchema.parse(patch)

    const row = await db.query.pokemonSets.findFirst({
      where: and(eq(pokemonSets.id, setId), eq(pokemonSets.userId, user.id)),
    })
    if (row === undefined) return { ok: false, message: 'That set no longer exists.' }

    const current = toDomainSet(row)
    const next = applyPatch(current, parsed)

    const evTotal = STATS.reduce((sum, stat) => sum + next.evs[stat], 0)
    if (evTotal > MAX_EV_TOTAL) {
      return { ok: false, message: `That spread uses ${evTotal} EVs. The cap is ${MAX_EV_TOTAL}.` }
    }

    await saveSet({ userId: user.id, set: next, now: new Date() })

    if (row.teamId !== null) revalidatePath(`/teams/${row.teamId}`)
    revalidatePath('/box')
    return { ok: true }
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Could not save.' }
  }
}

function applyPatch(set: PokemonSet, patch: SetPatch): PokemonSet {
  const nature = patch.nature !== undefined && isNature(patch.nature) ? patch.nature : set.nature
  const tera =
    patch.teraType === undefined
      ? set.teraType
      : patch.teraType === null || !isTeraType(patch.teraType)
        ? null
        : patch.teraType

  return {
    ...set,
    id: set.id as SetId,
    nickname: patch.nickname === undefined ? set.nickname : normalizeNickname(patch.nickname),
    level: patch.level ?? set.level,
    ability:
      patch.ability === undefined
        ? set.ability
        : patch.ability === null
          ? null
          : abilityId(patch.ability),
    item: patch.item === undefined ? set.item : patch.item === null ? null : itemId(patch.item),
    nature,
    teraType: tera,
    shiny: patch.shiny ?? set.shiny,
    notes: patch.notes ?? set.notes,
    evs: patch.evs === undefined ? set.evs : clampSpread(patch.evs, MAX_EV_PER_STAT),
    ivs: patch.ivs === undefined ? set.ivs : clampSpread(patch.ivs, MAX_IV),
    moves:
      patch.moves === undefined
        ? set.moves
        : ([0, 1, 2, 3].map((index) => {
            const value = patch.moves?.[index]
            return value === undefined || value === null || value === '' ? null : moveId(value)
          }) as PokemonSet['moves']),
  }
}

function normalizeNickname(value: string | null): string | null {
  if (value === null) return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function clampSpread(
  spread: Record<string, number>,
  max: number,
): PokemonSet['evs'] {
  return Object.fromEntries(
    STATS.map((stat) => [stat, Math.max(0, Math.min(max, spread[stat] ?? 0))]),
  ) as PokemonSet['evs']
}
