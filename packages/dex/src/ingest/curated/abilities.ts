/**
 * Abilities that cannot be turned off.
 *
 * PokéAPI has no flag for this. The list is the games' own: abilities tied to
 * a form change or an identity, which Gastro Acid, Neutralizing Gas, Mold
 * Breaker, Entrainment and the rest all leave alone. Everything else is
 * suppressable, which is the safe default — a calculator that wrongly thinks
 * an ability *can* be ignored produces a lower number, not a higher one.
 */
export const UNSUPPRESSABLE_ABILITIES: ReadonlySet<string> = new Set([
  'as-one-glastrier',
  'as-one-spectrier',
  'battle-bond',
  'comatose',
  'commander',
  'disguise',
  /** PokéAPI carries one `embody-aspect`, not one per mask. */
  'embody-aspect',
  'gulp-missile',
  'ice-face',
  'multitype',
  'power-construct',
  'rks-system',
  'schooling',
  'shields-down',
  'stance-change',
  'tera-shift',
  'zen-mode',
  'zero-to-hero',
])
