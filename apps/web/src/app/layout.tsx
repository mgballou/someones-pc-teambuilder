import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'
import { AppShell } from '../components/app-shell.js'
import { currentUser } from '../auth/session.js'

export const metadata: Metadata = {
  title: "Someone's PC",
  description:
    'A team-building planning companion for competitive Pokémon. Damage rolls, speed tiers, coverage and legality for VGC and Smogon singles.',
}

/**
 * The theme script runs before paint so a dark-theme reader never sees a
 * white flash. It is inline and tiny for exactly that reason.
 */
const THEME_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('spc-theme');
    if (stored === 'dark' || stored === 'light') {
      document.documentElement.setAttribute('data-theme', stored);
    }
  } catch (e) {}
})();
`

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await currentUser(new Date()).catch(() => null)

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <AppShell user={user}>{children}</AppShell>
      </body>
    </html>
  )
}
