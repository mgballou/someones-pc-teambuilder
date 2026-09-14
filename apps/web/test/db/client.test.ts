import { afterEach, expect, it, vi } from 'vitest'

const original = process.env.DATABASE_URL

afterEach(() => {
  if (original === undefined) delete process.env.DATABASE_URL
  else process.env.DATABASE_URL = original
  vi.resetModules()
})

it('throws the configuration error, not a ReferenceError about the class', async () => {
  process.env.DATABASE_URL = ''
  vi.resetModules()
  await expect(import('../../src/db/client')).rejects.toThrow(/DATABASE_URL is set but empty/)
})

it('evaluates against the default with no DATABASE_URL set', async () => {
  delete process.env.DATABASE_URL
  vi.resetModules()
  const { db } = await import('../../src/db/client')
  expect(db).toBeDefined()
})
