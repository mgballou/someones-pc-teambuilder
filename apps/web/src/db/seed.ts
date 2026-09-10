import { eq } from 'drizzle-orm'
import type { PokemonSet, SetId, StatSpread } from '@spc/core'
import { EMPTY_EVS, PERFECT_IVS, abilityId, formatId, itemId, moveId, speciesId } from '@spc/core'
import { dex as loadDex } from '@spc/dex'
// Loads apps/web/.env.local, and has to stay above './client', which reads
// DATABASE_URL while it is being evaluated.
import '../env'
import { db } from './client'
import { pokemonSets, teams, users } from './schema'
import { hashPassword } from '../auth/password'
import { toRowValues } from '../data/mappers'

/**
 * The demo account.
 *
 * A reviewer must be able to clone this and see a working app rather than an
 * empty one, so the seed writes three real teams built the way people actually
 * build them. Every species is looked up in the dataset first and skipped with
 * a warning if it is absent, because a seed that throws on one renamed form is
 * a seed nobody can run.
 */

const DEMO_EMAIL = 'demo@someones.pc'
const DEMO_PASSWORD = 'competitive'

type SeedSet = {
  readonly species: string
  readonly ability: string
  readonly item: string
  readonly nature: PokemonSet['nature']
  readonly evs: Partial<StatSpread>
  readonly ivs?: Partial<StatSpread>
  readonly tera: PokemonSet['teraType']
  readonly moves: readonly string[]
  readonly notes?: string
}

type SeedTeam = {
  readonly name: string
  readonly format: string
  readonly notes: string
  readonly members: readonly SeedSet[]
}

const TEAMS: readonly SeedTeam[] = [
  {
    name: 'Reg H Rain',
    format: 'vgc-reg-h',
    notes: 'Pelipper sets the rain, Archaludon uses it. Amoonguss and Incineroar cover the speed.',
    members: [
      {
        species: 'pelipper',
        ability: 'drizzle',
        item: 'focus-sash',
        nature: 'modest',
        evs: { hp: 252, spa: 252, spd: 4 },
        tera: 'ghost',
        moves: ['hurricane', 'weather-ball', 'tailwind', 'protect'],
        notes: 'Sash so it survives a Fake Out plus a hit and still gets Tailwind up.',
      },
      {
        species: 'archaludon',
        ability: 'stamina',
        item: 'assault-vest',
        nature: 'modest',
        evs: { hp: 236, spa: 252, spd: 20 },
        tera: 'grass',
        moves: ['electro-shot', 'flash-cannon', 'dragon-pulse', 'body-press'],
      },
      {
        species: 'amoonguss',
        ability: 'regenerator',
        item: 'rocky-helmet',
        nature: 'calm',
        evs: { hp: 236, def: 116, spd: 156 },
        ivs: { atk: 0, spe: 0 },
        tera: 'water',
        moves: ['spore', 'rage-powder', 'pollen-puff', 'protect'],
      },
      {
        species: 'incineroar',
        ability: 'intimidate',
        item: 'safety-goggles',
        nature: 'careful',
        evs: { hp: 244, def: 4, spd: 252 },
        ivs: { spe: 0 },
        tera: 'grass',
        moves: ['fake-out', 'knock-off', 'parting-shot', 'will-o-wisp'],
      },
      {
        species: 'rillaboom',
        ability: 'grassy-surge',
        item: 'miracle-seed',
        nature: 'adamant',
        evs: { hp: 252, atk: 252, spd: 4 },
        tera: 'fire',
        moves: ['grassy-glide', 'wood-hammer', 'fake-out', 'protect'],
      },
      {
        species: 'dragonite',
        ability: 'inner-focus',
        item: 'choice-band',
        nature: 'adamant',
        evs: { hp: 4, atk: 252, spe: 252 },
        tera: 'normal',
        moves: ['extreme-speed', 'outrage', 'aerial-ace', 'ice-spinner'],
      },
    ],
  },
  {
    name: 'OU Balance',
    format: 'gen9-ou',
    notes: 'Standard fat balance. Ting-Lu holds the ground, Dragapult cleans.',
    members: [
      {
        species: 'great-tusk',
        ability: 'protosynthesis',
        item: 'booster-energy',
        nature: 'jolly',
        evs: { atk: 252, def: 4, spe: 252 },
        tera: 'steel',
        moves: ['headlong-rush', 'close-combat', 'ice-spinner', 'rapid-spin'],
      },
      {
        species: 'kingambit',
        ability: 'supreme-overlord',
        item: 'leftovers',
        nature: 'adamant',
        evs: { hp: 252, atk: 252, spd: 4 },
        tera: 'fairy',
        moves: ['kowtow-cleave', 'sucker-punch', 'iron-head', 'swords-dance'],
      },
      {
        species: 'gholdengo',
        ability: 'good-as-gold',
        item: 'air-balloon',
        nature: 'timid',
        evs: { hp: 4, spa: 252, spe: 252 },
        tera: 'flying',
        moves: ['make-it-rain', 'shadow-ball', 'nasty-plot', 'recover'],
      },
      {
        species: 'dragapult',
        ability: 'infiltrator',
        item: 'choice-specs',
        nature: 'timid',
        evs: { spa: 252, spd: 4, spe: 252 },
        tera: 'ghost',
        moves: ['shadow-ball', 'draco-meteor', 'u-turn', 'flamethrower'],
      },
      {
        species: 'ting-lu',
        ability: 'vessel-of-ruin',
        item: 'leftovers',
        nature: 'impish',
        evs: { hp: 252, def: 252, spd: 4 },
        tera: 'poison',
        moves: ['earthquake', 'stealth-rock', 'whirlwind', 'ruination'],
      },
      {
        species: 'slowking-galar',
        ability: 'regenerator',
        item: 'heavy-duty-boots',
        nature: 'calm',
        evs: { hp: 252, def: 16, spd: 240 },
        ivs: { atk: 0, spe: 0 },
        tera: 'water',
        moves: ['future-sight', 'sludge-bomb', 'chilly-reception', 'thunder-wave'],
      },
    ],
  },
  {
    name: 'Reg G Miraidon',
    format: 'vgc-reg-g',
    notes: 'One restricted. Electric terrain plus Tailwind, Farigiraf blocks priority.',
    members: [
      {
        species: 'miraidon',
        ability: 'hadron-engine',
        item: 'choice-specs',
        nature: 'timid',
        evs: { hp: 4, spa: 252, spe: 252 },
        tera: 'electric',
        moves: ['electro-drift', 'draco-meteor', 'volt-switch', 'dazzling-gleam'],
      },
      {
        species: 'farigiraf',
        ability: 'armor-tail',
        item: 'electric-seed',
        nature: 'relaxed',
        evs: { hp: 252, def: 156, spd: 100 },
        ivs: { spe: 0 },
        tera: 'water',
        moves: ['trick-room', 'psychic-noise', 'helping-hand', 'protect'],
      },
      {
        species: 'iron-hands',
        ability: 'quark-drive',
        item: 'assault-vest',
        nature: 'adamant',
        evs: { hp: 236, atk: 252, spd: 20 },
        tera: 'grass',
        moves: ['drain-punch', 'fake-out', 'wild-charge', 'heavy-slam'],
      },
      {
        species: 'incineroar',
        ability: 'intimidate',
        item: 'sitrus-berry',
        nature: 'careful',
        evs: { hp: 252, def: 100, spd: 156 },
        ivs: { spe: 0 },
        tera: 'ghost',
        moves: ['fake-out', 'knock-off', 'parting-shot', 'flare-blitz'],
      },
      {
        species: 'rillaboom',
        ability: 'grassy-surge',
        item: 'assault-vest',
        nature: 'adamant',
        evs: { hp: 252, atk: 252, spd: 4 },
        tera: 'fire',
        moves: ['grassy-glide', 'fake-out', 'u-turn', 'high-horsepower'],
      },
      {
        species: 'flutter-mane',
        ability: 'protosynthesis',
        item: 'booster-energy',
        nature: 'timid',
        evs: { hp: 4, spa: 252, spe: 252 },
        tera: 'fairy',
        moves: ['moonblast', 'shadow-ball', 'icy-wind', 'protect'],
      },
    ],
  },
]

function spread(partial: Partial<StatSpread>, base: StatSpread): StatSpread {
  return { ...base, ...partial }
}

async function main(): Promise<void> {
  const dex = loadDex()

  const existing = await db.query.users.findFirst({ where: eq(users.email, DEMO_EMAIL) })
  if (existing !== undefined) {
    await db.delete(users).where(eq(users.id, existing.id))
    console.log('Removed the previous demo account.')
  }

  const [user] = await db
    .insert(users)
    .values({
      email: DEMO_EMAIL,
      name: 'Demo',
      passwordHash: await hashPassword(DEMO_PASSWORD),
    })
    .returning({ id: users.id })
  if (user === undefined) throw new Error('Could not create the demo user.')

  let written = 0
  let skipped = 0

  for (const seed of TEAMS) {
    if (dex.format(formatId(seed.format)) === undefined) {
      console.warn(`Skipping "${seed.name}": no format "${seed.format}" in the dataset.`)
      continue
    }

    const [team] = await db
      .insert(teams)
      .values({ userId: user.id, name: seed.name, formatId: seed.format, notes: seed.notes })
      .returning({ id: teams.id })
    if (team === undefined) continue

    let position = 0
    for (const member of seed.members) {
      const species = dex.species(speciesId(member.species))
      if (species === undefined) {
        console.warn(`  Skipping "${member.species}" — not in the dataset.`)
        skipped += 1
        continue
      }

      const moves = member.moves.map((name) => {
        const id = moveId(name)
        if (dex.move(id) === undefined) {
          console.warn(`  Move "${name}" is not in the dataset; leaving the slot empty.`)
          return null
        }
        return id
      })

      const item = dex.item(itemId(member.item)) === undefined ? null : itemId(member.item)

      const set: PokemonSet = {
        id: crypto.randomUUID() as SetId,
        species: species.id,
        nickname: null,
        level: 50,
        gender: null,
        shiny: false,
        ability: abilityId(member.ability),
        item,
        nature: member.nature,
        evs: spread(member.evs, EMPTY_EVS),
        ivs: spread(member.ivs ?? {}, PERFECT_IVS),
        moves: [moves[0] ?? null, moves[1] ?? null, moves[2] ?? null, moves[3] ?? null],
        teraType: member.tera,
        gigantamax: false,
        notes: member.notes ?? '',
      }

      await db
        .insert(pokemonSets)
        .values(toRowValues({ userId: user.id, teamId: team.id, position, set }))
      position += 1
      written += 1
    }
  }

  console.log(`Seeded ${written} sets across ${TEAMS.length} teams. ${skipped} skipped.`)
  console.log(`Sign in with ${DEMO_EMAIL} / ${DEMO_PASSWORD}`)
  process.exit(0)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
