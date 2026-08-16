/**
 * Sprite URLs.
 *
 * The dataset stores a `spriteKey` rather than a URL so the dataset does not
 * have to be rebuilt when the sprite host changes. Sprites are identification,
 * not decoration — they exist so a person can find one Pokémon in a grid of
 * thirty at a glance. See CLAUDE.md §Tone.
 */

const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon'

export type SpriteStyle = 'front' | 'artwork'

export function spriteUrl(spriteKey: string, style: SpriteStyle = 'front'): string {
  return style === 'artwork'
    ? `${SPRITE_BASE}/other/official-artwork/${spriteKey}.png`
    : `${SPRITE_BASE}/${spriteKey}.png`
}

/** A transparent 1x1 so an empty slot never lays out differently from a full one. */
export const BLANK_SPRITE =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
