'use client'

import { usePathname, useRouter } from 'next/navigation'
import { startTransition, useOptimistic } from 'react'
import { TERRAINS, WEATHERS, terrainLabel, weatherLabel } from '@spc/core'
import type { SpeedField, Terrain, Weather } from '@spc/core'
import { Select } from './select'

/**
 * Weather and terrain for the speed ladder.
 *
 * The field lives in the URL rather than in component state: the ladder is
 * computed on the server against the whole dex, and a ladder read under rain
 * is worth linking to. Changing a select navigates, and `useOptimistic` holds
 * the chosen value while the server re-renders, so the control never snaps
 * back to the old field and nothing on the panel is replaced by a spinner.
 * ui-sensibility.md §9.2.
 */
export function SpeedFieldControls({ field }: { readonly field: SpeedField }) {
  const router = useRouter()
  const pathname = usePathname()
  const [shown, showField] = useOptimistic(field)

  function go(next: SpeedField) {
    startTransition(() => {
      showField(next)
      router.replace(hrefFor(pathname, next), { scroll: false })
    })
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <Select
        label="Weather"
        value={shown.weather}
        onChange={(value) => go({ ...shown, weather: value as Weather })}
        options={WEATHERS.map((option) => ({ value: option, label: weatherLabel(option) }))}
      />
      <Select
        label="Terrain"
        value={shown.terrain}
        onChange={(value) => go({ ...shown, terrain: value as Terrain })}
        options={TERRAINS.map((option) => ({ value: option, label: terrainLabel(option) }))}
      />
    </div>
  )
}

/** A clear field is the bare path, so the ordinary case carries no query string. */
function hrefFor(pathname: string, field: SpeedField): string {
  const params = new URLSearchParams()
  if (field.weather !== 'none') params.set('weather', field.weather)
  if (field.terrain !== 'none') params.set('terrain', field.terrain)
  const query = params.toString()
  return query === '' ? pathname : `${pathname}?${query}`
}
