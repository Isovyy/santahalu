# Santahalu Secret Santa

Webapp replacing the Google Forms + Sheet + Apps Script workflow for the
YumeFess "Santahalu" Secret Santa event: a public registration form, an
admin area to run the matching algorithm, and CSV export of results.

- `/` — public registration form
- `/admin` — password-protected dashboard: participant count, run matching (with
  optional seed), history of past runs
- `/admin/results/[runId]` — matched pairs, unmatched list, CSV downloads

Drive folder creation/renaming and access enforcement (the old
`makeFolder.gs` / `enforcedAccess.gs` / `scriptAccess.gs` / `rename.gs`)
are **not** part of this app yet — the `results_all.csv` export uses the same
column layout those scripts expect (`receiver_folder_link`, `giver_email`,
etc.), so they can still be run against the export if needed. Manual pairing
and post-hoc reassignment (`manual_matches` / `reshuffle.gs`) are also not
built yet — every "Run Matching" click auto-matches the full current
participant list and keeps the previous run's results intact as history.

## Stack

Next.js (App Router) + TypeScript + Tailwind, Prisma ORM against PostgreSQL,
a single shared admin password for auth (signed cookie session).

## Local setup

1. Copy `.env` and set:
   - `DATABASE_URL` — a Postgres connection string (see below)
   - `ADMIN_PASSWORD` — the password you'll use to log into `/admin`
   - `SESSION_SECRET` — any long random string
2. `npm install`
3. `npx prisma migrate dev` — creates the schema
4. `npm run dev` — http://localhost:3000

### Getting a Postgres database

This was scaffolded against a **temporary** database (created via
`npx create-db`) that auto-deletes after 24 hours — it was only for building
and testing this app, don't rely on it for real registrations. For real use,
pick one of:

- **Neon** (neon.tech) — free tier, serverless Postgres, pairs well with Vercel.
- **Supabase** — free tier Postgres, also gives you a dashboard.
- **Prisma Postgres** — run `npx create-db create --ttl <duration>` for a
  temporary one, or sign up at console.prisma.io to claim a permanent one.

Whichever you pick, put its connection string in `DATABASE_URL` and rerun
`npx prisma migrate deploy` (or `migrate dev` locally) against it.

## Deploying (Vercel)

1. Push this repo to GitHub.
2. Import it in Vercel.
3. Set the environment variables (`DATABASE_URL`, `ADMIN_PASSWORD`,
   `SESSION_SECRET`) in the Vercel project settings — use a real/permanent
   Postgres database here, not the temporary dev one.
4. Add `npx prisma migrate deploy` as part of the build (e.g. as a Vercel
   "Build Command" override: `npx prisma migrate deploy && npm run build`,
   or run it manually once against the production `DATABASE_URL` before first
   deploy).
5. Deploy.

## Tests

`npm test` runs unit tests for the matching engine (`lib/matching.ts`),
covering the same-oshi block, fandom/language/yume-type wildcard rules, and
determinism under a fixed seed.
