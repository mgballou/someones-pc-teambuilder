import Link from 'next/link'
import { redirect } from 'next/navigation'
import { currentUser } from '../auth/session.js'

/**
 * The landing page states what the tool is and who it is for, then gets out of
 * the way. No hero copy about "catching them all". CLAUDE.md §Tone.
 */
export default async function LandingPage() {
  const user = await currentUser(new Date()).catch(() => null)
  if (user !== null) redirect('/teams')

  return (
    <div className="mx-auto max-w-2xl py-12">
      <h1 className="text-2xl font-semibold tracking-tight">
        A planning companion for competitive Pokémon.
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-text-dim">
        Build sets, arrange them into teams under a format, and see what you built — damage rolls,
        speed tiers, coverage gaps, and whether it is legal where you intend to play it. Built for
        VGC and Smogon singles.
      </p>

      <ul className="mt-8 grid gap-px overflow-hidden rounded-panel border border-line bg-line text-sm">
        <Row term="Formats" detail="VGC Regulations G, H and I. Smogon Gen 9 OU and Ubers." />
        <Row term="Damage" detail="Gen 9 formula, all sixteen rolls, spread and Tera handled." />
        <Row term="Speed" detail="Tiers against benchmarks, with Scarf, Tailwind and Booster." />
        <Row term="Coverage" detail="What your moves hit, and what four of your six die to." />
        <Row term="Import" detail="Showdown paste in and out. Nothing is locked in here." />
      </ul>

      <div className="mt-8 flex items-center gap-3">
        <Link
          href="/sign-up"
          className="rounded-box bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink"
        >
          Create an account
        </Link>
        <Link href="/sign-in" className="text-xs text-text-dim underline underline-offset-4">
          Sign in
        </Link>
      </div>

      <p className="mt-10 text-[0.6875rem] leading-relaxed text-text-faint">
        Legality rulesets are maintained by hand and every one shows its source and the date it was
        last checked. Species, move and item data comes from PokéAPI. This tool calculates; it does
        not simulate battles, and it has no usage statistics.
      </p>
    </div>
  )
}

function Row({ term, detail }: { readonly term: string; readonly detail: string }) {
  return (
    <li className="grid grid-cols-[7rem_1fr] gap-3 bg-panel px-3 py-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-text-faint">{term}</span>
      <span className="text-xs text-text-dim">{detail}</span>
    </li>
  )
}
