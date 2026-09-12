'use client'

/**
 * The app's select. One control, used by every panel that asks a person to
 * choose one of a fixed set of things.
 *
 * It is a real `<select>`: the label is the accessible name, the native
 * listbox is what a phone opens, and the well is the recess the rest of the
 * chrome already uses. ui-sensibility.md §5, §8.1.
 */
export function Select({
  label,
  value,
  onChange,
  options,
}: {
  readonly label: string
  readonly value: string
  readonly onChange: (value: string) => void
  readonly options: readonly { readonly value: string; readonly label: string }[]
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[0.625rem] font-medium uppercase tracking-wider text-text-faint">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="well px-2 py-1 text-xs capitalize outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
