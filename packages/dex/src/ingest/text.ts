/** Small shared conversions used by every normalizer. */

import { IngestError } from '../errors'

const GENERATIONS: Readonly<Record<string, number>> = {
  'generation-i': 1,
  'generation-ii': 2,
  'generation-iii': 3,
  'generation-iv': 4,
  'generation-v': 5,
  'generation-vi': 6,
  'generation-vii': 7,
  'generation-viii': 8,
  'generation-ix': 9,
}

/** `generation-ix` -> 9. Zero for a generation this build has not heard of. */
export function generationNumber(name: string): number {
  return GENERATIONS[name] ?? 0
}

/** `rapid-strike` -> `Rapid-Strike`. Hyphens are kept; they read as form names. */
export function titleCase(slug: string): string {
  return slug
    .split('-')
    .map((part) => (part === '' ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join('-')
}

/**
 * Words a name keeps in lower case unless they start it.
 *
 * `Beads Of Ruin` is not what the ability is called, and capitalizing every
 * word is how the dataset came to say it. Only prepositions and conjunctions
 * are here: `up`, `out`, `on` and `in` are particles in this vocabulary — Bulk
 * Up, Wimp Out, Lock On — and are capitalized in the games, so they stay out.
 */
const MINOR_WORDS: ReadonlySet<string> = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'by',
  'for',
  'from',
  'into',
  'nor',
  'of',
  'or',
  'the',
  'to',
  'with',
])

/** `swords-dance` -> `Swords Dance`, for moves and items rather than forms. */
export function titleWords(slug: string): string {
  return titleCase(slug)
    .split('-')
    .map((word, index) =>
      index > 0 && MINOR_WORDS.has(word.toLowerCase()) ? word.toLowerCase() : word,
    )
    .join(' ')
}

/**
 * One sentence, no markup.
 *
 * PokéAPI's `short_effect` carries Veekun link syntax — `[Attack]{stat.attack}`
 * — and sometimes runs to a paragraph. The dataset is committed and read into
 * memory on every request; prose is the cheapest thing to cut.
 */
export function oneSentence(text: string): string {
  const plain = text
    .replace(/\[([^\]]*)\]\{[^}]*\}/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
  const stop = plain.indexOf('. ')
  const first = stop === -1 ? plain : plain.slice(0, stop + 1)
  return first.length > 180 ? `${first.slice(0, 177).trimEnd()}...` : first
}

const STAT_NAMES: Readonly<Record<string, 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe'>> = {
  hp: 'hp',
  attack: 'atk',
  defense: 'def',
  'special-attack': 'spa',
  'special-defense': 'spd',
  speed: 'spe',
}

export function statKey(
  subject: string,
  name: string,
): 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe' {
  const key = STAT_NAMES[name]
  if (key === undefined) throw IngestError.missingStat(subject, name)
  return key
}

/**
 * The same mapping, minus HP, for the stats a move can change.
 *
 * Returns `null` rather than throwing for accuracy and evasion, which are real
 * PokéAPI stats and are deliberately outside core's `BoostableStat` — Sand
 * Attack and Double Team change a number the damage chain never reads.
 */
export function boostableStatKey(name: string): 'atk' | 'def' | 'spa' | 'spd' | 'spe' | null {
  const key = STAT_NAMES[name]
  return key === undefined || key === 'hp' ? null : key
}
