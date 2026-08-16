import { NextResponse } from 'next/server'
import { dex, displayNameOf } from '../../../lib/dex.js'

/**
 * Species search runs on the server.
 *
 * The dataset holds well over a thousand forms; shipping all of them to the
 * client so a picker can filter locally would cost every visitor a large
 * download for a list they will use twice.
 */

const LIMIT = 40

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q')?.trim().toLowerCase() ?? ''

  const matches = dex()
    .allSpecies()
    .filter((species) =>
      query === '' ? true : displayNameOf(species).toLowerCase().includes(query),
    )
    .slice(0, LIMIT)
    .map((species) => ({
      id: species.id,
      name: displayNameOf(species),
      dexNumber: species.dexNumber,
      types: species.types,
      spriteKey: species.spriteKey,
    }))

  return NextResponse.json({ matches })
}
