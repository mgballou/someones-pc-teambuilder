'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { Nature, StatSpread, TeraType } from '@spc/core'
import { MAX_MOVES } from '@spc/core'
import type { SetView } from '../lib/view'
import { updateSetAction, type SetPatch } from '../actions/set'
import { SpreadEditor } from './spread-editor'
import { Panel } from './panel'
import { Button } from './button'
import { TypeBadge } from './type-badge'
import { spriteUrl } from '../lib/sprites'
import { ItemPicker } from './item-picker'
import { MovePicker, type MoveOption } from './move-picker'

export type AbilityOption = { readonly id: string; readonly name: string }
export type { MoveOption }

/**
 * The full editor. Building something new happens here; adjusting something
 * built happens on the card. §2.4.
 *
 * Local state is the draft and the server is the record. Nothing is committed
 * until Save, and every change is reversible by changing it back. §2.8.
 */
export function SetEditor({
  teamId,
  view,
  abilities,
  moves,
  natures,
  teraTypes,
  levelFixed,
}: {
  readonly teamId: string
  readonly view: SetView
  readonly abilities: readonly AbilityOption[]
  readonly moves: readonly MoveOption[]
  readonly natures: readonly Nature[]
  readonly teraTypes: readonly TeraType[]
  readonly levelFixed: number | null
}) {
  const [draft, setDraft] = useState<SetPatch>({
    nickname: view.set.nickname,
    level: view.set.level,
    ability: view.set.ability,
    item: view.set.item,
    nature: view.set.nature,
    teraType: view.set.teraType,
    shiny: view.set.shiny,
    notes: view.set.notes,
    evs: view.set.evs,
    ivs: view.set.ivs,
    moves: [...view.set.moves],
  })
  const [message, setMessage] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const nature = (draft.nature ?? view.set.nature) as Nature
  const evs = (draft.evs ?? view.set.evs) as StatSpread
  const ivs = (draft.ivs ?? view.set.ivs) as StatSpread
  const level = levelFixed ?? draft.level ?? view.set.level

  function patch(next: SetPatch) {
    setDraft((current) => ({ ...current, ...next }))
    setMessage(null)
  }

  function save() {
    start(async () => {
      const result = await updateSetAction(view.id, draft)
      setMessage(result.ok ? 'Saved.' : result.message)
    })
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
      <div className="flex flex-col gap-4">
        <Panel
          title="Identity"
          action={
            <Link
              href={`/teams/${teamId}`}
              className="text-[0.6875rem] text-text-dim underline underline-offset-4"
            >
              Back to team
            </Link>
          }
        >
          <div className="flex items-start gap-3">
            <div className="well flex size-20 shrink-0 items-center justify-center overflow-hidden">
              <Image
                src={spriteUrl(view.spriteUrl)}
                alt=""
                width={80}
                height={80}
                className="size-20 object-contain [image-rendering:pixelated]"
                unoptimized
              />
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div>
                <h1 className="text-sm font-semibold">{view.speciesName}</h1>
                <div className="mt-1 flex gap-1">
                  {view.types.map((type) => (
                    <TypeBadge key={type} type={type} size="sm" />
                  ))}
                </div>
              </div>

              <Field label="Nickname">
                <input
                  value={draft.nickname ?? ''}
                  maxLength={24}
                  placeholder={view.speciesName}
                  onChange={(event) => patch({ nickname: event.target.value })}
                  className="well w-full px-2 py-1 text-xs outline-none"
                />
              </Field>

              <div className="grid grid-cols-2 gap-2">
                <Field label="Level">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={level}
                    disabled={levelFixed !== null}
                    onChange={(event) => patch({ level: Number(event.target.value) })}
                    title={
                      levelFixed === null
                        ? undefined
                        : `This format sets every Pokémon to level ${levelFixed}.`
                    }
                    className="num well w-full px-2 py-1 text-xs outline-none disabled:opacity-60"
                  />
                </Field>

                <Field label="Nature">
                  <select
                    value={nature}
                    onChange={(event) => patch({ nature: event.target.value })}
                    className="well w-full px-2 py-1 text-xs capitalize outline-none"
                  >
                    {natures.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Kit">
          <div className="flex flex-col gap-2">
            <Field label="Ability">
              <select
                value={draft.ability ?? ''}
                onChange={(event) =>
                  patch({ ability: event.target.value === '' ? null : event.target.value })
                }
                className="well w-full px-2 py-1 text-xs outline-none"
              >
                <option value="">No ability</option>
                {abilities.map((ability) => (
                  <option key={ability.id} value={ability.id}>
                    {ability.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Item">
              <ItemPicker
                value={draft.item ?? null}
                currentName={view.itemName}
                onChange={(id) => patch({ item: id })}
              />
            </Field>

            {teraTypes.length > 0 && (
              <Field label="Tera type">
                <select
                  value={draft.teraType ?? ''}
                  onChange={(event) =>
                    patch({ teraType: event.target.value === '' ? null : event.target.value })
                  }
                  className="well w-full px-2 py-1 text-xs capitalize outline-none"
                >
                  <option value="">Not declared</option>
                  {teraTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </div>
        </Panel>

        <Panel title="Moves" subtitle={`${MAX_MOVES} slots`}>
          <div className="flex flex-col gap-1.5">
            {[0, 1, 2, 3].map((index) => (
              <MovePicker
                key={index}
                slot={index + 1}
                value={draft.moves?.[index] ?? null}
                moves={moves}
                onChange={(id) => {
                  const next = [...(draft.moves ?? [null, null, null, null])]
                  next[index] = id
                  patch({ moves: next })
                }}
              />
            ))}
          </div>

          <p className="mt-2 text-[0.6875rem] leading-relaxed text-text-faint">
            Learnsets are by generation, not by method, and include what the Pokémon&rsquo;s
            pre-evolutions can learn. Breeding chains, event-only moves and version exclusives are
            not modelled, so this list is broader than what one save file can legally produce.
          </p>
        </Panel>
      </div>

      <div className="flex flex-col gap-4">
        <Panel title="Spread">
          <SpreadEditor
            baseStats={view.baseStats}
            evs={evs}
            ivs={ivs}
            nature={nature}
            level={level}
            onChange={(next) => patch({ evs: next.evs, ivs: next.ivs })}
          />
        </Panel>

        <Panel title="Notes">
          <textarea
            value={draft.notes ?? ''}
            rows={4}
            maxLength={2000}
            placeholder="Why this spread. What it survives. What it outspeeds."
            onChange={(event) => patch({ notes: event.target.value })}
            className="well w-full resize-y px-2 py-1.5 text-xs outline-none"
          />
        </Panel>

        <div className="flex items-center gap-3">
          <Button variant="primary" onClick={save} disabled={pending}>
            {pending ? 'Saving' : 'Save'}
          </Button>
          {message !== null && (
            <span
              className="text-xs"
              style={{ color: message === 'Saved.' ? 'var(--ok)' : 'var(--danger)' }}
              role="status"
            >
              {message}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  readonly label: string
  readonly children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[0.625rem] font-medium uppercase tracking-wider text-text-faint">
        {label}
      </span>
      {children}
    </label>
  )
}
