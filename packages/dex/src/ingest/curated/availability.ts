/**
 * The four forms whose move lists lie about whether Scarlet and Violet hold
 * them.
 *
 * Reading presence off a version-grouped move list agrees with `@pkmn/dex` on
 * 1,347 of 1,351 forms. All four exceptions are forms a player never builds and
 * the game only ever produces mid-battle or out of an event, which is exactly
 * where a move list has nothing honest to say.
 *
 * Keys are `pokemon` names — forms, not species.
 */

/** Present in Scarlet and Violet, with no move list of their own to prove it. */
export const AVAILABLE_IN_GEN_9: ReadonlySet<string> = new Set([
  /**
   * The Battle Bond Greninja from the Scarlet and Violet raid event. PokéAPI
   * files its moves under the generation VI and VII games it was introduced
   * in and never re-filed them.
   */
  'greninja-battle-bond',
  /**
   * Cramorant is in the Indigo Disk, and these are the two forms it takes
   * after it swallows something. They exist only during a battle, so PokéAPI
   * carries no Scarlet and Violet move list against either.
   */
  'cramorant-gulping',
  'cramorant-gorging',
])

/** Absent from Scarlet and Violet, despite carrying a move list that says otherwise. */
export const UNAVAILABLE_IN_GEN_9: ReadonlySet<string> = new Set([
  /**
   * Ash-Greninja was a Sun and Moon story form and did not come forward. Its
   * PokéAPI entry repeats ordinary Greninja's move list, Scarlet and Violet
   * included, which is the one case where the move list is not evidence.
   */
  'greninja-ash',
])
