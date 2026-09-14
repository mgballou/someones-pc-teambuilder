import { defineConfig } from 'drizzle-kit'
// Loads apps/web/.env.local. Must come before anything that reads process.env.
import './src/env'
import { connectionString } from './src/db/config'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: connectionString(),
  },
})
