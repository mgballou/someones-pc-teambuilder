/**
 * Reading a Showdown paste back into sets.
 *
 * Forgiving in input, strict in output. Pastes arrive with CRLF endings, extra
 * blank lines, `~` bullets instead of `-`, a missing ability, a missing nature,
 * a Pokepaste team header, and a move the dataset has never heard of. All of
 * that parses. What comes out the other side is domain data or nothing: an id
 * in a returned set is an id the `Dex` answered to.
 *
 * Nothing throws and nothing is dropped in silence. A paste with one bad move
 * returns the other five sets and a problem naming the line, because the
 * alternative — refusing the whole import — throws away work the person
 * already did.
 */

import type { Dex } from '../dex'
import type { AbilityId, ItemId, MoveId, SetId, SpeciesId } from '../ids'
import { abilityId, itemId, moveId, speciesId, toSlug } from '../ids'
import type { TeraType } from '../pokemon-type'
import { isTeraType } from '../pokemon-type'
import type { Gender, MoveSlots, PokemonSet } from '../set'
import { MAX_MOVES } from '../set'
import type { Nature, Stat, StatSpread } from '../stats'
import { DEFAULT_LEVEL, EMPTY_EVS, isNature, MAX_EV_TOTAL, PERFECT_IVS, totalEvs } from '../stats'
import type { ParseProblem, ProblemLocation } from './problems'
import { primarySlug, resolveAbility, resolveItem, resolveMove, resolveSpecies } from './resolve'

export type SetIdInput = {
  /** 0-based index of the set block within the paste. */
  readonly index: number
  readonly species: SpeciesId
  readonly nickname: string | null
}

export type SetIdFactory = (input: SetIdInput) => SetId

export type ParseInput = {
  readonly paste: string
  readonly dex: Dex
  /** The level a paste means when it carries no `Level:` line. */
  readonly defaultLevel?: number
  /** How imported sets get their ids. The core has no id generator of its own. */
  readonly setId?: SetIdFactory
}

/**
 * Sets, problems, or both.
 *
 * Discriminated rather than a bag with two possibly-empty arrays, so a caller
 * that wants to refuse an imperfect import and a caller that wants to accept
 * one both have to say which they are.
 */
export type ParseResult =
  | { readonly kind: 'ok'; readonly sets: readonly PokemonSet[] }
  | {
      readonly kind: 'partial'
      readonly sets: readonly PokemonSet[]
      readonly problems: readonly ParseProblem[]
    }
  | { readonly kind: 'empty'; readonly problems: readonly ParseProblem[] }

export function setsOf(result: ParseResult): readonly PokemonSet[] {
  switch (result.kind) {
    case 'ok':
      return result.sets
    case 'partial':
      return result.sets
    case 'empty':
      return []
    default: {
      const exhaustive: never = result
      return exhaustive
    }
  }
}

export function problemsOf(result: ParseResult): readonly ParseProblem[] {
  switch (result.kind) {
    case 'ok':
      return []
    case 'partial':
      return result.problems
    case 'empty':
      return result.problems
    default: {
      const exhaustive: never = result
      return exhaustive
    }
  }
}

/**
 * The fallback id scheme. A brand is a promise no type guard can check, which
 * is why this is the one cast in the module; callers that have real ids pass
 * their own factory.
 */
const sequentialSetId: SetIdFactory = ({ index }) => `imported-${index + 1}` as SetId

export function parse({
  paste,
  dex,
  defaultLevel = DEFAULT_LEVEL,
  setId = sequentialSetId,
}: ParseInput): ParseResult {
  const sets: PokemonSet[] = []
  const problems: ParseProblem[] = []

  splitBlocks(paste).forEach((block, index) => {
    const parsed = parseBlock({ block, index, dex, defaultLevel, setId })
    if (parsed.set !== null) sets.push(parsed.set)
    problems.push(...parsed.problems)
  })

  if (sets.length === 0) return { kind: 'empty', problems }
  if (problems.length === 0) return { kind: 'ok', sets }
  return { kind: 'partial', sets, problems }
}

type SourceLine = {
  /** 1-based line number in the original paste. */
  readonly number: number
  readonly text: string
}

/** Pokepaste and the Showdown teambuilder both fence teams with these. */
const TEAM_HEADER = /^===.*===$/

/** Runs of non-blank lines. CRLF, lone CR and LF all end a line. */
function splitBlocks(paste: string): readonly (readonly SourceLine[])[] {
  const blocks: SourceLine[][] = []
  let current: SourceLine[] = []

  const close = (): void => {
    if (current.length > 0) {
      blocks.push(current)
      current = []
    }
  }

  paste.split(/\r\n|\r|\n/).forEach((raw, offset) => {
    const text = raw.trim()
    if (text === '' || TEAM_HEADER.test(text)) {
      close()
      return
    }
    current.push({ number: offset + 1, text })
  })
  close()

  return blocks
}

type ParseBlockInput = {
  readonly block: readonly SourceLine[]
  readonly index: number
  readonly dex: Dex
  readonly defaultLevel: number
  readonly setId: SetIdFactory
}

type BlockResult = {
  readonly set: PokemonSet | null
  readonly problems: readonly ParseProblem[]
}

const MOVE_BULLET = /^[-~•*+]\s*(\S.*)$/
const FIELD = /^([A-Za-z][A-Za-z0-9 .]*?)\s*:\s*(.*)$/
const NATURE_LINE = /^([A-Za-z]+)\s+Nature$/i

function parseBlock({ block, index, dex, defaultLevel, setId }: ParseBlockInput): BlockResult {
  const problems: ParseProblem[] = []
  const head = block[0]
  if (head === undefined) return { set: null, problems }

  const at = (line: SourceLine): ProblemLocation => ({
    line: line.number,
    block: index + 1,
    text: line.text,
  })

  const identity = parseIdentity(head.text, dex)
  if (identity.species === null) {
    problems.push({
      ...at(head),
      kind: 'unknown-species',
      id: speciesId(primarySlug(identity.speciesText)),
    })
    return { set: null, problems }
  }
  if (identity.itemText !== null && identity.item === null) {
    problems.push({
      ...at(head),
      kind: 'unknown-item',
      id: itemId(primarySlug(identity.itemText)),
    })
  }

  let level = defaultLevel
  let shiny = false
  let gigantamax = false
  let ability: AbilityId | null = null
  let nature: Nature = 'hardy'
  let teraType: TeraType | null = null
  let evs: StatSpread = EMPTY_EVS
  let ivs: StatSpread = PERFECT_IVS
  let evLine: SourceLine = head
  const moves: MoveId[] = []
  let moveLines = 0

  const readSpread = (line: SourceLine, value: string, base: StatSpread): StatSpread => {
    const parsed = parseSpread(value, base)
    for (const label of parsed.unknown) {
      problems.push({ ...at(line), kind: 'unknown-stat', value: label })
    }
    if (parsed.malformed) problems.push({ ...at(line), kind: 'malformed-line' })
    return parsed.spread
  }

  const readNature = (line: SourceLine, value: string): void => {
    const lowered = value.trim().toLowerCase()
    if (isNature(lowered)) nature = lowered
    else problems.push({ ...at(line), kind: 'unknown-nature', value: value.trim() })
  }

  for (const line of block.slice(1)) {
    const bullet = MOVE_BULLET.exec(line.text)
    if (bullet !== null) {
      moveLines += 1
      if (moveLines > MAX_MOVES) {
        problems.push({ ...at(line), kind: 'too-many-moves', limit: MAX_MOVES })
        continue
      }
      const text = normalizeMoveText(bullet[1] ?? '')
      const resolved = resolveMove(dex, text)
      if (resolved === null) {
        problems.push({ ...at(line), kind: 'unknown-move', id: moveId(primarySlug(text)) })
      } else {
        moves.push(resolved)
      }
      continue
    }

    const field = FIELD.exec(line.text)
    if (field !== null) {
      const name = (field[1] ?? '').trim()
      const value = (field[2] ?? '').trim()
      switch (toSlug(name)) {
        case 'ability':
        case 'trait': {
          const resolved = resolveAbility(dex, value)
          if (resolved === null) {
            problems.push({
              ...at(line),
              kind: 'unknown-ability',
              id: abilityId(primarySlug(value)),
            })
          } else {
            ability = resolved
          }
          break
        }
        case 'level': {
          const parsed = Number.parseInt(value, 10)
          if (Number.isNaN(parsed)) problems.push({ ...at(line), kind: 'malformed-line' })
          else level = parsed
          break
        }
        case 'shiny':
          shiny = isAffirmative(value)
          break
        case 'gigantamax':
        case 'gmax':
          gigantamax = isAffirmative(value)
          break
        case 'tera-type':
        case 'teratype':
        case 'tera': {
          const lowered = value.toLowerCase()
          if (isTeraType(lowered)) teraType = lowered
          else problems.push({ ...at(line), kind: 'unknown-tera-type', value })
          break
        }
        case 'nature':
          readNature(line, value)
          break
        case 'evs':
          evs = readSpread(line, value, EMPTY_EVS)
          evLine = line
          break
        case 'ivs':
          ivs = readSpread(line, value, PERFECT_IVS)
          break
        case 'happiness':
        case 'friendship':
        case 'pokeball':
        case 'ball':
        case 'dynamax-level':
        case 'hidden-power':
          problems.push({ ...at(line), kind: 'unsupported-field', field: name })
          break
        default:
          problems.push({ ...at(line), kind: 'malformed-line' })
      }
      continue
    }

    const natureLine = NATURE_LINE.exec(line.text)
    if (natureLine !== null) {
      readNature(line, natureLine[1] ?? '')
      continue
    }

    problems.push({ ...at(line), kind: 'malformed-line' })
  }

  const spent = totalEvs(evs)
  if (spent > MAX_EV_TOTAL) {
    problems.push({
      ...at(evLine),
      kind: 'ev-total-exceeded',
      total: spent,
      max: MAX_EV_TOTAL,
    })
  }

  const set: PokemonSet = {
    id: setId({ index, species: identity.species, nickname: identity.nickname }),
    species: identity.species,
    nickname: identity.nickname,
    level,
    gender: identity.gender,
    shiny,
    ability,
    item: identity.item,
    nature,
    evs,
    ivs,
    moves: toMoveSlots(moves),
    teraType,
    gigantamax,
    /** A paste has nowhere to put them. See the module note on what is lossy. */
    notes: '',
  }

  return { set, problems }
}

type Identity = {
  readonly nickname: string | null
  readonly species: SpeciesId | null
  /** What we read as the species, kept for the problem when it does not resolve. */
  readonly speciesText: string
  readonly gender: Gender | null
  readonly item: ItemId | null
  /** Null when the line named no item at all, as opposed to an unknown one. */
  readonly itemText: string | null
}

const ITEM_SUFFIX = /^(.*)\s+@\s*(\S.*)$/
const GENDER_SUFFIX = /^(.*?)\s*\((m|f|n)\)$/i
const NICKNAME_SHAPE = /^(.*\S)\s*\((.+)\)$/

const GENDER_BY_MARK: Readonly<Record<string, Gender>> = {
  m: 'male',
  f: 'female',
  n: 'genderless',
}

/**
 * `Nickname (Species) (M) @ Item`, and every shorter form of it.
 *
 * Read right to left, because that is the only direction where each piece is
 * unambiguous: the item is whatever follows the last ` @ `, the gender is a
 * one-letter parenthetical at the very end, and only then is what remains
 * either a bare species or a nickname wrapping one.
 */
function parseIdentity(text: string, dex: Dex): Identity {
  let rest = text.trim()

  let itemText: string | null = null
  const item = ITEM_SUFFIX.exec(rest)
  if (item !== null) {
    rest = (item[1] ?? '').trim()
    itemText = (item[2] ?? '').trim()
  }

  let gender: Gender | null = null
  const marked = GENDER_SUFFIX.exec(rest)
  if (marked !== null) {
    gender = GENDER_BY_MARK[(marked[2] ?? '').toLowerCase()] ?? null
    rest = (marked[1] ?? '').trim()
  }

  const resolvedItem = itemText === null ? null : resolveItem(dex, itemText)
  const whole = resolveSpecies(dex, rest)
  if (whole !== null) {
    return {
      nickname: null,
      species: whole,
      speciesText: rest,
      gender,
      item: resolvedItem,
      itemText,
    }
  }

  const named = NICKNAME_SHAPE.exec(rest)
  if (named !== null) {
    const nickname = (named[1] ?? '').trim()
    const speciesText = (named[2] ?? '').trim()
    return {
      nickname: nickname === '' ? null : nickname,
      species: resolveSpecies(dex, speciesText),
      speciesText,
      gender,
      item: resolvedItem,
      itemText,
    }
  }

  return { nickname: null, species: null, speciesText: rest, gender, item: resolvedItem, itemText }
}

/**
 * Hidden Power carries its type in brackets and, in older pastes, a base power
 * after it. Return and Frustration carry a power the same way. Neither belongs
 * in the name.
 */
function normalizeMoveText(text: string): string {
  return text
    .replace(/\[([^\]]*)\]/g, ' $1 ')
    .replace(/\s+\d+\s*$/, '')
    .trim()
}

function isAffirmative(value: string): boolean {
  const lowered = value.trim().toLowerCase()
  return lowered === 'yes' || lowered === 'true' || lowered === 'y'
}

/**
 * Stat labels, every spelling a paste uses.
 *
 * `Spd` means Special Defense here, as it does in Showdown. It reads like
 * Speed and is not, and getting it wrong moves 252 EVs to the wrong stat.
 */
const STAT_ALIASES: Readonly<Record<string, Stat>> = {
  hp: 'hp',
  health: 'hp',
  'hit-points': 'hp',
  atk: 'atk',
  attack: 'atk',
  def: 'def',
  defense: 'def',
  defence: 'def',
  spa: 'spa',
  'sp-a': 'spa',
  'sp-atk': 'spa',
  spatk: 'spa',
  satk: 'spa',
  'sp-attack': 'spa',
  'special-attack': 'spa',
  spd: 'spd',
  'sp-d': 'spd',
  'sp-def': 'spd',
  spdef: 'spd',
  sdef: 'spd',
  'sp-defense': 'spd',
  'special-defense': 'spd',
  'special-defence': 'spd',
  spe: 'spe',
  'sp-e': 'spe',
  speed: 'spe',
}

type SpreadParse = {
  readonly spread: StatSpread
  readonly unknown: readonly string[]
  readonly malformed: boolean
}

const AMOUNT_FIRST = /^(\d+)\s*(\S.*)$/
const LABEL_FIRST = /^(.*?\S)\s*(\d+)$/

/** `252 Atk / 4 Def / 252 Spe`, in either order, any spacing. */
function parseSpread(value: string, base: StatSpread): SpreadParse {
  const spread: Record<Stat, number> = { ...base }
  const unknown: string[] = []
  let malformed = false

  for (const raw of value.split('/')) {
    const segment = raw.trim()
    if (segment === '') continue

    const amountFirst = AMOUNT_FIRST.exec(segment)
    const labelFirst = amountFirst === null ? LABEL_FIRST.exec(segment) : null
    const amount = amountFirst !== null ? amountFirst[1] : labelFirst?.[2]
    const label = amountFirst !== null ? amountFirst[2] : labelFirst?.[1]
    if (amount === undefined || label === undefined) {
      malformed = true
      continue
    }

    const stat = STAT_ALIASES[toSlug(label)]
    if (stat === undefined) {
      unknown.push(label.trim())
      continue
    }
    spread[stat] = Number.parseInt(amount, 10)
  }

  return { spread, unknown, malformed }
}

function toMoveSlots(moves: readonly MoveId[]): MoveSlots {
  return [moves[0] ?? null, moves[1] ?? null, moves[2] ?? null, moves[3] ?? null]
}
