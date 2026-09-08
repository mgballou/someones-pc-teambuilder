'use client'

import { useEffect, useMemo, useState } from 'react'
import type {
  BattleStyle,
  DamageResult,
  Field,
  PokemonSet,
  Species,
  Status,
  Terrain,
  Weather,
} from '@spc/core'
import {
  DEFAULT_FIELD,
  EMPTY_EVS,
  OPEN_SIDE,
  PERFECT_IVS,
  STATUSES,
  TERRAINS,
  WEATHERS,
  ZERO_BOOSTS,
  calculate,
  newAttacker,
  newDefender,
  newSet,
  moveId as brandMoveId,
  setId as brandSetId,
  speciesId,
} from '@spc/core'
import { miniDex, type DexPayload } from '../lib/mini-dex'
import { Panel, SourceNote } from './panel'
import { formatPercentRange } from '../lib/format'

export type AttackerOption = {
  readonly setId: string
  readonly label: string
  readonly set: PokemonSet
  readonly moves: readonly { readonly id: string; readonly name: string }[]
}

/**
 * Defender presets, because nobody wants to type a spread to answer "does this
 * kill". These are the four spreads people actually check against.
 */
const PRESETS = [
  { id: 'neutral', label: '0 / 0', hp: 0, def: 0, spd: 0 },
  { id: 'bulky-hp', label: '252 HP', hp: 252, def: 0, spd: 0 },
  { id: 'physdef', label: '252 HP / 252 Def', hp: 252, def: 252, spd: 0 },
  { id: 'specdef', label: '252 HP / 252 SpD', hp: 252, def: 0, spd: 252 },
] as const

export function DamagePanel({
  attackers,
  basePayload,
  style,
  level,
}: {
  readonly attackers: readonly AttackerOption[]
  readonly basePayload: DexPayload
  readonly style: BattleStyle
  readonly level: number
}) {
  const [attackerId, setAttackerId] = useState(attackers[0]?.setId ?? '')
  const attacker = attackers.find((option) => option.setId === attackerId) ?? attackers[0]
  const [moveId, setMoveId] = useState(attacker?.moves[0]?.id ?? '')

  const [defenderQuery, setDefenderQuery] = useState('')
  const [defenderSpecies, setDefenderSpecies] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<readonly { id: string; name: string }[]>([])
  const [payload, setPayload] = useState<DexPayload>(basePayload)

  const [preset, setPreset] = useState<(typeof PRESETS)[number]['id']>('neutral')
  const [attackerBoost, setAttackerBoost] = useState(0)
  const [defenderBoost, setDefenderBoost] = useState(0)
  const [attackerTera, setAttackerTera] = useState(false)
  const [defenderTera, setDefenderTera] = useState(false)
  const [criticalHit, setCriticalHit] = useState(false)
  const [attackerStatus, setAttackerStatus] = useState<Status>('none')
  const [weather, setWeather] = useState<Weather>('none')
  const [terrain, setTerrain] = useState<Terrain>('none')
  const [reflect, setReflect] = useState(false)
  const [lightScreen, setLightScreen] = useState(false)
  const [spread, setSpread] = useState(style === 'doubles')

  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(() => {
      fetch(`/api/species?q=${encodeURIComponent(defenderQuery)}`, { signal: controller.signal })
        .then((response) => response.json())
        .then((body: { matches: readonly { id: string; name: string }[] }) =>
          setCandidates(body.matches),
        )
        .catch(() => undefined)
    }, 120)
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [defenderQuery])

  useEffect(() => {
    if (defenderSpecies === null) return
    const controller = new AbortController()
    const query = new URLSearchParams()
    query.append('species', defenderSpecies)
    for (const option of attackers) query.append('species', option.set.species)
    for (const option of attackers) {
      for (const move of option.moves) query.append('move', move.id)
      if (option.set.item !== null) query.append('item', option.set.item)
    }

    fetch(`/api/calc?${query.toString()}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((body: DexPayload) => setPayload(body))
      .catch(() => undefined)

    return () => controller.abort()
  }, [defenderSpecies, attackers])

  const result: DamageResult | null = useMemo(() => {
    if (attacker === undefined || moveId === '' || defenderSpecies === null) return null

    const dex = miniDex(payload)
    const move = brandMoveId(moveId)
    const target = dex.species(speciesId(defenderSpecies))
    // Guard before calling: `calculate` throws on a status move or a missing id.
    if (dex.move(move) === undefined || target === undefined) return null

    const chosen = PRESETS.find((option) => option.id === preset) ?? PRESETS[0]

    const defenderSet: PokemonSet = {
      ...newSet({ id: brandSetId('calc-defender'), species: target.id, level }),
      ability: target.abilities[0] ?? null,
      evs: { ...EMPTY_EVS, hp: chosen.hp, def: chosen.def, spd: chosen.spd },
      ivs: PERFECT_IVS,
      teraType: target.types[0] ?? null,
    }

    const field: Field = {
      ...DEFAULT_FIELD,
      weather,
      terrain,
      style,
      attackerSide: OPEN_SIDE,
      defenderSide: { ...OPEN_SIDE, reflect, lightScreen },
    }

    try {
      return calculate({
        attacker: newAttacker({
          set: attacker.set,
          boosts: { ...ZERO_BOOSTS, atk: attackerBoost, spa: attackerBoost },
          status: attackerStatus,
          terastallized: attackerTera,
          targets: spread ? 2 : 1,
          criticalHit,
        }),
        defender: newDefender({
          set: defenderSet,
          boosts: { ...ZERO_BOOSTS, def: defenderBoost, spd: defenderBoost },
          terastallized: defenderTera,
        }),
        move,
        field,
        dex,
      })
    } catch {
      return null
    }
  }, [
    attacker,
    moveId,
    defenderSpecies,
    payload,
    preset,
    level,
    weather,
    terrain,
    style,
    reflect,
    lightScreen,
    attackerBoost,
    defenderBoost,
    attackerTera,
    defenderTera,
    criticalHit,
    attackerStatus,
    spread,
  ])

  if (attackers.length === 0) {
    return (
      <Panel title="Damage">
        <p className="text-xs text-text-dim">Add a Pokémon with a move and the calculator opens.</p>
      </Panel>
    )
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[18rem_18rem_1fr]">
      <Panel title="Attacker">
        <div className="flex flex-col gap-2">
          <Select
            label="Pokémon"
            value={attackerId}
            onChange={(value) => {
              setAttackerId(value)
              const next = attackers.find((option) => option.setId === value)
              setMoveId(next?.moves[0]?.id ?? '')
            }}
            options={attackers.map((option) => ({ value: option.setId, label: option.label }))}
          />
          <Select
            label="Move"
            value={moveId}
            onChange={setMoveId}
            options={(attacker?.moves ?? []).map((move) => ({
              value: move.id,
              label: move.name,
            }))}
          />
          <Select
            label="Boost"
            value={String(attackerBoost)}
            onChange={(value) => setAttackerBoost(Number(value))}
            options={boostOptions()}
          />
          <Select
            label="Status"
            value={attackerStatus}
            onChange={(value) => setAttackerStatus(value as Status)}
            options={STATUSES.map((status) => ({ value: status, label: status }))}
          />
          <Toggle label="Terastallized" checked={attackerTera} onChange={setAttackerTera} />
          <Toggle label="Critical hit" checked={criticalHit} onChange={setCriticalHit} />
          {style === 'doubles' && (
            <Toggle label="Hits two targets" checked={spread} onChange={setSpread} />
          )}
        </div>
      </Panel>

      <Panel title="Defender">
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-0.5">
            <span className="text-[0.625rem] font-medium uppercase tracking-wider text-text-faint">
              Species
            </span>
            <input
              value={defenderQuery}
              onChange={(event) => setDefenderQuery(event.target.value)}
              placeholder="Search"
              className="well px-2 py-1 text-xs outline-none"
            />
          </label>

          {defenderQuery !== '' && (
            <ul className="max-h-32 overflow-y-auto">
              {candidates.map((candidate) => (
                <li key={candidate.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setDefenderSpecies(candidate.id)
                      setDefenderQuery('')
                    }}
                    className="w-full truncate px-1 py-0.5 text-left text-[0.6875rem] hover:bg-well"
                  >
                    {candidate.name}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {defenderSpecies !== null && (
            <p className="text-xs font-semibold">{nameOf(payload, defenderSpecies)}</p>
          )}

          <Select
            label="Spread"
            value={preset}
            onChange={(value) => setPreset(value as (typeof PRESETS)[number]['id'])}
            options={PRESETS.map((option) => ({ value: option.id, label: option.label }))}
          />
          <Select
            label="Boost"
            value={String(defenderBoost)}
            onChange={(value) => setDefenderBoost(Number(value))}
            options={boostOptions()}
          />
          <Toggle label="Terastallized" checked={defenderTera} onChange={setDefenderTera} />
          <Toggle label="Reflect" checked={reflect} onChange={setReflect} />
          <Toggle label="Light Screen" checked={lightScreen} onChange={setLightScreen} />
        </div>
      </Panel>

      <div className="flex flex-col gap-4">
        <Panel title="Field">
          <div className="grid grid-cols-2 gap-2">
            <Select
              label="Weather"
              value={weather}
              onChange={(value) => setWeather(value as Weather)}
              options={WEATHERS.map((option) => ({ value: option, label: option }))}
            />
            <Select
              label="Terrain"
              value={terrain}
              onChange={(value) => setTerrain(value as Terrain)}
              options={TERRAINS.map((option) => ({ value: option, label: option }))}
            />
          </div>
        </Panel>

        <Panel title="Result">
          {result === null ? (
            <p className="text-xs text-text-dim">
              Choose a defender and the rolls appear here. Nothing is calculated until there is
              something to calculate.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-baseline gap-3">
                <span className="num text-lg font-semibold">
                  {formatPercentRange(result.percent.min, result.percent.max)}
                </span>
                <span
                  className="text-xs font-semibold"
                  style={{
                    color:
                      result.ko.kind === 'guaranteed' && result.ko.hits === 1
                        ? 'var(--danger)'
                        : 'var(--text-dim)',
                  }}
                >
                  {result.ko.summary}
                </span>
              </div>

              <dl className="grid grid-cols-4 gap-2 text-[0.6875rem]">
                <Stat label="Damage" value={`${result.min}–${result.max}`} />
                <Stat label="Target HP" value={String(result.defenderMaxHp)} />
                <Stat label="Effective" value={`×${result.effectiveness}`} />
                <Stat label="STAB" value={`×${result.stab}`} />
                <Stat label="Base power" value={String(result.basePower)} />
                <Stat label="Attack" value={String(result.attackStat)} />
                <Stat label="Defense" value={String(result.defenseStat)} />
                <Stat label="Hits" value={String(result.hits)} />
              </dl>

              <div>
                <p className="mb-1 text-[0.625rem] uppercase tracking-wider text-text-faint">
                  All sixteen rolls
                </p>
                <div className="grid grid-cols-8 gap-px">
                  {result.rolls.map((roll, index) => (
                    <span
                      key={index}
                      className="num bg-well px-1 py-0.5 text-center text-[0.625rem]"
                    >
                      {roll}
                    </span>
                  ))}
                </div>
              </div>

              {result.notes.length > 0 && (
                <SourceNote>
                  <span className="font-medium">What this assumed:</span> {result.notes.join(' ')}
                </SourceNote>
              )}
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}

function nameOf(payload: DexPayload, id: string): string {
  const species: Species | undefined = payload.species.find((record) => record.id === id)
  if (species === undefined) return id
  return species.formName === null ? species.name : `${species.name}-${species.formName}`
}

function boostOptions() {
  return [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6].map((stage) => ({
    value: String(stage),
    label: stage > 0 ? `+${stage}` : String(stage),
  }))
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  readonly label: string
  readonly value: string
  readonly onChange: (value: string) => void
  readonly options: readonly { readonly value: string; readonly label: string }[]
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[0.625rem] font-medium uppercase tracking-wider text-text-faint">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="well px-2 py-1 text-xs capitalize outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  readonly label: string
  readonly checked: boolean
  readonly onChange: (value: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 text-xs">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="accent-[var(--accent)]"
      />
      {label}
    </label>
  )
}

function Stat({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-[0.625rem] uppercase tracking-wider text-text-faint">{label}</dt>
      <dd className="num font-semibold">{value}</dd>
    </div>
  )
}
