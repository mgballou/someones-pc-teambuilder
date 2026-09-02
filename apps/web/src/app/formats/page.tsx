import { CLAUSE_DESCRIPTION, CLAUSE_LABEL } from '@spc/core'
import { dex } from '../../lib/dex'
import { Panel, SourceNote } from '../../components/panel'
import { formatCount } from '../../lib/format'

/**
 * Formats are code, not rows, and every one shows where its rules came from.
 * This page exists so that source is inspectable rather than buried behind a
 * verdict. CLAUDE.md §Honesty rules.
 *
 * The verification date leads the key/value table rather than trailing the
 * source note. It answers the question the page is asked — were these rules
 * checked by hand, and when — and at the bottom nobody read it.
 */
export default function FormatsPage() {
  const formats = dex().allFormats()

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-base font-semibold tracking-tight">Formats</h1>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-text-dim">
          Legality rulesets are maintained by hand. PokéAPI has no concept of a tier or a
          regulation, so every ruleset below names its authority and the date it was last checked
          against that authority.
        </p>
      </div>

      <ul className="grid gap-3 lg:grid-cols-2">
        {formats.map((format) => (
          <li key={format.id}>
            <Panel title={format.name} subtitle={format.shortName}>
              <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1 text-xs">
                <dt className="text-text-faint">Last verified</dt>
                <dd className="num">{format.source.verifiedOn}</dd>

                <dt className="text-text-faint">Style</dt>
                <dd className="capitalize">{format.style}</dd>

                <dt className="text-text-faint">Team</dt>
                <dd className="num">
                  {format.teamSize} built, {format.bringSize} brought
                </dd>

                <dt className="text-text-faint">Level</dt>
                <dd className="num">
                  {format.level.kind === 'fixed'
                    ? `Set to ${format.level.level}`
                    : `Up to ${format.level.max}`}
                </dd>

                <dt className="text-text-faint">Gimmick</dt>
                <dd className="capitalize">{format.gimmick}</dd>

                {format.legality.maxRestricted > 0 && (
                  <>
                    <dt className="text-text-faint">Restricted</dt>
                    <dd className="num">
                      {formatCount(format.legality.maxRestricted, format.teamSize)} allowed
                    </dd>
                  </>
                )}
              </dl>

              {format.clauses.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1">
                  {format.clauses.map((clause) => (
                    <li key={clause} className="text-xs">
                      <span className="font-medium">{CLAUSE_LABEL[clause]}</span>{' '}
                      <span className="text-text-faint">{CLAUSE_DESCRIPTION[clause]}</span>
                    </li>
                  ))}
                </ul>
              )}

              <SourceNote>
                Source: {format.source.authority.toUpperCase()} · {format.source.citation}
              </SourceNote>
            </Panel>
          </li>
        ))}
      </ul>
    </div>
  )
}
