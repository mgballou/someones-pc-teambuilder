# How to run the phone review

`docs/review-spec.json` lists ten screens, one question each, answerable in a single word.
This file is how you get those ten URLs onto a screen. Everything below was run on
2026-08-20 against the current working tree, and every command was run as written.

---

## What you need first

| Thing  | Version                              | Check with    |
| ------ | ------------------------------------ | ------------- |
| Node   | 22 or newer (22.23.2 here)           | `node -v`     |
| pnpm   | 11.18.0 (pinned in `packageManager`) | `pnpm -v`     |
| Docker | any daemon; OrbStack on this machine | `docker info` |

Postgres 17 runs in the `someones-pc-db` container on **port 5433**, not 5432. That is set in
`docker-compose.yml` and matched by the default `DATABASE_URL`.

---

## Serving it

The database is already created and seeded on this machine. Start the daemon, the container
and the web app:

```bash
open -a OrbStack                 # or start Docker Desktop
cd ~/projects/someones=pc
pnpm db:up                       # starts someones-pc-db on 5433
pnpm dev                         # http://localhost:3000
```

`pnpm dev` prints a **Network** URL as well as the local one — on this machine it was
`http://192.168.1.155:3000`. That address changes with the network. To browse from the phone
itself, put the phone on the same wi-fi and use the Network URL in place of `localhost` in
every path from the JSON. To capture the screens on the laptop instead, point a browser at
`http://localhost:3000` with the window set to 430 × 932.

### From nothing

If the container or the schema is gone:

```bash
pnpm install
pnpm db:up
pnpm db:push
pnpm db:seed
```

All four were run against an empty database and finished clean; the seed prints
`Seeded 18 sets across 3 teams. 0 skipped.` **Then read the two sections below** — a fresh
seed gives every path a new id, and it leaves the Legality screen with nothing to show.

---

## Login

One account, written by the seed:

```
demo@someones.pc
competitive
```

There is no other user, no password reset, no OAuth. `.env.example` hints at GitHub sign-in;
it was never built. The sign-up form at `/sign-up` works if you want a second, empty account,
but every path in the JSON expects the demo one.

The session cookie is `spc_session`, it lasts 30 days, and it is `httpOnly`. So you sign in
once and the rest of the walk is taps.

Environment: copy `.env.example` (repo root) to `.env.local`. Only `DATABASE_URL` is read
anywhere in the code — `AUTH_SECRET` and the two `AUTH_GITHUB_*` keys appear in
`.env.example` and in CI but nothing imports them, because sessions are opaque random tokens
held in Postgres. `.env.local` is gitignored; it already exists here at the repo root and at
`apps/web/.env.local`, which is the one Next loads. If `pnpm db:seed` stops with
`DATABASE_URL is not set`, pass it inline:

```bash
DATABASE_URL=postgresql://spc:spc@localhost:5433/someones_pc pnpm db:seed
```

---

## Sign out before you open the landing page

`/` is the one screen the demo account cannot see. `apps/web/src/app/page.tsx` sends any
signed-in visitor to `/teams`, so with the session cookie set you get the teams list, not the
landing copy the question asks about.

Open `/` **in a private window**, or sign out first. Every other path needs the demo session.
The JSON now names this per screen: `"auth": "signed-out"` on `landing`, `"auth": "demo"` on
the other nine.

---

## Do not trust the status code

Every path in the JSON returns **200** whether or not you are signed in. The guards run inside
streamed server components, so the status is already on the wire by the time `redirect()` or
`notFound()` fires. Next falls back to a meta refresh in the body:

| Path                       | Signed out                        |
| -------------------------- | --------------------------------- |
| `/teams`, `/box`           | 200, body refreshes to `/sign-in` |
| `/teams/<id>` and its tabs | 200, body is the 404 shell        |
| `/`, `/formats`            | 200, the real page                |

So a green sweep of status codes proves nothing here. To check a path is really reachable,
look for a `<meta http-equiv="refresh">` in the body and for a marker of the screen's own
content:

```bash
TOKEN=$(docker exec -i someones-pc-db psql -U spc -d someones_pc -tA \
  -c "select token from sessions order by expires_at desc limit 1;")

curl -s -H "Cookie: spc_session=$TOKEN" http://localhost:3000/teams \
  | grep -oi 'content="1;url=[^"]*"'      # prints nothing when the screen really rendered
```

---

## Seed data

Three teams, six sets each, all owned by the demo account:

| Team           | Format           | What it shows                                |
| -------------- | ---------------- | -------------------------------------------- |
| Reg H Rain     | `vgc-2026-reg-h` | VGC doubles. Rain, Tailwind, spread damage.  |
| OU Balance     | `gen9-ou`        | Smogon singles.                              |
| Reg G Miraidon | `vgc-2026-reg-g` | One restricted, so legality has more to say. |

Nine of the ten screens use **Reg H Rain**, so the walk stays on one team.

### Three things that will look wrong and are not

1. **The Box is empty.** The seed writes every set into a team, and box sets are the ones with
   no team. So `/box` shows its empty state — which is the point of that screen's question. To
   put something in it, open any slot on the bench and press **To Box**.

2. **Reg H Rain holds seven members, two of them Pelipper.** The seed writes six legal ones;
   the seventh is a hand-added copy of the first. Keep it. It breaks three rules at once — Team
   size, Species Clause and Item Clause, since both Pelipper hold a Focus Sash — so the
   Legality panel shows a populated list instead of a bare pass. A fresh seed leaves that
   screen with one line of prose and nothing to judge.

   After any re-seed, put the seventh member back:

   ```bash
   docker exec -i someones-pc-db psql -U spc -d someones_pc <<'SQL'
   insert into pokemon_sets
     (user_id, team_id, position, species, level, ability, item, nature, tera_type, notes, evs, ivs, moves)
   select s.user_id, s.team_id,
          (select max(position) + 1 from pokemon_sets where team_id = s.team_id),
          s.species, s.level, s.ability, s.item, s.nature, s.tera_type, s.notes, s.evs, s.ivs, s.moves
     from pokemon_sets s
     join teams t on t.id = s.team_id
    where t.name = 'Reg H Rain' and s.position = 0;
   SQL
   ```

   Run against a database seeded from scratch, this reproduced the state the review wants: the
   header reads **7 of 6**, **Problems 3**, and the Legality panel names all three rules.

3. **The Damage screen starts blank.** It says "Choose a defender and the rolls appear here",
   and it means it — nothing is calculated until you pick one, and the page takes no query
   parameters, so no URL can skip this. Two taps get you there: type `Garchomp` into
   **Defender > Species** and tap the first match. The attacker already defaults to Pelipper
   with Hurricane, which gives 96–114, a guaranteed 2HKO, and all sixteen rolls.

---

## The ids in the JSON, and when they break

Team and set ids are `uuid().defaultRandom()`, so **re-seeding gives every path in
`review-spec.json` a new id** and the whole walk lands on the 404 shell. The ids in there
point at the rows in this machine's database right now:

```
Reg H Rain   bdc4eece-3279-4968-b0ac-bd3ada1e2021
Pelipper set 866c3c78-4cf4-415d-b3fb-b5836d2d2f96
```

If you re-seed anyway, read the new ones back out and paste them in:

```bash
docker exec -i someones-pc-db psql -U spc -d someones_pc -c \
  "select t.name, '/teams/' || t.id as team_path,
          '/teams/' || t.id || '/sets/' || s.id as first_set_path
     from teams t
     join pokemon_sets s on s.team_id = t.id and s.position = 0
    order by t.name;"
```

Or skip the ids: sign in, tap **Reg H Rain** on `/teams`, then walk the tab bar —
Build, Damage, Speed, Coverage, Legality — which is the same order the JSON lists them in.

---

## Verified

Signed in as demo, at 430 × 932, every path served its own screen. Status, then whether the
body carried a bounce, then whether the screen's own content was there:

| Screen     | Path                       | Code | Reached                       |
| ---------- | -------------------------- | ---- | ----------------------------- |
| landing    | `/` _(signed out)_         | 200  | yes                           |
| landing    | `/` _(signed in)_          | 200  | **no — bounces to `/teams`**  |
| teams      | `/teams`                   | 200  | yes, three teams              |
| bench      | `/teams/<team>`            | 200  | yes, seven slots              |
| set-editor | `/teams/<team>/sets/<set>` | 200  | yes, Pelipper                 |
| damage     | `/teams/<team>/damage`     | 200  | yes, after picking a defender |
| speed      | `/teams/<team>/speed`      | 200  | yes, 34 ladder rows           |
| coverage   | `/teams/<team>/coverage`   | 200  | yes, all seven members        |
| legality   | `/teams/<team>/legality`   | 200  | yes, three violations         |
| box        | `/box`                     | 200  | yes, the empty state          |
| formats    | `/formats`                 | 200  | yes, five formats             |

The app boots in under a second on Turbopack.

Not verified: how any of it looks at 430 px. That is the review.
