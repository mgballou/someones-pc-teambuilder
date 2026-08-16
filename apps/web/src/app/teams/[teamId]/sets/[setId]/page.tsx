import { notFound } from 'next/navigation'
import { NATURES, TERA_TYPES, allowsTera } from '@spc/core'
import { loadTeam } from '../../../../../lib/team-view.js'
import { dex } from '../../../../../lib/dex.js'
import { SetEditor } from '../../../../../components/set-editor.js'

export default async function SetEditorPage({
  params,
}: {
  readonly params: Promise<{ readonly teamId: string; readonly setId: string }>
}) {
  const { teamId, setId } = await params
  const { format, views } = await loadTeam(teamId)

  const view = views.find((candidate) => candidate.id === setId)
  if (view === undefined) notFound()

  const catalog = dex()
  const species = catalog.species(view.set.species)
  if (species === undefined) notFound()

  const abilities = [...species.abilities, ...(species.hiddenAbility === null ? [] : [species.hiddenAbility])]
    .map((id) => catalog.ability(id))
    .flatMap((ability) => (ability === undefined ? [] : [{ id: ability.id, name: ability.name }]))

  const moves = catalog
    .learnset(species.id)
    .flatMap((id) => {
      const move = catalog.move(id)
      return move === undefined
        ? []
        : [
            {
              id: move.id,
              name: move.name,
              type: move.type,
              category: move.category,
              basePower: move.basePower,
              accuracy: move.accuracy,
            },
          ]
    })
    .sort((left, right) => left.name.localeCompare(right.name))

  return (
    <SetEditor
      teamId={teamId}
      view={view}
      abilities={abilities}
      moves={moves}
      natures={[...NATURES]}
      teraTypes={allowsTera(format) ? [...TERA_TYPES] : []}
      levelFixed={format.level.kind === 'fixed' ? format.level.level : null}
    />
  )
}
