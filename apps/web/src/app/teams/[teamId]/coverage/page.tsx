import { coverageNoteText, POKEMON_TYPES } from '@spc/core'
import { loadTeam, analyzeCoverage } from '../../../../lib/team-view'
import { dex } from '../../../../lib/dex'
import { Panel, EmptyState, SourceNote } from '../../../../components/panel'
import { TypeBadge } from '../../../../components/type-badge'
import { EffectivenessCell } from '../../../../components/effectiveness-cell'

export default async function CoveragePage({
  params,
}: {
  readonly params: Promise<{ readonly teamId: string }>
}) {
  const { teamId } = await params
  const { team, format, views } = await loadTeam(teamId)
  const report = analyzeCoverage({ team, dex: dex(), format })

  if (team.members.length === 0) {
    return (
      <Panel title="Coverage">
        <EmptyState headline="Add a Pokémon and its coverage appears here." />
      </Panel>
    )
  }

  const nameFor = (setId: string) =>
    views.find((view) => view.id === setId)?.speciesName ?? setId

  /**
   * The gap list a builder acts on. Ordered by how many Pokémon in the format
   * carry the typing, so the first row is the one most likely to be across the
   * table rather than the one earliest in the chart.
   */
  const typingGaps = report.offensive.uncoveredTypings.slice(0, 12)

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_20rem]">
      <Panel title="Defensive" subtitle="What each member takes from each attacking type">
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0 text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-panel px-2 py-1 text-left font-medium text-text-faint">
                  Member
                </th>
                {POKEMON_TYPES.map((type) => (
                  <th key={type} className="px-0.5 py-1">
                    <span
                      className="block text-[0.5625rem] font-semibold uppercase"
                      style={{ color: `var(--type-${type})` }}
                      title={type}
                    >
                      {type.slice(0, 3)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.defensive.grid.map((row) => (
                <tr key={row.setId}>
                  <th className="sticky left-0 z-10 max-w-[9rem] truncate bg-panel px-2 py-1 text-left font-medium">
                    {nameFor(row.setId)}
                  </th>
                  {POKEMON_TYPES.map((type) => (
                    <EffectivenessCell key={type} multiplier={row.takes[type]} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <SourceNote>
          Read across a row for one Pokémon&apos;s weaknesses, down a column to see how many
          members share one. Every cell prints its multiplier, so the grid does not rely on
          color alone. A zero may come from the chart or from an ability — Levitate and Flash
          Fire move a cell here, and the abilities that only reduce a hit are listed below.
        </SourceNote>
      </Panel>

      <div className="flex flex-col gap-4">
        <Panel title="Shared weaknesses" subtitle="Two or more members, most shared first">
          {report.defensive.sharedWeaknesses.length === 0 ? (
            <p className="text-xs text-text-dim">
              No attacking type hits two or more members for 2× or better.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {report.defensive.sharedWeaknesses.map((weakness) => (
                <li key={weakness.type} className="flex items-center gap-2">
                  <TypeBadge type={weakness.type} size="sm" />
                  <span
                    className="num text-xs font-semibold"
                    style={{
                      color: weakness.count >= 3 ? 'var(--danger)' : 'var(--warn)',
                    }}
                  >
                    {weakness.count}
                  </span>
                  <span className="truncate text-[0.6875rem] text-text-faint">
                    {weakness.members.map(nameFor).join(', ')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Gaps"
          subtitle={`Typings in ${format.shortName} nothing on the team hits for 2×`}
        >
          {report.offensive.unarmed ? (
            <p className="text-xs text-text-dim">No member carries a damaging move yet.</p>
          ) : typingGaps.length === 0 ? (
            <p className="text-xs text-text-dim">
              Something on the team hits every typing in this format for at least 2×.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {typingGaps.map((gap) => (
                <li key={gap.types.join('/')} className="flex flex-wrap items-center gap-1">
                  {gap.types.map((type) => (
                    <TypeBadge key={type} type={type} size="sm" />
                  ))}
                  <span className="num ml-auto text-[0.6875rem] text-text-faint">
                    {gap.speciesCount}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <SourceNote>
            Measured against a whole Pokémon, not one type at a time — Ghost covered and Dark
            covered still leaves nothing that touches a Ghost/Dark. The number is how many
            Pokémon in this format carry the typing.
            {report.offensive.uncoveredTypings.length > typingGaps.length &&
              ` ${report.offensive.uncoveredTypings.length - typingGaps.length} more not shown.`}
          </SourceNote>
        </Panel>

        <Panel title="Unresisted" subtitle="No member resists these">
          {report.defensive.unresisted.length === 0 ? (
            <p className="text-xs text-text-dim">Every type is resisted by someone.</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {report.defensive.unresisted.map((type) => (
                <TypeBadge key={type} type={type} size="sm" />
              ))}
            </div>
          )}
        </Panel>

        {report.notes.length > 0 && (
          <Panel title="Not accounted for">
            <ul className="flex flex-col gap-1 text-[0.6875rem] text-text-dim">
              {report.notes.map((note, index) => (
                <li key={index}>
                  {'setId' in note && `${nameFor(note.setId)}: `}
                  {coverageNoteText(note)}
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
    </div>
  )
}
