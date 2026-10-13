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
| The site | `main` (the only branch pushed) | Vercel while we build; one Hostinger Node.js app before ads and real orders | `staging` (pre-launch) until go-live, then `production` |

Every deployment is `noindex` until go-live sets `SITE_INDEXABLE=true` on the real domain. Tracking runs only when `NEXT_PUBLIC_APP_ENV=production` on the production host. The code reads no host-specific variables, so moving hosts means copying environment variables, not changing code.

## Database

Supabase (London). One project: **heartwell-prod** (`oeakyeibdczedgvncomk`). The former heartwell-staging project was deleted on 13 October 2026.

- **Schema changes are migration files** in `supabase/migrations/`, applied to the one project and named after the version it records. Never edit the schema in the dashboard.
- **Business rules live in Postgres:** pricing, offers, the order lifecycle, confirmation and tracking (`place_order`, `confirm_order`, `price_order`, ...). The browser never sends a price.
- **Tests that run in the database:** `supabase/tests/order_flow.sql` (run in the SQL editor; it rolls itself back and ends with `ALL_TESTS_PASSED`).
- **TypeScript and SQL agree:** `tests/delivery-parity.test.ts` checks the TypeScript delivery rules against answers captured from the database (`supabase/tests/delivery_parity.sql` regenerates them).
- **Types:** `src/types/database.ts` is generated from the project. Regenerate after every migration.
- **Admins:** add an email to `public.admins`; the person signs in at `/login` (an ordinary-looking sign-in page, not linked from the site) and their account is linked on first sign-in. `/admin` sends anyone else to `/login`.

## Catalogue

**Now (13 October 2026): a demo catalogue.** Until the owner's own products, details and photos arrive (Phase 17A), the shop runs on invented "Sample" products with a "Photo coming soon" placeholder, so every part of the site can be used and tested. Every SKU starts `DEMO-`. Nothing in it comes from the sister shop; only Heartwell's own product types and category tree (`src/lib/catalogue/import-config.ts`) are reused.

- `node scripts/catalogue/build-demo.mjs` writes `supabase/seed/demo-catalogue.json`.
- **The import is one database function,** `public.import_catalogue(payload, p_update default true)`, matched on slugs, SKUs and (collection, code). Re-running it adds new rows and updates changed ones in place; IDs and web addresses never change. It never touches what the owner controls: shown/hidden and featured flags, descriptions and SEO text. The demo was loaded by passing the file's contents to it; the owner's catalogue goes in the same way in Phase 17A.
- Category introductions and search text live in the migration `category_copy` (fills empty fields only, so it can be re-run).

The first catalogue (Phase 5) was imported from the sister shop's files in the local, git-ignored `reference/` folder (`scripts/catalogue/build-import.mjs`, `copy-images.mjs`, `upload-payload.mjs`). That path is retired: don't use it again.

## Deploying

One site, built from `main` (no staging, no preview deployments): https://heartwellfurniture.vercel.app, on Hostinger from Phase 18B and at heartwellfurniture.co.uk from go-live. Until go-live it runs in pre-launch mode (`NEXT_PUBLIC_APP_ENV=staging`: noindex, every order a test, customer emails to the owner, no tracking). Only `main` is pushed.

`npm run build` runs the leak and credential check first (`prebuild`), so a leak fails the build and never deploys. GitHub Actions (`.github/workflows/ci.yml`) also runs lint, types, tests and the build on every push and pull request.

The repository is public until launch: never commit secrets or customer data. Keys go in the Vercel (later Hostinger) environment variables.

## The leak check

The repo must never contain the sister shop's name, contact details, account IDs or product descriptions. `scripts/sister-fingerprints.json` holds only hashes of those values, built from `reference/leak-terms.txt` and the catalogue on the owner's machine; the scanner hashes what it reads and compares. It runs in the pre-commit hook and in CI.
