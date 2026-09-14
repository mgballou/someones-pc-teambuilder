import { describe, expect, it } from 'vitest'
import { loadDataset } from '../src/disk'
import { titleWords } from '../src/ingest/text'

/**
 * The committed dataset is a build artifact, and for four abilities it carried
 * a build mistake: the ingest capitalized every word, so Chi-Yu's ability read
 * "Beads Of Ruin" on every screen that named it. These pin the shipped names
 * rather than the function that makes them, because it is the shipped names a
 * reader sees.
 */

const dataset = await loadDataset()

/** Present tense in the middle of a name. Never right in this vocabulary. */
const MIS_CASED = / (Of|The|And|As|To|For|From|With|Into|Nor|At|By|Or|A|An)\b/

describe('the shipped names', () => {
  it.each(['beads-of-ruin', 'sword-of-ruin', 'vessel-of-ruin', 'tablets-of-ruin'])(
    '%s reads the way the games write it',
    (id) => {
      expect(dataset.abilities.find((ability) => ability.id === id)?.name).toBe(titleWords(id))
    },
  )

  it('spells Beads of Ruin out in full', () => {
    expect(dataset.abilities.find((ability) => ability.id === 'beads-of-ruin')?.name).toBe(
      'Beads of Ruin',
    )
  })

  it('capitalizes no connecting word in any ability', () => {
    expect(dataset.abilities.filter((ability) => MIS_CASED.test(ability.name))).toEqual([])
  })

  it('capitalizes no connecting word in any move', () => {
    expect(dataset.moves.filter((move) => MIS_CASED.test(move.name))).toEqual([])
  })

  it('capitalizes no connecting word in any item', () => {
    expect(dataset.items.filter((item) => MIS_CASED.test(item.name))).toEqual([])
  })

  it('keeps the particles the games capitalize', () => {
    expect(dataset.moves.find((move) => move.id === 'knock-off')?.name).toBe('Knock Off')
  })
})
