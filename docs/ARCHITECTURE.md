# Architecture map

Someone's PC is a pnpm workspace with one web app and two packages. Dependencies go one way:
`apps/web` → `packages/dex` → `packages/core`.

## Follow a request

`apps/web/src/app/` contains the Next.js pages and API routes. Shared UI lives in
`apps/web/src/components/`. Forms and buttons call server actions in `apps/web/src/actions/`; the
species, item and damage pickers fetch from the API routes in `apps/web/src/app/api/`. Team and set
actions in `teams.ts` and `set.ts` authenticate and validate input; paste import is in `import.ts`.
They call `apps/web/src/data/` repository functions (`set.ts` also reads its row directly), which
scope Drizzle queries to the signed-in user and map database rows to core domain types. The schema
and database client are in `apps/web/src/db/`.

For a team analysis page, `apps/web/src/lib/team-view.ts` loads a team and its format. The speed,
coverage and legality pages pass that domain data and a dex to pure functions from `@spc/core` and
render the report. The damage page hands a client panel part of the dex; the panel fetches the rest
from `/api/calc`, builds a `Dex` with `apps/web/src/lib/mini-dex.ts` and runs `calculate` in the
browser. The core defines the `Dex` interface; it does not know how the data was loaded.

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

For the commands, see [README §Commands](../README.md#commands).
