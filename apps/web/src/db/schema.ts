import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import type { Gender, MoveSlots, Nature, StatSpread, TeraType } from '@spc/core'

/**
 * Schema notes.
 *
 * Scalar fields that anyone would ever filter or sort by get real columns.
 * The three fields that are structurally arrays — EVs, IVs and the four move
 * slots — are JSONB, because normalizing a fixed-length-4 slot array into a
 * join table buys nothing and costs every read.
 *
 * A set with a null `teamId` lives in the Box. A set with a `teamId` belongs
 * to that team and to nothing else — sets are copied between the two, never
 * shared, so there is no many-to-many here and there must never be one. See
 * spec §2.
 */

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified', { withTimezone: true }),
  image: text('image'),
  /** Null for OAuth-only accounts. */
  passwordHash: text('password_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const accounts = pgTable(
  'accounts',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refreshToken: text('refresh_token'),
    accessToken: text('access_token'),
    expiresAt: integer('expires_at'),
    tokenType: text('token_type'),
    scope: text('scope'),
    idToken: text('id_token'),
    sessionState: text('session_state'),
  },
  (table) => [primaryKey({ columns: [table.provider, table.providerAccountId] })],
)

/**
 * Opaque, server-side sessions rather than a stateless JWT.
 *
 * The token in the cookie is a random string and carries no claims, so signing
 * out actually ends the session instead of waiting for an expiry to lapse.
 * That is worth one indexed lookup per request.
 */
export const sessions = pgTable('sessions', {
  token: text('token').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const teams = pgTable(
  'teams',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    /** A `FormatId` slug. Formats are code, not rows — see spec §4. */
    formatId: text('format_id').notNull(),
    notes: text('notes').notNull().default(''),
    tags: jsonb('tags').$type<readonly string[]>().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('teams_user_name_idx').on(table.userId, table.name)],
)

export const pokemonSets = pgTable('pokemon_sets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  /** Null means this set lives in the Box rather than on a team. */
  teamId: uuid('team_id').references(() => teams.id, { onDelete: 'cascade' }),
  /** Slot order within a team. Null for Box entries. */
  position: integer('position'),

  species: text('species').notNull(),
  nickname: text('nickname'),
  level: integer('level').notNull().default(50),
  gender: text('gender').$type<Gender | null>(),
  shiny: boolean('shiny').notNull().default(false),
  ability: text('ability'),
  item: text('item'),
  nature: text('nature').$type<Nature>().notNull().default('hardy'),
  teraType: text('tera_type').$type<TeraType | null>(),
  gigantamax: boolean('gigantamax').notNull().default(false),
  notes: text('notes').notNull().default(''),

  evs: jsonb('evs').$type<StatSpread>().notNull(),
  ivs: jsonb('ivs').$type<StatSpread>().notNull(),
  moves: jsonb('moves').$type<MoveSlots>().notNull(),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const usersRelations = relations(users, ({ many }) => ({
  teams: many(teams),
  sets: many(pokemonSets),
}))

export const teamsRelations = relations(teams, ({ one, many }) => ({
  user: one(users, { fields: [teams.userId], references: [users.id] }),
  members: many(pokemonSets),
}))

export const pokemonSetsRelations = relations(pokemonSets, ({ one }) => ({
  user: one(users, { fields: [pokemonSets.userId], references: [users.id] }),
  team: one(teams, { fields: [pokemonSets.teamId], references: [teams.id] }),
}))

export type TeamRow = typeof teams.$inferSelect
export type PokemonSetRow = typeof pokemonSets.$inferSelect
export type UserRow = typeof users.$inferSelect
