import { filledMoves } from '@spc/core'
import type { Ability, Item, Move, Species } from '@spc/core'
import { loadTeam } from '../../../../lib/team-view'
import { dex } from '../../../../lib/dex'
import { DamagePanel, type AttackerOption } from '../../../../components/damage-panel'
import type { DexPayload } from '../../../../lib/mini-dex'

export default async function DamagePage({
  params,
}: {
  readonly params: Promise<{ readonly teamId: string }>
}) {
  const { teamId } = await params
  const { team, format, views } = await loadTeam(teamId)
  const catalog = dex()

  const attackers: AttackerOption[] = views.flatMap((view) => {
    const moves = filledMoves(view.set).flatMap((id) => {
      const move = catalog.move(id)
      return move === undefined || move.category === 'status'
        ? []
        : [{ id: move.id as string, name: move.name }]
    })
    return moves.length === 0
      ? []
      : [{ setId: view.id, label: view.speciesName, set: view.set, moves }]
  })

  const species: Species[] = []
  const moves = new Map<string, Move>()
  const items = new Map<string, Item>()
  const abilities = new Map<string, Ability>()

  for (const view of views) {
    const found = catalog.species(view.set.species)
    if (found !== undefined) {
      species.push(found)
      for (const id of [...found.abilities, found.hiddenAbility]) {
        if (id === null) continue
        const ability = catalog.ability(id)
        if (ability !== undefined) abilities.set(ability.id, ability)
      }
    }
    for (const id of filledMoves(view.set)) {
      const move = catalog.move(id)
      if (move !== undefined) moves.set(move.id, move)
    }
    if (view.set.item !== null) {
      const item = catalog.item(view.set.item)
      if (item !== undefined) items.set(item.id, item)
    }
  }

  const basePayload: DexPayload = {
    species,
    moves: [...moves.values()],
    items: [...items.values()],
    abilities: [...abilities.values()],
    formats: [],
  }

  return (
    <DamagePanel
      attackers={attackers}
      basePayload={basePayload}
      style={format.style}
      level={format.level.kind === 'fixed' ? format.level.level : (team.members[0]?.level ?? 100)}
    />
  )
}
