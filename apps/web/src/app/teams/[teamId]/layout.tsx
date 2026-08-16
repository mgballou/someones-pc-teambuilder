import type { ReactNode } from 'react'
import { loadTeam } from '../../../lib/team-view'
import { TeamHeader } from '../../../components/team-header'

/**
 * The team header never unmounts. Name, format, member count and the standing
 * warnings stay put while the panel below changes, so switching from Build to
 * Coverage does not feel like a page load — because it is not one.
 * ui-sensibility.md §7.1.
 */
export default async function TeamLayout({
  params,
  children,
}: {
  readonly params: Promise<{ readonly teamId: string }>
  readonly children: ReactNode
}) {
  const { teamId } = await params
  const { header } = await loadTeam(teamId)

  return (
    <div className="flex flex-col gap-4">
      <TeamHeader header={header} />
      {children}
    </div>
  )
}
