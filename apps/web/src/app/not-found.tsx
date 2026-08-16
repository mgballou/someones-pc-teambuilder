import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-base font-semibold">Nothing here</h1>
      <p className="mt-2 text-xs text-text-dim">
        That page does not exist, or it belongs to someone else.
      </p>
      <Link
        href="/teams"
        className="mt-4 inline-block rounded-box border border-line px-2.5 py-1 text-xs hover:bg-well"
      >
        Back to your teams
      </Link>
    </div>
  )
}
