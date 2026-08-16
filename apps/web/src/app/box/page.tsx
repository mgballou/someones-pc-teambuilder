import Image from 'next/image'
import { redirect } from 'next/navigation'
import { currentUser } from '../../auth/session'
import { listBoxSets, listTeams } from '../../data/teams'
import { dex, displayNameOf } from '../../lib/dex'
import { spriteUrl } from '../../lib/sprites'
import { Panel, EmptyState } from '../../components/panel'
import { TypeBadge } from '../../components/type-badge'
import { formatEvLine } from '../../lib/format'
import { BoxEntryActions } from '../../components/box-entry-actions'

/**
 * The Box is a library of saved sets — the thing every builder ends up
 * maintaining by hand in a text file. Sets copy in and out; nothing is shared
 * by reference. Spec §2.
 */
export default async function BoxPage() {
  const user = await currentUser(new Date())
  if (user === null) redirect('/sign-in')

  const [sets, teams] = await Promise.all([listBoxSets(user.id), listTeams(user.id)])
  const catalog = dex()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline gap-3">
        <h1 className="text-base font-semibold tracking-tight">Box</h1>
        <span className="num text-xs text-text-faint">{sets.length}</span>
        <p className="ml-auto max-w-md text-right text-[0.6875rem] text-text-faint">
          Saved sets, reusable across teams. Pulling one into a team copies it — editing the copy
          does not change what is stored here.
        </p>
      </div>

      {sets.length === 0 ? (
        <Panel>
          <EmptyState headline="The Box is empty. Save a set from a team and it appears here." />
        </Panel>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {sets.map((set) => {
            const species = catalog.species(set.species)
            const item = set.item === null ? null : catalog.item(set.item)
            return (
              <li key={set.id} className="panel flex flex-col gap-2 p-2.5">
                <div className="flex items-start gap-2">
                  <div className="well flex size-12 shrink-0 items-center justify-center overflow-hidden">
                    {species !== undefined && (
                      <Image
                        src={spriteUrl(species.spriteKey)}
                        alt=""
                        width={48}
                        height={48}
                        className="size-12 object-contain [image-rendering:pixelated]"
                        unoptimized
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-sm font-semibold">
                      {species === undefined ? set.species : displayNameOf(species)}
                    </h2>
                    <p className="truncate text-[0.6875rem] text-text-dim">
                      {item?.name ?? 'No item'} · <span className="capitalize">{set.nature}</span>
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {species?.types.map((type) => (
                        <TypeBadge key={type} type={type} size="sm" />
                      ))}
                    </div>
                  </div>
                </div>

                <p className="num truncate text-[0.6875rem] text-text-faint">
                  {formatEvLine(set.evs)}
                </p>

                <BoxEntryActions
                  setId={set.id}
                  teams={teams.map((team) => ({ id: team.id, name: team.name }))}
                />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
