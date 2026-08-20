# How to run the phone review

`docs/review-spec.json` lists ten screens, one question each, answerable in a single word.
This file is how you get those ten URLs onto a screen. Everything below was run on
2026-08-20 against the current working tree.

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

`pnpm setup` runs all four in order. **Read the warning about ids below before you do.**

Environment: copy `.env.example` to `.env.local`. Only `DATABASE_URL` is read anywhere in the
code — `AUTH_SECRET` and the two `AUTH_GITHUB_*` keys appear in `.env.example` and in CI but
nothing imports them, because sessions are opaque random tokens held in Postgres. `.env.local`
is gitignored; it already exists here at the repo root and at `apps/web/.env.local`, which is
the one Next loads. If `pnpm db:seed` stops with `DATABASE_URL is not set`, pass it inline:

```bash
DATABASE_URL=postgresql://spc:spc@localhost:5433/someones_pc pnpm db:seed
```

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

The session cookie lasts 30 days, so you sign in once and the rest of the walk is taps.

---

## Seed data

Three teams, six sets each, all owned by the demo account:

| Team           | Format           | What it shows                                |
| -------------- | ---------------- | -------------------------------------------- |
| Reg H Rain     | `vgc-2026-reg-h` | VGC doubles. Rain, Tailwind, spread damage.  |
| OU Balance     | `gen9-ou`        | Smogon singles.                              |
| Reg G Miraidon | `vgc-2026-reg-g` | One restricted, so legality has more to say. |

Nine of the ten screens use **Reg H Rain**, so the walk stays on one team.

### Two things that will look wrong and are not

1. **The Box is empty.** The seed writes every set into a team, and box sets are the ones with
   no team. So `/box` shows its empty state — which is the point of that screen's question. To
   put something in it, open any slot on the bench and press **To Box**.

2. **Reg H Rain holds seven members, two of them Pelipper.** That is local drift from hand
   testing, not seed output. It is worth keeping for this review: the team breaks Team Size and
   Species Clause, so the Legality panel shows a populated violation list instead of an empty
   pass. Re-seeding would clear it and leave that screen blank.

---

## The ids in the JSON, and when they break

Team and set ids are `uuid().defaultRandom()`, so **re-seeding gives every path in
`review-spec.json` a new id** and the whole walk 404s. The ids in there point at the rows in
this machine's database right now:

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

Every path in `review-spec.json` was requested against a running dev server with a demo
session and returned **200**. The app boots in under a second on Turbopack.

Not verified: how any of it looks at 430 px. That is the review.
