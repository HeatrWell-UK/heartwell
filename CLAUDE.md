# Heartwell — rules for every session

Heartwell (heartwellsofa.co.uk) is a new online furniture brand for UK Mainland households. It runs the sister shop's business (UK Sofa Shop) with a new face. **Start every session by reading `docs/PLAN.md` and `docs/PROGRESS.md`**, then continue from the progress log.

## Workflow
- One phase per prompt, in the order in `docs/PLAN.md`. If a phase is too big, split it and update the plan.
- **One site, one database, no approval step** (owner, 13 October 2026). There is no staging. Work on a local phase branch, verify (types, lint, tests, build), merge into `main` and push `main` only: it deploys to the one site, https://heartwellsofa.co.uk (Hostinger). Never push other branches; preview deployments are off.
- **The shop is live** (16 October 2026): real customers, real orders, real emails and live Meta tracking. Test on the live site only with test orders ("Test" in the name, or a staff device / `?qa=1`), and never change what customers are charged, what OrderFlow or Meta receive, or delete data without the owner. Rollback to pre-launch: `NEXT_PUBLIC_APP_ENV=staging` in Hostinger, redeploy.
- The owner trusts the work and doesn't approve phases. End every phase with, in this order: **what I did**, **what I need from the owner**, **what to check** (a short phone list, on the real site), **what's next** (the next prompt). Update `docs/PROGRESS.md`.
- Don't demo or screenshot for the sake of it. Always suggest a better way when there is one.
- Check current docs for Next.js, Supabase, Cloudinary, Meta and Hostinger rather than relying on memory.

## The sister shop
- Read-only reference at `../sister-uksofashop-readonly` (branch master). Never push to it, open issues/PRs, or change it.
- `reference/` (sister schema + catalogue) is local only and git-ignored. Import scripts read it; only cleaned Heartwell data reaches the database.
- **Never carry over:** its reviews, orders, customers, leads, subscribers, videos or any customer data; its name, domain, phone/WhatsApp numbers, emails, address, socials; its account IDs, keys or tokens (Meta, GA4, GTM, Google Ads, Merchant Center, Supabase, Cloudinary, Trustpilot); its product descriptions.
- `npm run check:leaks` (pre-commit hook, CI and `prebuild`) must pass before every commit. It also blocks credential formats.
- The Heartwell repo (HeatrWell-UK/heartwell) is **public until launch**: never commit secrets, customer data or anything from `reference/`. Keys go in the host's environment variables only.

## Business rules (do not change without the owner)
- Cash or bank transfer on delivery. An order counts only once the customer confirms it (POST button on `/confirm-order/[id]`).
- Lifecycle: `pending_cod` → `confirmed` → `processing` → `shipped` → `delivered` | `cancelled`. Timestamps are stamped once.
- Money authority is the database (`place_order` etc.). The browser sends identities and quantities, never prices.
- Delivery prices, the date window and offer tiers live in the `shop_settings` table. Promises live in `src/config/promises.ts`; contact details in `src/config/contact.ts`; the domain (`NEXT_PUBLIC_SITE_URL`) and customer email (`SUPPORT_EMAIL`) are one setting each.
- Non-mainland postcodes go to a WhatsApp quote, never the online checkout.

## Tracking rules
- Meta Purchase: server-side only, on confirmation, exactly once (via `conversion_outbox`), never for test or cancelled orders.
- Browser and server copies of every event share one event ID.
- Tracking runs only on a production host **and** with `APP_ENV=production`. The pre-launch site, test orders, QA links and excluded staff devices never count.
- Customers' personal details (unhashed), order IDs, confirm/track links and postcodes in URLs never go to Meta or Google.
- Failures must be visible: outbox responses, `email_log`, the admin Health card, alerts.

## Code and platform
- Next.js 16 (App Router), React 19, TypeScript strict, Tailwind v4, Supabase, Cloudinary (custom loader), Nodemailer via Hostinger SMTP.
- Hosting: **Hostinger** (hosting account, one Node.js web app, auto-deploys from `main`) at https://heartwellsofa.co.uk since 15 October 2026, live since 16 October 2026 (`NEXT_PUBLIC_APP_ENV=production`). The Vercel project (team "Heartwell", heartwellfurniture.vercel.app) still builds from `main` as a fallback until a week after go-live. Hostinger's build servers have an old glibc, so Next.js falls back to its WebAssembly compiler there: build with webpack (`next build --webpack`, never Turbopack) and keep `next.config.mjs` plain JavaScript (a TypeScript config fails through Hostinger's wrapper); check with `NEXT_TEST_WASM=1 npm run build`. Keep the code portable: no Vercel crons, no `VERCEL_*` variables in logic, no Vercel-only features; scheduled jobs run from Supabase pg_cron; behind the proxy, build origins from forwarded headers (`externalOrigin`).
- One Supabase project: **heartwell-prod**, `oeakyeibdczedgvncomk` (the old heartwell-staging project was deleted on 13 October 2026). Schema changes only as files in `supabase/migrations/`, named after the version the project records. Never touch any other Supabase project.
- The publishable key is public, so whatever `anon` can read, anyone can. Visitors read `products`, `ranges`, `materials`, `material_collections` and `reviews` through column grants (migration `visitor_columns`): a new column the shop shows needs `grant select (column) … to anon` in its migration; back-office names, supplier details and order links never get one. New public functions start revoked from `public, anon, authenticated`.
- The catalogue (Phase 17A, 15 October 2026): the same products as before (sizes, prices, colours and the SKUs the warehouse and OrderFlow know, from `reference/`), the owner's own photos (Heartwell's Cloudinary, `heartwell/Product Images/…`) and Heartwell's own words (`scripts/catalogue/catalogue-copy.mjs`). Built by `scripts/catalogue/build-catalogue.mjs`; never use the sister shop's descriptions or photos. The old "Lily" range is **Sims**; the beige bolster sofas are **Lily**.
- Customer-facing UI follows `docs/DESIGN.md` and must not resemble the sister shop (no warm cream, no amber accent, no Fraunces or Geist, no heavy motion). CSS-only motion. Phone-first; built for the Facebook and Instagram in-app browsers.
- The admin keeps the sister shop's admin design, with Heartwell branding.
- British English everywhere: sofa, wardrobe, basket, £, UK dates (3 October 2026, 03/10/2026).
- Accessibility WCAG 2.2 AA. No fake reviews, ratings, urgency or countdowns.

## Search (Phase 20)
- Every indexable page has the search it's written for in `docs/KEYWORDS.md`; a new page gets a line there. Questions on category, range and product pages are built from live data (`src/lib/seo/answers.ts`, `src/content/categories.ts`), so never hard-code a price, size or delivery charge in them.
- FAQ data only for questions shown on the page. No shipping in page data (UK postcodes aren't supported there): Merchant Center's settings hold delivery by region (`docs/MERCHANT-CENTER.md`).
- IndexNow tells Bing about admin saves; after a deploy that changes many pages, run `node scripts/indexnow-submit.mjs`.
