/**
 * Move flags. Curated, because PokéAPI does not carry them.
 *
 * `/move/{name}` has type, power, accuracy, target and a `meta` block, and
 * nothing at all about whether a move makes contact, is a punch, is a sound
 * move or is stopped by Protect. Those facts are what Rough Skin, Iron Fist,
 * Punching Glove, Throat Spray, Soundproof and half the damage registry read,
 * so they have to come from somewhere. They come from here.
 *
 * This is the largest curated file in the package and the most likely to be
 * incomplete — the honest reading is "every move listed is right, a move that
 * is missing reads as not having the flag". Add to it rather than deriving.
 */

const set = (...names: readonly string[]): ReadonlySet<string> => new Set(names)

export const CONTACT_MOVES = set(
  'accelerock', 'acrobatics', 'aerial-ace', 'aqua-jet', 'aqua-step', 'aqua-tail', 'arm-thrust',
  'assurance', 'astonish', 'avalanche', 'axe-kick', 'aura-wheel', 'behemoth-bash',
  'behemoth-blade', 'bide', 'bind', 'bite', 'bitter-blade', 'blaze-kick', 'blazing-torque',
  'body-press', 'body-slam', 'bolt-beak', 'bolt-strike', 'bounce', 'brave-bird', 'brick-break',
  'brutal-swing', 'bug-bite', 'bullet-punch', 'ceaseless-edge', 'chip-away', 'circle-throw',
  'close-combat', 'collision-course', 'combat-torque', 'comet-punch', 'constrict', 'counter',
  'covet', 'crabhammer', 'cross-chop', 'cross-poison', 'crunch', 'crush-claw', 'crush-grip',
  'cut', 'darkest-lariat', 'dig', 'dire-claw', 'dive', 'dizzy-punch', 'double-edge',
  'double-hit', 'double-iron-bash', 'double-kick', 'double-shock', 'double-slap',
  'dragon-ascent', 'dragon-claw', 'dragon-hammer', 'dragon-rush', 'dragon-tail', 'drain-punch',
  'draining-kiss', 'drill-peck', 'drill-run', 'dual-chop', 'dual-wingbeat', 'dynamic-punch',
  'electro-drift', 'endeavor', 'extreme-speed', 'facade', 'fake-out', 'false-surrender',
  'false-swipe', 'feint-attack', 'fell-stinger', 'fire-fang', 'fire-lash', 'fire-punch',
  'first-impression', 'fishious-rend', 'flail', 'flame-charge', 'flame-wheel', 'flare-blitz',
  'floaty-fall', 'flower-trick', 'fly', 'flying-press', 'focus-punch', 'force-palm',
  'foul-play', 'frustration', 'fury-attack', 'fury-cutter', 'fury-swipes', 'giga-impact',
  'gigaton-hammer', 'glaive-rush', 'grass-knot', 'grassy-glide', 'grav-apple', 'guillotine',
  'gyro-ball', 'hammer-arm', 'hard-press', 'head-charge', 'head-smash', 'headbutt',
  'headlong-rush', 'heat-crash', 'heavy-slam', 'high-horsepower', 'high-jump-kick',
  'horn-attack', 'horn-drill', 'horn-leech', 'hyper-drill', 'hyper-fang', 'ice-ball',
  'ice-fang', 'ice-hammer', 'ice-punch', 'ice-spinner', 'iron-head', 'iron-tail', 'jaw-lock',
  'jet-punch', 'jump-kick', 'karate-chop', 'knock-off', 'kowtow-cleave', 'last-resort',
  'last-respects', 'leaf-blade', 'leech-life', 'lick', 'liquidation', 'low-kick', 'low-sweep',
  'lunge', 'mach-punch', 'magical-torque', 'mega-kick', 'mega-punch', 'megahorn',
  'metal-claw', 'meteor-mash', 'mighty-cleave', 'mortal-spin', 'multi-attack', 'noxious-torque',
  'nuzzle', 'outrage', 'payback', 'peck', 'phantom-force', 'plasma-fists', 'play-rough',
  'pluck', 'poison-fang', 'poison-jab', 'poison-tail', 'population-bomb', 'pounce',
  'power-trip', 'power-up-punch', 'power-whip', 'psyblade', 'psychic-fangs', 'psyshield-bash',
  'pursuit', 'quick-attack', 'rage', 'rage-fist', 'raging-bull', 'raging-fury', 'rapid-spin',
  'razor-shell', 'retaliate', 'return', 'revenge', 'reversal', 'rock-climb', 'rock-smash',
  'rolling-kick', 'rollout', 'sacred-sword', 'scratch', 'seismic-toss', 'shadow-claw',
  'shadow-force', 'shadow-punch', 'shadow-sneak', 'sky-drop', 'sky-uppercut', 'slam', 'slash',
  'smart-strike', 'snap-trap', 'spectral-thief', 'spin-out', 'steamroller', 'steel-roller',
  'steel-wing', 'stomp', 'stomping-tantrum', 'stone-axe', 'storm-throw', 'strength', 'struggle',
  'submission', 'sucker-punch', 'sunsteel-strike', 'super-fang', 'supercell-slam',
  'superpower', 'surging-strikes', 'tackle', 'tail-slap', 'take-down', 'temper-flare', 'thief',
  'thrash', 'throat-chop', 'thunder-fang', 'thunder-punch', 'thunderous-kick', 'trailblaze',
  'triple-axel', 'triple-dive', 'trop-kick', 'u-turn', 'upper-hand', 'v-create', 'vine-whip',
  'vise-grip', 'vital-throw', 'volt-tackle', 'wake-up-slap', 'waterfall', 'wave-crash',
  'wicked-blow', 'wicked-torque', 'wild-charge', 'wing-attack', 'wood-hammer', 'wrap',
  'wring-out', 'x-scissor', 'zen-headbutt', 'zing-zap',
)

export const SOUND_MOVES = set(
  'alluring-voice', 'boomburst', 'bug-buzz', 'chatter', 'clanging-scales', 'clangorous-soul',
  'confide', 'disarming-voice', 'echoed-voice', 'eerie-spell', 'grass-whistle', 'growl',
  'heal-bell', 'howl', 'hyper-voice', 'metal-sound', 'noble-roar', 'overdrive', 'parting-shot',
  'perish-song', 'psychic-noise', 'relic-song', 'roar', 'round', 'screech', 'sing', 'snarl',
  'snore', 'sparkling-aria', 'supersonic', 'torch-song', 'uproar',
)

export const PUNCH_MOVES = set(
  'bullet-punch', 'comet-punch', 'dizzy-punch', 'double-iron-bash', 'drain-punch',
  'dynamic-punch', 'fire-punch', 'focus-punch', 'hammer-arm', 'ice-hammer', 'ice-punch',
  'jet-punch', 'mach-punch', 'mega-punch', 'meteor-mash', 'plasma-fists', 'power-up-punch',
  'rage-fist', 'shadow-punch', 'sky-uppercut', 'surging-strikes', 'thunder-punch',
  'wicked-blow',
)

export const BITE_MOVES = set(
  'bite', 'bug-bite', 'crunch', 'fire-fang', 'fishious-rend', 'hyper-fang', 'ice-fang',
  'jaw-lock', 'poison-fang', 'psychic-fangs', 'thunder-fang',
)

export const SLICING_MOVES = set(
  'aerial-ace', 'air-cutter', 'air-slash', 'aqua-cutter', 'behemoth-blade', 'bitter-blade',
  'ceaseless-edge', 'cross-poison', 'cut', 'fury-cutter', 'kowtow-cleave', 'leaf-blade',
  'mighty-cleave', 'night-slash', 'psyblade', 'psycho-cut', 'razor-leaf', 'razor-shell',
  'sacred-sword', 'secret-sword', 'slash', 'solar-blade', 'stone-axe', 'tachyon-cutter',
  'x-scissor',
)

export const BULLET_MOVES = set(
  'acid-spray', 'aura-sphere', 'barrage', 'beak-blast', 'bullet-seed', 'egg-bomb',
  'electro-ball', 'energy-ball', 'focus-blast', 'gyro-ball', 'ice-ball', 'magnet-bomb',
  'mist-ball', 'mud-bomb', 'octazooka', 'pollen-puff', 'pyro-ball', 'rock-blast',
  'rock-wrecker', 'searing-shot', 'seed-bomb', 'shadow-ball', 'sludge-bomb', 'syrup-bomb',
  'weather-ball', 'zap-cannon',
)

export const WIND_MOVES = set(
  'air-cutter', 'bleakwind-storm', 'blizzard', 'fairy-wind', 'gust', 'heat-wave', 'hurricane',
  'icy-wind', 'petal-blizzard', 'sandsear-storm', 'sandstorm', 'springtide-storm', 'tailwind',
  'twister', 'whirlwind', 'wildbolt-storm',
)

export const POWDER_MOVES = set(
  'cotton-spore', 'magic-powder', 'poison-powder', 'powder', 'rage-powder', 'sleep-powder',
  'spore', 'stun-spore',
)

export const PULSE_MOVES = set(
  'aura-sphere', 'dark-pulse', 'dragon-pulse', 'heal-pulse', 'origin-pulse', 'terrain-pulse',
  'water-pulse',
)

/**
 * Moves that go through a Substitute. Every sound move does, plus this list.
 */
export const BYPASS_SUBSTITUTE_MOVES = set(
  'after-you', 'aromatic-mist', 'attract', 'coaching', 'conversion-2', 'copycat', 'curse',
  'decorate', 'doom-desire', 'encore', 'entrainment', 'fairy-lock', 'flower-shield',
  'future-sight', 'gear-up', 'guard-split', 'guard-swap', 'heal-pulse', 'heart-swap',
  'instruct', 'jungle-healing', 'life-dew', 'magnetic-flux', 'me-first', 'mimic',
  'pain-split', 'power-split', 'power-swap', 'psych-up', 'purify', 'quash', 'role-play',
  'skill-swap', 'spite', 'spotlight', 'sketch', 'speed-swap', 'taunt', 'torment',
  'transform', 'worry-seed',
)

/** Chip Away and its kin: damage is worked out ignoring the target's boosts. */
export const IGNORES_DEFENSE_BOOSTS_MOVES = set('chip-away', 'darkest-lariat', 'sacred-sword')

/**
 * Foe-aimed moves that go straight through Protect.
 *
 * Everything else is derived: a move aimed at a foe is protectable, a move
 * aimed at the user or at a side of the field is not.
 */
export const UNPROTECTABLE_MOVES = set(
  'acupressure', 'after-you', 'confide', 'conversion-2', 'curse', 'doom-desire', 'feint',
  'future-sight', 'hyperspace-fury', 'hyperspace-hole', 'me-first', 'perish-song',
  'phantom-force', 'play-nice', 'psych-up', 'role-play', 'shadow-force', 'sketch',
  'transform',
)
