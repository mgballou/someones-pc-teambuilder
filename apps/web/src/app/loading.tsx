/**
 * Placeholders sit in place, sized to the content that will replace them, so
 * nothing moves when it arrives. ui-sensibility.md §8.
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
      <div className="panel h-20 animate-pulse" />
      <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="well h-[13.5rem] animate-pulse" />
        ))}
      </div>
      <span className="sr-only">Loading</span>
    </div>
  )
}
