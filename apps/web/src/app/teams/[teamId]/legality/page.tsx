import { validateTeam, LEGALITY_RULES } from '@spc/core'
import { loadTeam } from '../../../../lib/team-view.js'
import { dex } from '../../../../lib/dex.js'
import { Panel, SourceNote } from '../../../../components/panel.js'

/**
 * Not a badge saying "illegal" — the violated rule, named, with the source of
 * that rule beside it. ui-sensibility.md §2.3, §12.1.
 */
export default async function LegalityPage({
  params,
}: {
  readonly params: Promise<{ readonly teamId: string }>
}) {
  const { teamId } = await params
  const { team, format } = await loadTeam(teamId)
  const report = validateTeam({ team, format, dex: dex() })

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_20rem]">
      <Panel
        title={report.legal ? 'Legal' : 'Not legal'}
        subtitle={`${report.violations.length} problem${report.violations.length === 1 ? '' : 's'}`}
      >
        {report.violations.length === 0 ? (
          <p className="text-xs text-text-dim">
            This team satisfies every rule in {format.name} that this app checks.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {report.violations.map((violation, index) => {
              const rule = LEGALITY_RULES[violation.rule]
              return (
                <li key={index} className="well flex flex-col gap-0.5 p-2">
                  <div className="flex items-baseline gap-2">
                    <span
                      className="text-[0.625rem] font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--danger)' }}
                    >
                      {rule?.label ?? violation.rule}
                    </span>
                  </div>
                  <p className="text-xs">{violation.message}</p>
                  {rule !== undefined && (
                    <p className="text-[0.6875rem] text-text-faint">{rule.description}</p>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Panel>

      <Panel title="Ruleset">
        <dl className="grid grid-cols-[6rem_1fr] gap-x-3 gap-y-1 text-xs">
          <dt className="text-text-faint">Format</dt>
          <dd>{format.name}</dd>
          <dt className="text-text-faint">Authority</dt>
          <dd className="uppercase">{format.source.authority}</dd>
          <dt className="text-text-faint">Checked</dt>
          <dd className="num">{format.source.verifiedOn}</dd>
        </dl>

        <SourceNote>
          {format.source.citation} These rulesets are maintained by hand — PokéAPI has no
          concept of a tier or a regulation. Check the current official rules before entering
          a tournament.
        </SourceNote>
      </Panel>
    </div>
  )
}
