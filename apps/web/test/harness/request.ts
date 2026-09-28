/**
 * The parts of a Next request that a server action reaches for, and nothing
 * else.
 *
 * Actions run here as plain async functions against the real database. What
 * Next would supply around them — the cookie jar, `redirect`, `notFound`,
 * `revalidatePath` — is replaced by the smallest stand-in that records what
 * happened, so a test can say "this action redirected to the new team" or
 * "this route answered 404" without a server.
 *
 * Each test file wires these in with `vi.mock`:
 *
 *     vi.mock('server-only', () => ({}))
 *     vi.mock('next/headers', () => import('./harness/request').then((m) => m.nextHeaders))
 *     vi.mock('next/navigation', () => import('./harness/request').then((m) => m.nextNavigation))
 *     vi.mock('next/cache', () => import('./harness/request').then((m) => m.nextCache))
 */

type CookieOptions = { readonly expires?: Date }

const jar = new Map<string, { readonly value: string; readonly options: CookieOptions }>()

export const cookieJar = {
  get(name: string): { readonly name: string; readonly value: string } | undefined {
    const entry = jar.get(name)
    return entry === undefined ? undefined : { name, value: entry.value }
  },
  set(name: string, value: string, options: CookieOptions = {}): void {
    jar.set(name, { value, options })
  },
  delete(name: string): void {
    jar.delete(name)
  },
  clear(): void {
    jar.clear()
  },
  has(name: string): boolean {
    return jar.has(name)
  },
}

export const nextHeaders = {
  cookies: async () => cookieJar,
}

/** What `redirect()` and `notFound()` throw here, in place of Next's digests. */
export class Interrupted extends Error {
  override readonly name = 'Interrupted'

  private constructor(
    readonly kind: 'redirect' | 'not-found',
    readonly path: string | null,
  ) {
    super(kind === 'redirect' ? `redirect to ${path}` : 'not found')
  }

  static redirect(path: string): Interrupted {
    return new Interrupted('redirect', path)
  }

  static notFound(): Interrupted {
    return new Interrupted('not-found', null)
  }
}

export const nextNavigation = {
  redirect: (path: string): never => {
    throw Interrupted.redirect(path)
  },
  notFound: (): never => {
    throw Interrupted.notFound()
  },
}

const revalidated: string[] = []

export const nextCache = {
  revalidatePath: (path: string): void => {
    revalidated.push(path)
  },
}

export function revalidatedPaths(): readonly string[] {
  return [...revalidated]
}

export function resetRequest(): void {
  jar.clear()
  revalidated.length = 0
}

/** Runs something expected to redirect, and returns where it went. */
export async function redirectOf(run: () => Promise<unknown>): Promise<string | null> {
  try {
    await run()
  } catch (error) {
    if (error instanceof Interrupted && error.kind === 'redirect') return error.path
    throw error
  }
  return null
}
