# Architecture map

Someone's PC is a pnpm workspace with one web app and two packages. Dependencies go one way:
`apps/web` → `packages/dex` → `packages/core`.

## Follow a request

`apps/web/src/app/` contains the Next.js pages and API routes. Shared UI lives in
`apps/web/src/components/`; browser interactions call server actions in `apps/web/src/actions/`.
Team and set actions in `teams.ts` and `set.ts` authenticate and validate input; paste import is in
`import.ts`. They call `apps/web/src/data/` repository functions, which scope Drizzle queries to
the signed-in user and map database rows to core domain types. The schema and database client are
in `apps/web/src/db/`.

For a team analysis page, `apps/web/src/lib/team-view.ts` loads a team and its format. The page
passes that domain data and a dex to pure functions from `@spc/core` for damage, speed, coverage,
or legality, then renders the report. The core defines the `Dex` interface; it does not know how
the data was loaded.

## Find the domain and data

`packages/core/src/` holds domain types and rules: sets, teams, formats, damage calculations,
analysis, and Showdown paste parsing and serialization. Its public imports come from
`packages/core/src/index.ts`.

`packages/dex/src/` implements the core's `Dex` interface using the committed dataset. It also
contains the PokéAPI client and ingest pipeline, which validates and writes refreshed data. Its
public imports come from `packages/dex/src/index.ts`.

## Tests and common jobs

Core tests are in `packages/core/test/`, dex tests in `packages/dex/test/`, web unit tests in
`apps/web/test/`, and browser tests in `apps/web/e2e/`. Workspace documentation checks are in
`test/`.

- Start the app and its local services: `pnpm setup`, then `pnpm dev`.
- Run unit tests: `pnpm test`.
- Run typecheck and lint together: `pnpm check`.
- Run browser tests: `pnpm test:e2e`.
- Rebuild the committed dex dataset: `pnpm ingest`.
