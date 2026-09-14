import { defaultLevelFor, serializeTeam } from '@spc/core'
import { loadTeam } from '../../../../lib/team-view'
import { dex } from '../../../../lib/dex'

/**
 * Teams leave as a Showdown paste, which is how this ecosystem already shares.
 * Spec §7.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params
  const { team, format } = await loadTeam(teamId)

  const paste = serializeTeam({ team, dex: dex(), defaultLevel: defaultLevelFor(format) })

  return new Response(paste, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${team.name.replace(/[^a-z0-9]+/gi, '-')}.txt"`,
    },
  })
}
