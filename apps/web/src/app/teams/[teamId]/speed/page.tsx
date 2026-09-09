import { analyzeSpeed, speedModifierLabel, speedNoteText } from '@spc/core'
import type { LadderEntry } from '@spc/core'
import { loadTeam } from '../../../../lib/team-view'
import { dex } from '../../../../lib/dex'
import { Panel, EmptyState, SourceNote } from '../../../../components/panel'

export default async function SpeedPage({
  params,
}: {
  readonly params: Promise<{ readonly teamId: string }>
}) {
  const { teamId } = await params
  const { team, format } = await loadTeam(teamId)

  if (team.members.length === 0) {
    return (
      <Panel title="Speed">
        <EmptyState headline="Add a Pokémon and the speed ladder appears here." />
      </Panel>
    )
  }

  const report = analyzeSpeed({ team, format, dex: dex() })
  const fastest = report.ladder[0]
  const ceiling = fastest === undefined ? 1 : Math.max(fastest.speed, 1)
  const tiedSpeeds = new Set(report.ties.map((tie) => tie.speed))
  const memberName = (setId: string) =>
    report.members.find((member) => member.setId === setId)?.name ?? setId

  /**
   * The ladder is drawn twice from one list of entries, because Trick Room
   * changes no Speed — it changes which end of the list moves first.
   */
  function Ladder({ entries }: { readonly entries: readonly LadderEntry[] }) {
    return (
      <ol className="flex flex-col">
        {entries.map((entry, index) => {
          const mine = entry.kind === 'member'
          const tied = tiedSpeeds.has(entry.speed)
          return (
            <li
              key={`${entry.kind}-${entry.kind === 'member' ? entry.setId : entry.species}-${index}`}
              className="grid grid-cols-[1fr_auto] items-center gap-2 border-b border-line py-1 last:border-b-0"
            >
              <div className="min-w-0">
                <span
                  className={
                    mine ? 'truncate text-xs font-semibold' : 'truncate text-xs text-text-dim'
                  }
                >
                  {entry.label}
                </span>
                <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-well">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.round((entry.speed / ceiling) * 100)}%`,
                      backgroundColor: mine ? 'var(--accent)' : 'var(--line-strong)',
                    }}
                  />
                </div>
              </div>
              <span className="num flex items-baseline gap-1 text-xs font-semibold tabular-nums">
                {tied && (
                  <span
                    className="text-text-faint"
                    title="Tied. A Speed tie is decided at random each turn, so the order shown here is not a prediction."
                  >
                    =
                  </span>
                )}
                {entry.speed}
              </span>
            </li>
          )
        })}
      </ol>
    )
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[22rem_1fr]">
      <div className="flex flex-col gap-4">
        <Panel title="Ladder" subtitle={`Level ${report.level}, fastest first`}>
          <Ladder entries={report.ladder} />

          <SourceNote>{report.basis.note}</SourceNote>
        </Panel>

        <Panel title="Under Trick Room" subtitle="The same numbers, slowest first">
          <Ladder entries={report.trickRoomLadder} />

          <SourceNote>
            Trick Room changes no Speed. For five turns it reverses which end of this list moves
            first, and a tie is still a tie.
          </SourceNote>
        </Panel>
      </div>

      <div className="flex flex-col gap-4">
        <Panel title="Members" subtitle="Speed under each modifier">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-line text-text-faint">
                  <th className="py-1 pr-2 text-left font-medium">Pokémon</th>
                  <th className="px-2 py-1 text-right font-medium">Base</th>
                  <th className="px-2 py-1 text-right font-medium">As built</th>
                  {report.members[0]?.modifiers.map((modifier) => (
                    <th
                      key={speedModifierLabel(modifier.modifier)}
                      className="px-2 py-1 text-right font-medium"
                    >
                      {speedModifierLabel(modifier.modifier)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.members.map((member) => (
                  <tr key={member.setId} className="border-b border-line last:border-b-0">
                    <td className="max-w-[10rem] truncate py-1 pr-2 font-medium">
                      {member.name}
                      {member.tiedWith.length > 0 && (
                        <span
                          className="ml-1 text-text-faint"
                          title={`Tied with ${member.tiedWith.map((entry) => entry.label).join(', ')}`}
                        >
                          =
                        </span>
                      )}
                    </td>
                    <td className="num px-2 py-1 text-right">{member.speed}</td>
                    <td className="num px-2 py-1 text-right font-semibold">{member.effective}</td>
                    {member.modifiers.map((modifier) => (
                      <td
                        key={speedModifierLabel(modifier.modifier)}
                        className="num px-2 py-1 text-right"
                        style={{
                          color: modifier.available ? 'var(--text)' : 'var(--text-faint)',
                        }}
                        title={
                          modifier.available
                            ? undefined
                            : 'Not reachable as this set is built. Shown because "what if" is what this panel is for.'
                        }
                      >
                        {modifier.speed}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <SourceNote>
            A dimmed number is one this set cannot currently reach — a Scarf line on a Pokémon
            holding something else, or a Booster line without both the ability and something to
            switch it on. Read against a clear field: no weather, no terrain.
          </SourceNote>
        </Panel>

        <Panel title="Not accounted for">
          <ul className="flex flex-col gap-1 text-[0.6875rem] text-text-dim">
            {report.notes.map((note, index) => (
              <li key={index}>
                {'setId' in note && `${memberName(note.setId)}: `}
                {speedNoteText(note)}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  )
}
