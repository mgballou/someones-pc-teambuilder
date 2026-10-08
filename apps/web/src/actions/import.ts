'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { SetId, TeamId } from '@spc/core'
import { defaultLevelFor, describeProblem, parse, problemsOf, setsOf } from '@spc/core'
import { NotAuthorized, requireUser } from '../auth/session'
import { addSetToTeam, teamFormat } from '../data/teams'
import { dex, formatOf } from '../lib/dex'

export type ImportResult = {
  readonly imported: number
  readonly problems: readonly string[]
}

/**
 * A paste with one bad move still yields the good sets. The caller decides
 * what to do with the problems; this action reports both and imports what it
 * could read.
 *
 * The level rule comes from the team's own format, never from the caller. An
 * id that is not a uuid names no team anyone owns, so it is refused the same
 * way as a team that is not yours, before the team is looked up.
 */
export async function importPasteAction(teamId: string, paste: string): Promise<ImportResult> {
  const user = await requireUser(new Date())
  const id = z.uuid().safeParse(teamId)
  if (!id.success) throw NotAuthorized.team(teamId)
  const team = id.data as TeamId
  const format = formatOf(await teamFormat(user.id, team))

  const result = parse({
    paste,
    dex: dex(),
    defaultLevel: defaultLevelFor(format),
    setId: () => crypto.randomUUID() as SetId,
  })

  const sets = setsOf(result)
  for (const set of sets) {
    await addSetToTeam({ userId: user.id, teamId: team, set })
  }

  revalidatePath(`/teams/${team}`)

  return {
    imported: sets.length,
    problems: problemsOf(result).map(describeProblem),
  }
}
