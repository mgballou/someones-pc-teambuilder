import { NextResponse } from 'next/server'
import { dex } from '../../../lib/dex.js'

const LIMIT = 40

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q')?.trim().toLowerCase() ?? ''

  const matches = dex()
    .allItems()
    .filter((item) => (query === '' ? true : item.name.toLowerCase().includes(query)))
    .slice(0, LIMIT)
    .map((item) => ({ id: item.id, name: item.name, modelled: item.effect.kind !== 'unmodelled' }))

  return NextResponse.json({ matches })
}
