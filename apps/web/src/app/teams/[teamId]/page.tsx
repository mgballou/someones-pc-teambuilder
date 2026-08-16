import { loadTeam } from '../../../lib/team-view.js'
import { listTeams } from '../../../data/teams.js'
import { currentUser } from '../../../auth/session.js'
import { redirect } from 'next/navigation'
import { SetCard, EmptySlot } from '../../../components/set-card.js'
import { SlotActions } from '../../../components/slot-actions.js'
import { AddSpecies } from '../../../components/add-species.js'
import { PasteImport } from '../../../components/paste-import.js'
import { Panel } from '../../../components/panel.js'

export default async function BuildPage({
  params,
}: {
  readonly params: Promise<{ readonly teamId: string }>
}) {
  const { teamId } = await params
  const user = await currentUser(new Date())
  if (user === null) redirect('/sign-in')

  const { team, format, views } = await loadTeam(teamId)
  const others = (await listTeams(user.id)).filter((candidate) => candidate.id !== team.id)
  const emptySlots = Math.max(0, format.teamSize - views.length)

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_20rem]">
      <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
        {views.map((view, index) => (
          <SetCard key={view.id} view={view} slotNumber={index + 1}>
            <SlotActions
              teamId={team.id}
              setId={view.id}
              index={index}
              lastIndex={views.length - 1}
              otherTeams={others.map((other) => ({ id: other.id, name: other.name }))}
              order={views.map((each) => each.id)}
            />
          </SetCard>
        ))}

        {Array.from({ length: emptySlots }, (_, index) => (
          <EmptySlot key={`empty-${index}`} slotNumber={views.length + index + 1}>
            {index === 0 && <AddSpecies teamId={team.id} />}
          </EmptySlot>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <Panel title="Import" subtitle="Showdown paste">
          <PasteImport teamId={team.id} formatId={format.id} />
        </Panel>

        <Panel title="Export">
          <a
            href={`/teams/${team.id}/export`}
            className="block w-full rounded-box border border-line px-2.5 py-1.5 text-center text-xs hover:bg-well"
          >
            Copy as Showdown paste
          </a>
        </Panel>
      </div>
    </div>
  )
}
