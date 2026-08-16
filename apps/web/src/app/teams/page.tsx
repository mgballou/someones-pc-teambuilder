import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { speciesId } from '@spc/core'
import { currentUser } from '../../auth/session.js'
import { listTeams } from '../../data/teams.js'
import { dex } from '../../lib/dex.js'
import { spriteUrl } from '../../lib/sprites.js'
import { Panel, EmptyState } from '../../components/panel.js'
import { NewTeamButton } from '../../components/new-team-button.js'
import { formatCount } from '../../lib/format.js'

/**
 * The Box, at the team level.
 *
 * An empty state here is the highest-leverage screen in the app and the only
 * one where a call to action has no competition. It offers a first move.
 * ui-sensibility.md §2.7.
 */
export default async function TeamsPage() {
  const user = await currentUser(new Date())
  if (user === null) redirect('/sign-in')

  const teams = await listTeams(user.id)
  const formats = dex().allFormats()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold tracking-tight">Teams</h1>
        <span className="num text-xs text-text-faint">{teams.length}</span>
        <div className="ml-auto">
          <NewTeamButton formats={formats.map((f) => ({ id: f.id, name: f.name }))} />
        </div>
      </div>

      {teams.length === 0 ? (
        <Panel>
          <EmptyState headline="No teams yet. Start one, or paste a Showdown export into it.">
            <NewTeamButton
              formats={formats.map((f) => ({ id: f.id, name: f.name }))}
              variant="primary"
            />
          </EmptyState>
        </Panel>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => {
            const format = dex().format(team.format)
            return (
              <li key={team.id}>
                <Link href={`/teams/${team.id}`} className="panel block p-3 hover:bg-well/40">
                  <div className="flex items-baseline gap-2">
                    <h2 className="truncate text-sm font-semibold">{team.name}</h2>
                    <span className="ml-auto shrink-0 rounded-box border border-line px-1.5 py-px text-[0.625rem] uppercase tracking-wider text-text-dim">
                      {format?.shortName ?? team.format}
                    </span>
                  </div>

                  <p className="num mt-0.5 text-[0.6875rem] text-text-faint">
                    {formatCount(team.memberCount, format?.teamSize ?? 6)}
                  </p>

                  <div className="mt-2 flex gap-1">
                    {Array.from({ length: format?.teamSize ?? 6 }, (_, index) => {
                      const member = team.species[index]
                      if (member === undefined) {
                        return <div key={index} className="well size-10" aria-hidden="true" />
                      }
                      const found = dex().species(speciesId(member))
                      return (
                        <div
                          key={index}
                          className="raised flex size-10 items-center justify-center overflow-hidden"
                        >
                          {found !== undefined && (
                            <Image
                              src={spriteUrl(found.spriteKey)}
                              alt=""
                              width={40}
                              height={40}
                              className="size-10 object-contain [image-rendering:pixelated]"
                              unoptimized
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
