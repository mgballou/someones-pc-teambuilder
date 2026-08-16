'use server'

import { revalidatePath } from 'next/cache'
import type { SetId, TeamId } from '@spc/core'
import { defaultLevelFor, describeProblem, parse, problemsOf, setsOf } from '@spc/core'
import { requireUser } from '../auth/session'
import { addSetToTeam } from '../data/teams'
import { dex } from '../lib/dex'
import { formatOf } from '../lib/dex'
import { formatId } from '@spc/core'

export type ImportResult = {
  readonly imported: number
  readonly problems: readonly string[]
}

/**
 * A paste with one bad move still yields the good sets. The caller decides
 * what to do with the problems; this action reports both and imports what it
 * could read.
 */
export async function importPasteAction(
  teamId: string,
  teamFormatId: string,
  paste: string,
): Promise<ImportResult> {
  const user = await requireUser(new Date())
  const format = formatOf(formatId(teamFormatId))

  const result = parse({
    paste,
    dex: dex(),
    defaultLevel: defaultLevelFor(format),
    setId: () => crypto.randomUUID() as SetId,
  })

  const sets = setsOf(result)
  for (const set of sets) {
    await addSetToTeam({ userId: user.id, teamId: teamId as TeamId, set })
  }

  revalidatePath(`/teams/${teamId}`)

  return {
    imported: sets.length,
    problems: problemsOf(result).map(describeProblem),
  }
}
