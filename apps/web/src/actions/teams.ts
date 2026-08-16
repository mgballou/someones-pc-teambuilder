'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import type { SetId, TeamId } from '@spc/core'
import { newSet, speciesId } from '@spc/core'
import { requireUser } from '../auth/session.js'
import * as repo from '../data/teams.js'

/**
 * Server actions are thin shells.
 *
 * Each one does exactly four things: authenticate, validate its input, call
 * one repository or domain function, and revalidate. Any logic beyond that
 * belongs in `@spc/core` if it is a rule, or in `data/` if it is a query.
 */

const teamIdSchema = z.uuid()
const setIdSchema = z.uuid()

const createTeamSchema = z.object({
  name: z.string().trim().min(1, 'Name the team.').max(80),
  formatId: z.string().trim().min(1),
})

export type ActionResult = { readonly ok: true } | { readonly ok: false; readonly message: string }

function failure(error: unknown): ActionResult {
  const message = error instanceof Error ? error.message : 'Something went wrong.'
  return { ok: false, message }
}

export async function createTeamAction(formData: FormData): Promise<never> {
  const user = await requireUser(new Date())
  const parsed = createTeamSchema.parse({
    name: formData.get('name'),
    formatId: formData.get('formatId'),
  })

  const teamId = await repo.createTeam({ userId: user.id, ...parsed })
  revalidatePath('/teams')
  redirect(`/teams/${teamId}`)
}

export async function renameTeamAction(teamId: string, name: string): Promise<ActionResult> {
  try {
    const user = await requireUser(new Date())
    await repo.updateTeam({
      userId: user.id,
      teamId: teamIdSchema.parse(teamId) as TeamId,
      name: z.string().trim().min(1).max(80).parse(name),
      now: new Date(),
    })
    revalidatePath(`/teams/${teamId}`)
    return { ok: true }
  } catch (error) {
    return failure(error)
  }
}

export async function setTeamFormatAction(teamId: string, formatId: string): Promise<ActionResult> {
  try {
    const user = await requireUser(new Date())
    await repo.updateTeam({
      userId: user.id,
      teamId: teamIdSchema.parse(teamId) as TeamId,
      formatId: z.string().trim().min(1).parse(formatId),
      now: new Date(),
    })
    revalidatePath(`/teams/${teamId}`)
    return { ok: true }
  } catch (error) {
    return failure(error)
  }
}

export async function deleteTeamAction(teamId: string): Promise<never> {
  const user = await requireUser(new Date())
  await repo.deleteTeam(user.id, teamIdSchema.parse(teamId) as TeamId)
  revalidatePath('/teams')
  redirect('/teams')
}

export async function cloneTeamAction(teamId: string, name: string): Promise<never> {
  const user = await requireUser(new Date())
  const created = await repo.cloneTeamDeep({
    userId: user.id,
    teamId: teamIdSchema.parse(teamId) as TeamId,
    name: z.string().trim().min(1).max(80).parse(name),
  })
  revalidatePath('/teams')
  redirect(`/teams/${created}`)
}

export async function addSpeciesAction(
  teamId: string,
  species: string,
  level: number,
): Promise<ActionResult> {
  try {
    const user = await requireUser(new Date())
    await repo.addSetToTeam({
      userId: user.id,
      teamId: teamIdSchema.parse(teamId) as TeamId,
      set: newSet({
        id: crypto.randomUUID() as SetId,
        species: speciesId(z.string().trim().min(1).parse(species)),
        level: z.number().int().min(1).max(100).parse(level),
      }),
    })
    revalidatePath(`/teams/${teamId}`)
    return { ok: true }
  } catch (error) {
    return failure(error)
  }
}

export async function duplicateSetAction(teamId: string, setId: string): Promise<ActionResult> {
  try {
    const user = await requireUser(new Date())
    await repo.duplicateSet(user.id, setIdSchema.parse(setId) as SetId)
    revalidatePath(`/teams/${teamId}`)
    return { ok: true }
  } catch (error) {
    return failure(error)
  }
}

export async function deleteSetAction(teamId: string, setId: string): Promise<ActionResult> {
  try {
    const user = await requireUser(new Date())
    await repo.deleteSet(user.id, setIdSchema.parse(setId) as SetId)
    revalidatePath(`/teams/${teamId}`)
    return { ok: true }
  } catch (error) {
    return failure(error)
  }
}

export async function reorderAction(
  teamId: string,
  order: readonly string[],
): Promise<ActionResult> {
  try {
    const user = await requireUser(new Date())
    await repo.reorderMembers({
      userId: user.id,
      teamId: teamIdSchema.parse(teamId) as TeamId,
      order: z.array(setIdSchema).parse(order) as SetId[],
    })
    revalidatePath(`/teams/${teamId}`)
    return { ok: true }
  } catch (error) {
    return failure(error)
  }
}

export async function moveSetAction(setId: string, toTeamId: string): Promise<ActionResult> {
  try {
    const user = await requireUser(new Date())
    await repo.moveSetToTeam({
      userId: user.id,
      setId: setIdSchema.parse(setId) as SetId,
      toTeamId: teamIdSchema.parse(toTeamId) as TeamId,
    })
    revalidatePath('/teams')
    return { ok: true }
  } catch (error) {
    return failure(error)
  }
}

export async function copySetAction(setId: string, toTeamId: string): Promise<ActionResult> {
  try {
    const user = await requireUser(new Date())
    await repo.copySetToTeam({
      userId: user.id,
      setId: setIdSchema.parse(setId) as SetId,
      toTeamId: teamIdSchema.parse(toTeamId) as TeamId,
    })
    revalidatePath('/teams')
    return { ok: true }
  } catch (error) {
    return failure(error)
  }
}

export async function deleteBoxSetAction(setId: string): Promise<ActionResult> {
  try {
    const user = await requireUser(new Date())
    await repo.deleteSet(user.id, setIdSchema.parse(setId) as SetId)
    revalidatePath('/box')
    return { ok: true }
  } catch (error) {
    return failure(error)
  }
}

export async function saveToBoxAction(setId: string): Promise<ActionResult> {
  try {
    const user = await requireUser(new Date())
    await repo.saveToBox(user.id, setIdSchema.parse(setId) as SetId)
    revalidatePath('/box')
    return { ok: true }
  } catch (error) {
    return failure(error)
  }
}

export async function pullFromBoxAction(setId: string, toTeamId: string): Promise<ActionResult> {
  try {
    const user = await requireUser(new Date())
    await repo.pullFromBox({
      userId: user.id,
      setId: setIdSchema.parse(setId) as SetId,
      toTeamId: teamIdSchema.parse(toTeamId) as TeamId,
    })
    revalidatePath(`/teams/${toTeamId}`)
    return { ok: true }
  } catch (error) {
    return failure(error)
  }
}
