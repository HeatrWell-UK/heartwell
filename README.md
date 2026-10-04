# Heartwell

The storefront and admin for [heartwellfurniture.co.uk](https://heartwellfurniture.co.uk): sofas made to order, free UK Mainland delivery, paid for on delivery.

Start with [`CLAUDE.md`](CLAUDE.md) (rules), [`docs/PLAN.md`](docs/PLAN.md) (phases), [`docs/DESIGN.md`](docs/DESIGN.md) (design system) and [`docs/PROGRESS.md`](docs/PROGRESS.md) (what's done).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS v4 · Supabase · Cloudinary · Nodemailer over Hostinger SMTP. Node 24 (see `.nvmrc`).

## Run it locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

`npm install` also points git at `.githooks/`, so the leak check runs before every commit.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Local dev server on http://localhost:3000 |
| `npm run verify` | Everything CI runs: leak check, lint, types, tests, production build |
| `npm run check:leaks` | Fails if anything from the sister shop, or any credential, is in the repo (`--staged` for the commit, `--all` for everything). Also runs before every build. |
| `npm run leaks:fingerprints` | Rebuilds `scripts/sister-fingerprints.json` from the local, git-ignored `reference/` folder |
| `npm run brand:assets` | Regenerates icons, favicon, OG image and logo files from `design/logo/` |

## Environments

| | Branch | Host | `NEXT_PUBLIC_APP_ENV` |
| --- | --- | --- | --- |
| Preview | `staging` and feature branches | Vercel preview deployments | `staging` |
| Production | `main` | Vercel during the build (with `staging` settings); Hostinger Node.js before ads and real orders | `production` (from the move to Hostinger) |

Every deployment is `noindex` until go-live sets `SITE_INDEXABLE=true` on the real domain. Tracking runs only when `NEXT_PUBLIC_APP_ENV=production` on the production host. The code reads no host-specific variables, so moving hosts means copying environment variables, not changing code.

## Database

Supabase (London). Two projects: `heartwell-staging` (used by every Vercel environment while we build) and `heartwell-prod` (connected at the move to Hostinger).

- **Schema changes are migration files** in `supabase/migrations/`, applied to both projects with the same version numbers. Never edit the schema in the dashboard.
- **Business rules live in Postgres:** pricing, offers, the order lifecycle, confirmation and tracking (`place_order`, `confirm_order`, `price_order`, ...). The browser never sends a price.
- **Tests that run in the database:** `supabase/tests/order_flow.sql` (run in the SQL editor; it rolls itself back and ends with `ALL_TESTS_PASSED`).
- **TypeScript and SQL agree:** `tests/delivery-parity.test.ts` checks the TypeScript delivery rules against answers captured from the database (`supabase/tests/delivery_parity.sql` regenerates them).
- **Types:** `src/types/database.ts` is generated from the staging project. Regenerate after every migration.
- **Admins:** add an email to `public.admins`; the person signs in at `/login` (an ordinary-looking sign-in page, not linked from the site) and their account is linked on first sign-in. `/admin` sends anyone else to `/login`.

## Catalogue

The catalogue was imported from the local, git-ignored `reference/catalogue/` files. Only cleaned Heartwell data reaches the database: no descriptions, reviews or anything else from the source shop. The admin's **Catalogue** page shows what is stored and what's missing.

- **Cleaning rules** are code with tests: `src/lib/catalogue/clean.ts` (dimensions text to numbers, shapes and seats, titles, web addresses, colours, specifications) and `src/lib/catalogue/import-config.ts` (product types, category tree, mappings, size order).
- **The import is one database function,** `public.import_catalogue(payload, p_update default true)`, matched on slugs, SKUs and (collection, code). Re-running it adds new rows and updates changed ones in place; IDs and web addresses never change. It never touches what the owner controls: shown/hidden and featured flags, descriptions and SEO text, and any photo already replaced (only photos still in `heartwell/source/` are refreshed). With `p_update = false` existing rows are left alone.
- **Don't re-run it after Phase 17C** without `p_update = false`, or the old titles come back.

To re-run (everything stays in `reference/`, nothing is committed):

1. `node scripts/catalogue/build-import.mjs` builds `reference/.import/catalogue.json` and prints a dimensions table to check by eye, warnings and checksums.
2. Images, only if new ones were added: sign one upload set per folder with Cloudinary's `sign-upload` into `reference/.import/upload-credentials.json`, then run `node scripts/catalogue/copy-images.mjs` (server to server, skips what's already copied), then run step 1 again.
3. Sign one upload for the payload into `reference/.import/payload-credentials.json`, then `node scripts/catalogue/upload-payload.mjs`. It prints two SQL statements: the database fetches the file with `pg_net`, then imports it after checking its md5.
4. Run `supabase/tests/catalogue_checksums.sql` and compare it with the checksums from step 1. A second import should report zero changes.

## Deploying

Vercel is connected to this repository and deploys every push:

- `staging` → https://heartwell-staging.vercel.app (the preview link)
- `main` → https://heartwellfurniture.vercel.app (the approved build)
- any other branch → its own preview address

`npm run build` runs the leak and credential check first (`prebuild`), so a leak fails the build and never deploys. GitHub Actions (`.github/workflows/ci.yml`) also runs lint, types, tests and the build on every push and pull request.

The repository is public until launch: never commit secrets or customer data. Keys go in the Vercel (later Hostinger) environment variables.

## The leak check

The repo must never contain the sister shop's name, contact details, account IDs or product descriptions. `scripts/sister-fingerprints.json` holds only hashes of those values, built from `reference/leak-terms.txt` and the catalogue on the owner's machine; the scanner hashes what it reads and compares. It runs in the pre-commit hook and in CI.
