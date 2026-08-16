import { NextResponse } from 'next/server'
import { speciesId } from '@spc/core'
import type { Ability, Item, Move, Species } from '@spc/core'
import { dex } from '../../../lib/dex.js'
import type { DexPayload } from '../../../lib/mini-dex.js'

/**
 * The records one calculation can touch, and no more.
 *
 * The client rebuilds a `Dex` over this and runs the real calculator locally,
 * so tuning weather or a boost costs nothing. See `lib/mini-dex.ts`.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const wanted = params.getAll('species').map(speciesId)

  const catalog = dex()

  const species: Species[] = []
  const moves = new Map<string, Move>()
  const items = new Map<string, Item>()
  const abilities = new Map<string, Ability>()

  for (const id of wanted) {
    const found = catalog.species(id)
    if (found === undefined) continue
    species.push(found)

    for (const abilityId of [...found.abilities, found.hiddenAbility]) {
      if (abilityId === null) continue
      const ability = catalog.ability(abilityId)
      if (ability !== undefined) abilities.set(ability.id, ability)
    }
  }

  for (const id of params.getAll('move')) {
    const move = catalog.move(id as Parameters<typeof catalog.move>[0])
    if (move !== undefined) moves.set(move.id, move)
  }

  for (const id of params.getAll('item')) {
    const item = catalog.item(id as Parameters<typeof catalog.item>[0])
    if (item !== undefined) items.set(item.id, item)
  }

  const payload: DexPayload = {
    species,
    moves: [...moves.values()],
    items: [...items.values()],
    abilities: [...abilities.values()],
    formats: [],
  }

  return NextResponse.json(payload)
}
