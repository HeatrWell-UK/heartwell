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
| `npm run check:leaks` | Fails if anything from the sister shop is in the repo (`--staged` for the commit, `--all` for everything) |
| `npm run leaks:fingerprints` | Rebuilds `scripts/sister-fingerprints.json` from the local, git-ignored `reference/` folder |
| `npm run brand:assets` | Regenerates icons, favicon, OG image and logo files from `design/logo/` |

## Environments

| | Branch | Host | `NEXT_PUBLIC_APP_ENV` |
| --- | --- | --- | --- |
| Preview | `staging` and feature branches | Vercel preview deployments | `staging` |
| Production | `main` | Vercel during the build (with `staging` settings); Hostinger Node.js before ads and real orders | `production` (from the move to Hostinger) |

Every deployment is `noindex` until go-live sets `SITE_INDEXABLE=true` on the real domain. Tracking runs only when `NEXT_PUBLIC_APP_ENV=production` on the production host. The code reads no host-specific variables, so moving hosts means copying environment variables, not changing code.

## Deploying

GitHub Actions (`.github/workflows/ci.yml`) checks every push. On `staging` and `main` it then deploys to the Vercel project `heartwell`, but only if every check passed:

- `staging` → https://heartwell-staging.vercel.app (the preview link)
- `main` → https://heartwellfurniture.vercel.app (the approved build)

It needs one repository secret, `VERCEL_TOKEN` (a Vercel token scoped to the Heartwell team). If it's missing or expired, the deploy job fails with a clear message and the site stays on the last good build.

## The leak check

The repo must never contain the sister shop's name, contact details, account IDs or product descriptions. `scripts/sister-fingerprints.json` holds only hashes of those values, built from `reference/leak-terms.txt` and the catalogue on the owner's machine; the scanner hashes what it reads and compares. It runs in the pre-commit hook and in CI.
