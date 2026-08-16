import bcrypt from 'bcryptjs'

/**
 * Password hashing, deliberately separate from sessions.
 *
 * The seed script needs to hash a password and has no request, no cookie jar
 * and no `server-only` boundary to respect. Keeping this out of `session.ts`
 * means it can import one small module instead of dragging Next's request
 * APIs into a plain Node script.
 */

const BCRYPT_ROUNDS = 12

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}
