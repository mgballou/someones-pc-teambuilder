import type { Dex } from '../dex.js'
import { requireMove, requireSpecies } from '../dex.js'
import type { AbilityId, MoveId } from '../ids.js'
import { abilityId } from '../ids.js'
import type { Item } from '../item.js'
import { isSpreadMove } from '../move.js'
import type { PokemonType, TeraType } from '../pokemon-type.js'
import { effectivenessAgainst, effectivenessOf } from '../pokemon-type.js'
import type { PokemonSet } from '../set.js'
import type { Species } from '../species.js'
import { displayName } from '../species.js'
import type { BoostableStat, StatSpread } from '../stats.js'
import { applyBoost, computeSpread, STAT_LABEL } from '../stats.js'
import type { AbilityEntry } from './abilities.js'
import { abilityEntry } from './abilities.js'
import { UncalculableMove, ImpossibleState } from './errors.js'
import type { ItemHandler, ItemHook, ItemRole } from './items.js'
import { ITEM_REGISTRY } from './items.js'
import {
  applyModifier,
  chainModifiers,
  MOD_HALF,
  MOD_ONE,
  MOD_ONE_AND_A_HALF,
  MOD_THREE_QUARTERS,
} from './modifier.js'
import { moveOverride } from './moves.js'
import { koChance } from './ko.js'
import { stabModifier } from './stab.js'
import type {
  Attacker,
  DamageResult,
  Defender,
  Field,
  ModifierContext,
  SideView,
  Terrain,
  Weather,
} from './types.js'
import { resolvePower } from './variable-power.js'

/** The sixteen damage rolls, as percentages of the unrandomized damage. */
const RANDOM_FACTORS = [85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100] as const

/** 1.3x, what a matching terrain gives a grounded user's move. */
const MOD_TERRAIN_BOOST = 5325

/** Screens, which are weaker in doubles because they cover two Pokémon. */
const MOD_SCREEN_SINGLES = 2048
const MOD_SCREEN_DOUBLES = 2732

export type CalculateInput = {
  readonly attacker: Attacker
  readonly defender: Defender
  readonly move: MoveId
  readonly field: Field
  readonly dex: Dex
}

/**
 * One move, one target, sixteen answers.
 *
 * Pure and total: the same arguments always give the same rolls, which is the
 * whole reason the core has no clock and no randomness. Anything the model
 * could not account for comes back in `notes` rather than being dropped.
 */
export function calculate({ attacker, defender, move, field, dex }: CalculateInput): DamageResult {
  const notes = new NoteLog()

  const moveRecord = requireMove(dex, move)
  const declaredCategory = moveRecord.category
  if (declaredCategory === 'status') throw UncalculableMove.status(move)

  const attackerSpecies = requireSpecies(dex, attacker.set.species)
  const defenderSpecies = requireSpecies(dex, defender.set.species)

  const attackerStats = spreadFor(attacker.set, attackerSpecies)
  const defenderStats = spreadFor(defender.set, defenderSpecies)

  const maxHp = defenderStats.hp
  const currentHp = Math.max(1, Math.floor(maxHp * clamp(defender.hpFraction, 0, 1)))

  const attackerItem = resolveItem(dex, attacker.set, notes)
  const defenderItem = resolveItem(dex, defender.set, notes)

  const attackerEntry = resolveAbility(dex, attacker.set.ability, attackerSpecies, notes)
  const declaredDefenderEntry = resolveAbility(dex, defender.set.ability, defenderSpecies, notes)
  const defenderEntry = suppressDefenderAbility({
    dex,
    attackerEntry,
    defenderEntry: declaredDefenderEntry,
    defenderAbility: defender.set.ability,
    defenderSpecies,
    notes,
  })

  const attackerTera = resolveTera(attacker, attackerSpecies, 'attacker', notes)
  const defenderTera = resolveTera(defender, defenderSpecies, 'defender', notes)

  const override = moveOverride(moveRecord.id)

  const moveType: TeraType =
    override?.typeFromTera === true && attackerTera !== null ? attackerTera : moveRecord.type

  const category: 'physical' | 'special' =
    override?.categoryFromStats === true && attackerTera !== null
      ? applyBoost(attackerStats.atk, attacker.boosts.atk) >
        applyBoost(attackerStats.spa, attacker.boosts.spa)
        ? 'physical'
        : 'special'
      : declaredCategory

  const attackStatName: BoostableStat =
    override?.attackStat ?? (category === 'physical' ? 'atk' : 'spa')
  const defenseStatName: BoostableStat =
    override?.defenseStat ?? (category === 'physical' ? 'def' : 'spd')

  const defenderTypes: readonly PokemonType[] =
    defenderTera !== null && defenderTera !== 'stellar' ? [defenderTera] : defenderSpecies.types

  const attackerView = viewOf({
    combatantSet: attacker.set,
    species: attackerSpecies,
    stats: attackerStats,
    boosts: attacker.boosts,
    hpFraction: attacker.hpFraction,
    status: attacker.status,
    terastallized: attacker.terastallized,
    item: attackerItem,
    types:
      attackerTera !== null && attackerTera !== 'stellar' ? [attackerTera] : attackerSpecies.types,
  })

  const defenderView = viewOf({
    combatantSet: defender.set,
    species: defenderSpecies,
    stats: defenderStats,
    boosts: defender.boosts,
    hpFraction: defender.hpFraction,
    status: defender.status,
    terastallized: defender.terastallized,
    item: defenderItem,
    types: defenderTypes,
  })

  const criticalHit = attacker.criticalHit || moveRecord.critRatio >= 3
  if (criticalHit && !attacker.criticalHit) {
    notes.add(`${moveRecord.name} always lands a critical hit, so one was applied.`)
  }

  const power = resolvePower({
    move: moveRecord,
    attackerWeightKg: attackerSpecies.weightKg,
    defenderWeightKg: defenderSpecies.weightKg,
    attackerSpeed: applyBoost(attackerStats.spe, attacker.boosts.spe),
    defenderSpeed: applyBoost(defenderStats.spe, defender.boosts.spe),
    attackerHpFraction: clamp(attacker.hpFraction, 0, 1),
    defenderHpFraction: clamp(defender.hpFraction, 0, 1),
    attackerLevel: attacker.set.level,
    defenderCurrentHp: currentHp,
  })
  if (power.note !== null) notes.add(power.note)

  const rawPower = power.kind === 'power' ? power.power : 0

  const provisional: ModifierContext = {
    move: moveRecord,
    moveType,
    category,
    attackStatName,
    defenseStatName,
    basePower: rawPower,
    effectiveness: effectivenessOfMove(moveType, defenderTypes, defender.terastallized),
    attacker: attackerView,
    defender: defenderView,
    field,
    criticalHit,
    targets: attacker.targets,
  }

  const effectiveness = resolveEffectiveness({
    provisional,
    defenderEntry,
    dex,
    defenderAbility: defender.set.ability,
    defenderSpecies,
    defenderTypes,
    moveType,
    notes,
  })

  const context: ModifierContext = { ...provisional, effectiveness }

  addRegistryNotes({ context, attackerEntry, defenderEntry, attackerItem, defenderItem, notes })

  if (effectiveness === 0) {
    return immuneResult({ context, maxHp, currentHp, notes })
  }

  if (power.kind === 'exact') {
    return exactResult({ context, damage: power.damage, maxHp, currentHp, notes })
  }

  const basePower = Math.max(
    1,
    applyModifier(
      rawPower,
      chainModifiers([
        attackerEntry?.basePower?.(context) ?? null,
        itemModifier(attackerItem, (handler) => handler.basePower, context),
        terrainPowerModifier(field.terrain, context),
        override?.halvedByGrassyTerrain === true &&
        field.terrain === 'grassy' &&
        defenderView.grounded
          ? MOD_HALF
          : null,
      ]),
    ),
  )

  const attackStat = resolveAttack({
    context,
    attacker,
    attackerStats,
    attackStatName,
    attackerEntry,
    defenderEntry,
    attackerItem,
    dex,
    defenderAbility: defender.set.ability,
    criticalHit,
    notes,
  })

  const defenseStat = resolveDefense({
    context,
    defender,
    defenderStats,
    defenseStatName,
    defenderTypes,
    attackerEntry,
    defenderEntry,
    defenderItem,
    criticalHit,
  })

  const stab = stabModifier({
    moveType,
    originalTypes: attackerSpecies.types,
    teraType: attackerTera,
    terastallized: attacker.terastallized,
    adaptability: attackerEntry?.adaptability === true,
  })

  const weatherMod = weatherDamageModifier(field.weather, moveType)

  const spread = attacker.targets > 1 && isSpreadMove(moveRecord)
  if (attacker.targets > 1 && !isSpreadMove(moveRecord)) {
    notes.add(
      `${moveRecord.name} only ever hits one Pokémon, so no spread reduction was applied despite ${attacker.targets} targets.`,
    )
  }

  const burned =
    attacker.status === 'burn' &&
    category === 'physical' &&
    attackerEntry?.ignoresBurn !== true &&
    override?.ignoresBurn !== true

  const finalMod = chainModifiers([
    field.attackerSide.helpingHand ? MOD_ONE_AND_A_HALF : null,
    screenModifier({ field, category, criticalHit, notes }),
    defenderEntry?.finalDefender?.(context) ?? null,
    field.defenderSide.friendGuard ? MOD_THREE_QUARTERS : null,
    itemModifier(attackerItem, (handler) => handler.finalAttacker, context),
    attackerEntry?.finalAttacker?.(context) ?? null,
    itemModifier(defenderItem, (handler) => handler.finalDefender, context),
  ])

  const levelFactor = Math.floor((2 * attacker.set.level) / 5 + 2)
  const baseDamage =
    Math.floor(Math.floor((levelFactor * basePower * attackStat) / defenseStat) / 50) + 2

  const hits = moveRecord.multiHit?.max ?? 1
  if (moveRecord.multiHit !== null && moveRecord.multiHit.min !== moveRecord.multiHit.max) {
    notes.add(
      `${moveRecord.name} was calculated at ${hits} hits. It can land as few as ${moveRecord.multiHit.min}.`,
    )
  }

  const rolls = RANDOM_FACTORS.map((factor) => {
    let damage = baseDamage
    if (spread) damage = applyModifier(damage, MOD_THREE_QUARTERS)
    damage = applyModifier(damage, weatherMod)
    if (criticalHit) damage = Math.floor(damage * 1.5)
    damage = Math.floor((damage * factor) / 100)
    damage = applyModifier(damage, stab)
    damage = Math.floor(damage * effectiveness)
    if (burned) damage = Math.floor(damage * 0.5)
    return Math.max(1, applyModifier(damage, finalMod)) * hits
  })

  return {
    rolls,
    min: rolls[0] ?? 0,
    max: rolls[rolls.length - 1] ?? 0,
    percent: percentOf(rolls, maxHp),
    defenderMaxHp: maxHp,
    defenderCurrentHp: currentHp,
    effectiveness,
    stab: stab / MOD_ONE,
    basePower,
    attackStat,
    defenseStat,
    hits,
    criticalHit,
    immune: false,
    ko: koChance({ rolls, currentHp }),
    notes: notes.all(),
  }
}

// --- Assembly helpers -------------------------------------------------------

class NoteLog {
  private readonly seen = new Set<string>()
  private readonly entries: string[] = []

  add(note: string | null | undefined): void {
    if (note === null || note === undefined) return
    if (this.seen.has(note)) return
    this.seen.add(note)
    this.entries.push(note)
  }

  all(): readonly string[] {
    return [...this.entries]
  }
}

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value))
}

function spreadFor(set: PokemonSet, species: Species): StatSpread {
  return computeSpread({
    base: species.baseStats,
    ivs: set.ivs,
    evs: set.evs,
    level: set.level,
    nature: set.nature,
  })
}

function resolveItem(dex: Dex, set: PokemonSet, notes: NoteLog): Item | null {
  if (set.item === null) return null
  const item = dex.item(set.item)
  if (item === undefined) {
    notes.add(`No item in the dataset with id "${set.item}", so it was ignored.`)
    return null
  }
  return item
}

function abilityLabel(dex: Dex, id: AbilityId): string {
  return dex.ability(id)?.name ?? id
}

function resolveAbility(
  dex: Dex,
  id: AbilityId | null,
  species: Species,
  notes: NoteLog,
): AbilityEntry | null {
  if (id === null) return null
  const entry = abilityEntry(id)
  if (entry === null) {
    notes.add(
      `${displayName(species)}'s ${abilityLabel(dex, id)} is outside the damage model and was not applied.`,
    )
  }
  return entry
}

type SuppressInput = {
  readonly dex: Dex
  readonly attackerEntry: AbilityEntry | null
  readonly defenderEntry: AbilityEntry | null
  readonly defenderAbility: AbilityId | null
  readonly defenderSpecies: Species
  readonly notes: NoteLog
}

function suppressDefenderAbility({
  dex,
  attackerEntry,
  defenderEntry,
  defenderAbility,
  defenderSpecies,
  notes,
}: SuppressInput): AbilityEntry | null {
  if (attackerEntry?.moldBreaker !== true) return defenderEntry
  if (defenderAbility === null || defenderEntry === null) return defenderEntry
  if (dex.ability(defenderAbility)?.suppressable === false) return defenderEntry
  notes.add(
    `${displayName(defenderSpecies)}'s ${abilityLabel(dex, defenderAbility)} was suppressed by the attacker's Mold Breaker.`,
  )
  return null
}

function resolveTera(
  combatant: Attacker | Defender,
  species: Species,
  role: 'attacker' | 'defender',
  notes: NoteLog,
): TeraType | null {
  if (!combatant.terastallized) return null
  if (combatant.set.teraType === null) {
    notes.add(
      `The ${role} is Terastallized with no Tera type chosen, so it was treated as not Terastallized.`,
    )
    return null
  }
  if (!species.gimmicks.canTerastallize) {
    notes.add(`${displayName(species)} cannot Terastallize, but the calculation applied it anyway.`)
  }
  return combatant.set.teraType
}

type ViewInput = {
  readonly combatantSet: PokemonSet
  readonly species: Species
  readonly stats: StatSpread
  readonly boosts: SideView['boosts']
  readonly hpFraction: number
  readonly status: SideView['status']
  readonly terastallized: boolean
  readonly item: Item | null
  readonly types: readonly PokemonType[]
}

function viewOf({
  combatantSet,
  species,
  stats,
  boosts,
  hpFraction,
  status,
  terastallized,
  item,
  types,
}: ViewInput): SideView {
  return {
    set: combatantSet,
    species,
    stats,
    boosts,
    hpFraction: clamp(hpFraction, 0, 1),
    status,
    terastallized,
    ability: combatantSet.ability,
    item,
    types,
    originalTypes: species.types,
    grounded: isGrounded(types, combatantSet.ability),
  }
}

const LEVITATE = abilityId('levitate')

function isGrounded(types: readonly PokemonType[], ability: AbilityId | null): boolean {
  if (ability === LEVITATE) return false
  return !types.some((type) => type === 'flying')
}

function itemModifier(
  item: Item | null,
  pick: (handler: ItemHandler) => ItemHook | undefined,
  context: ModifierContext,
): number | null {
  if (item === null) return null
  const hook = pick(ITEM_REGISTRY[item.effect.kind])
  return hook === undefined ? null : hook(item.effect, context)
}

// --- Type effectiveness -----------------------------------------------------

function effectivenessOfMove(
  moveType: TeraType,
  defenderTypes: readonly PokemonType[],
  defenderTerastallized: boolean,
): number {
  if (moveType === 'stellar') return defenderTerastallized ? 2 : 1
  return effectivenessAgainst(moveType, defenderTypes)
}

type EffectivenessInput = {
  readonly provisional: ModifierContext
  readonly defenderEntry: AbilityEntry | null
  readonly dex: Dex
  readonly defenderAbility: AbilityId | null
  readonly defenderSpecies: Species
  readonly defenderTypes: readonly PokemonType[]
  readonly moveType: TeraType
  readonly notes: NoteLog
}

function resolveEffectiveness({
  provisional,
  defenderEntry,
  dex,
  defenderAbility,
  defenderSpecies,
  defenderTypes,
  moveType,
  notes,
}: EffectivenessInput): number {
  if (defenderEntry?.immuneTo === moveType && defenderAbility !== null) {
    notes.add(
      `${abilityLabel(dex, defenderAbility)} makes ${displayName(defenderSpecies)} immune to ${typeLabel(moveType)}.`,
    )
    return 0
  }

  const altered =
    defenderEntry?.alterEffectiveness === undefined
      ? provisional.effectiveness
      : defenderEntry.alterEffectiveness(provisional.effectiveness, provisional)

  if (altered === 0) {
    const blocking = defenderTypes.find((type) => effectivenessOf(moveType, type) === 0)
    if (blocking === undefined && defenderAbility !== null) {
      notes.add(
        `${abilityLabel(dex, defenderAbility)} blocks ${typeLabel(moveType)} against ${displayName(defenderSpecies)}.`,
      )
    } else if (blocking !== undefined) {
      notes.add(`${typeLabel(moveType)} does not affect ${typeLabel(blocking)} types.`)
    }
  }

  return altered
}

function typeLabel(type: TeraType): string {
  return type.charAt(0).toUpperCase() + type.slice(1)
}

// --- Stats ------------------------------------------------------------------

type AttackInput = {
  readonly context: ModifierContext
  readonly attacker: Attacker
  readonly attackerStats: StatSpread
  readonly attackStatName: BoostableStat
  readonly attackerEntry: AbilityEntry | null
  readonly defenderEntry: AbilityEntry | null
  readonly attackerItem: Item | null
  readonly dex: Dex
  readonly defenderAbility: AbilityId | null
  readonly criticalHit: boolean
  readonly notes: NoteLog
}

function resolveAttack({
  context,
  attacker,
  attackerStats,
  attackStatName,
  attackerEntry,
  defenderEntry,
  attackerItem,
  dex,
  defenderAbility,
  criticalHit,
  notes,
}: AttackInput): number {
  let stage = attacker.boosts[attackStatName]

  const imposed = defenderEntry?.foeAttackStage
  if (imposed !== undefined && imposed.stat === attackStatName && defenderAbility !== null) {
    stage += imposed.stages
    notes.add(
      `${abilityLabel(dex, defenderAbility)} was applied as ${signed(imposed.stages)} ${STAT_LABEL[imposed.stat]}. Clear it from the attacker's boosts if it is already counted there.`,
    )
  }

  if (defenderEntry?.ignoresFoeBoosts === true) stage = 0
  else if (criticalHit && stage < 0) stage = 0

  const modifier = chainModifiers([
    attackerEntry?.attackStat?.(context) ?? null,
    defenderEntry?.foeAttackStat?.(context) ?? null,
    itemModifier(attackerItem, (handler) => handler.attackStat, context),
  ])

  return Math.max(1, applyModifier(applyBoost(attackerStats[attackStatName], stage), modifier))
}

function signed(stages: number): string {
  return stages >= 0 ? `+${stages}` : `${stages}`
}

type DefenseInput = {
  readonly context: ModifierContext
  readonly defender: Defender
  readonly defenderStats: StatSpread
  readonly defenseStatName: BoostableStat
  readonly defenderTypes: readonly PokemonType[]
  readonly attackerEntry: AbilityEntry | null
  readonly defenderEntry: AbilityEntry | null
  readonly defenderItem: Item | null
  readonly criticalHit: boolean
}

function resolveDefense({
  context,
  defender,
  defenderStats,
  defenseStatName,
  defenderTypes,
  attackerEntry,
  defenderEntry,
  defenderItem,
  criticalHit,
}: DefenseInput): number {
  let stage = defender.boosts[defenseStatName]

  if (attackerEntry?.ignoresFoeBoosts === true) stage = 0
  else if (criticalHit || context.move.flags.ignoresDefenseBoosts) stage = Math.min(stage, 0)

  const modifier = chainModifiers([
    defenderEntry?.defenseStat?.(context) ?? null,
    attackerEntry?.foeDefenseStat?.(context) ?? null,
    itemModifier(defenderItem, (handler) => handler.defenseStat, context),
    weatherDefenseModifier(context.field.weather, defenderTypes, defenseStatName),
  ])

  return Math.max(1, applyModifier(applyBoost(defenderStats[defenseStatName], stage), modifier))
}

// --- Field ------------------------------------------------------------------

function weatherDamageModifier(weather: Weather, moveType: TeraType): number {
  switch (weather) {
    case 'none':
    case 'sand':
    case 'snow':
      return MOD_ONE
    case 'sun':
      if (moveType === 'fire') return MOD_ONE_AND_A_HALF
      if (moveType === 'water') return MOD_HALF
      return MOD_ONE
    case 'rain':
      if (moveType === 'water') return MOD_ONE_AND_A_HALF
      if (moveType === 'fire') return MOD_HALF
      return MOD_ONE
    default:
      throw ImpossibleState.unreachable(weather)
  }
}

function weatherDefenseModifier(
  weather: Weather,
  defenderTypes: readonly PokemonType[],
  defenseStatName: BoostableStat,
): number | null {
  switch (weather) {
    case 'none':
    case 'sun':
    case 'rain':
      return null
    case 'sand':
      return defenseStatName === 'spd' && defenderTypes.some((type) => type === 'rock')
        ? MOD_ONE_AND_A_HALF
        : null
    case 'snow':
      return defenseStatName === 'def' && defenderTypes.some((type) => type === 'ice')
        ? MOD_ONE_AND_A_HALF
        : null
    default:
      throw ImpossibleState.unreachable(weather)
  }
}

function terrainPowerModifier(terrain: Terrain, context: ModifierContext): number | null {
  switch (terrain) {
    case 'none':
      return null
    case 'electric':
      return context.moveType === 'electric' && context.attacker.grounded ? MOD_TERRAIN_BOOST : null
    case 'grassy':
      return context.moveType === 'grass' && context.attacker.grounded ? MOD_TERRAIN_BOOST : null
    case 'psychic':
      return context.moveType === 'psychic' && context.attacker.grounded ? MOD_TERRAIN_BOOST : null
    case 'misty':
      return context.moveType === 'dragon' && context.defender.grounded ? MOD_HALF : null
    default:
      throw ImpossibleState.unreachable(terrain)
  }
}

type ScreenInput = {
  readonly field: Field
  readonly category: 'physical' | 'special'
  readonly criticalHit: boolean
  readonly notes: NoteLog
}

function screenModifier({ field, category, criticalHit, notes }: ScreenInput): number | null {
  const side = field.defenderSide
  const up = side.auroraVeil || (category === 'physical' ? side.reflect : side.lightScreen)
  if (!up) return null
  if (criticalHit) {
    notes.add('A critical hit went through the screen on the defending side.')
    return null
  }
  return field.style === 'doubles' ? MOD_SCREEN_DOUBLES : MOD_SCREEN_SINGLES
}

// --- Notes ------------------------------------------------------------------

type RegistryNoteInput = {
  readonly context: ModifierContext
  readonly attackerEntry: AbilityEntry | null
  readonly defenderEntry: AbilityEntry | null
  readonly attackerItem: Item | null
  readonly defenderItem: Item | null
  readonly notes: NoteLog
}

function addRegistryNotes({
  context,
  attackerEntry,
  defenderEntry,
  attackerItem,
  defenderItem,
  notes,
}: RegistryNoteInput): void {
  notes.add(attackerEntry?.note?.(context))
  notes.add(defenderEntry?.note?.(context))
  notes.add(itemNote(attackerItem, 'attacker', context))
  notes.add(itemNote(defenderItem, 'defender', context))
}

function itemNote(item: Item | null, role: ItemRole, context: ModifierContext): string | null {
  if (item === null) return null
  const hook = ITEM_REGISTRY[item.effect.kind].note
  return hook === undefined ? null : hook(item, role, context)
}

// --- Results ----------------------------------------------------------------

function percentOf(rolls: readonly number[], maxHp: number): DamageResult['percent'] {
  const first = rolls[0] ?? 0
  const last = rolls[rolls.length - 1] ?? 0
  return { min: toTenth((first / maxHp) * 100), max: toTenth((last / maxHp) * 100) }
}

function toTenth(value: number): number {
  return Math.round(value * 10) / 10
}

type TerminalResultInput = {
  readonly context: ModifierContext
  readonly maxHp: number
  readonly currentHp: number
  readonly notes: NoteLog
}

function immuneResult({ context, maxHp, currentHp, notes }: TerminalResultInput): DamageResult {
  const rolls = RANDOM_FACTORS.map(() => 0)
  return {
    rolls,
    min: 0,
    max: 0,
    percent: { min: 0, max: 0 },
    defenderMaxHp: maxHp,
    defenderCurrentHp: currentHp,
    effectiveness: 0,
    stab: 1,
    basePower: 0,
    attackStat: 0,
    defenseStat: 0,
    hits: context.move.multiHit?.max ?? 1,
    criticalHit: context.criticalHit,
    immune: true,
    ko: koChance({ rolls, currentHp }),
    notes: notes.all(),
  }
}

function exactResult({
  context,
  damage,
  maxHp,
  currentHp,
  notes,
}: TerminalResultInput & { readonly damage: number }): DamageResult {
  const capped = Math.max(1, Math.min(damage, currentHp))
  const rolls = RANDOM_FACTORS.map(() => capped)
  return {
    rolls,
    min: capped,
    max: capped,
    percent: percentOf(rolls, maxHp),
    defenderMaxHp: maxHp,
    defenderCurrentHp: currentHp,
    effectiveness: context.effectiveness,
    stab: 1,
    basePower: 0,
    attackStat: 0,
    defenseStat: 0,
    hits: 1,
    criticalHit: context.criticalHit,
    immune: false,
    ko: koChance({ rolls, currentHp }),
    notes: notes.all(),
  }
}
