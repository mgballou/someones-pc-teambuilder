/**
 * Committed sample payloads.
 *
 * Real PokéAPI responses, cut down to the fields the schemas keep. They back
 * `FakePokeApiClient`, which means the whole dex test suite runs with no
 * network and no mocks — and because the fake runs the same zod schemas as the
 * live client, a sample that drifts from the real shape fails a test rather
 * than an ingest.
 *
 * Chosen for what each one exercises:
 *
 * - `landorus-incarnate` / `landorus-therian` — two forms, one dex number.
 * - `dusclops` — evolves, so `canEvolve` and therefore Eviolite.
 * - `ogerpon-wellspring-mask` — a form that cannot Terastallize.
 * - `aerial-ace` — `accuracy: null`, which must never become 100.
 * - `wave-crash` — `meta: null`, so recoil comes from the curated table.
 * - `metronome` — an item whose effect is not modelled and is present anyway.
 */

import abilities from './abilities.json'
import items from './items.json'
import moves from './moves.json'
import pokemon from './pokemon.json'
import pokemonSpecies from './pokemon-species.json'
import type { FakePayloads } from '../client.js'

export const SAMPLE_PAYLOADS: FakePayloads = {
  pokemon,
  pokemonSpecies,
  moves,
  items,
  abilities,
}
