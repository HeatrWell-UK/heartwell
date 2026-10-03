# Heartwell — rules for every session

Heartwell (heartwellfurniture.co.uk) is a new online furniture brand for UK Mainland households. It runs the sister shop's business (UK Sofa Shop) with a new face. **Start every session by reading `docs/PLAN.md` and `docs/PROGRESS.md`**, then continue from the progress log.

## Workflow
- One phase per prompt, in the order in `docs/PLAN.md`. If a phase is too big, split it and update the plan.
- Work on a feature branch → merge to `staging` (preview link: Vercel during the build, Hostinger from Phase 18B; open to anyone with the link, always noindex) → after the owner approves → `main` (production).
- End of every phase: deploy to staging, give a short phone checklist, update `docs/PROGRESS.md`, remind the owner of the next prompt.
- The owner trusts the builds: verify (types, lint, tests, build) but don't demo or screenshot for the sake of it. Always suggest a better way when there is one.
- Check current docs for Next.js, Supabase, Cloudinary, Meta and Hostinger rather than relying on memory.

## The sister shop
- Read-only reference at `../sister-uksofashop-readonly` (branch master). Never push to it, open issues/PRs, or change it.
- `reference/` (sister schema + catalogue) is local only and git-ignored. Import scripts read it; only cleaned Heartwell data reaches the database.
- **Never carry over:** its reviews, orders, customers, leads, subscribers, videos or any customer data; its name, domain, phone/WhatsApp numbers, emails, address, socials; its account IDs, keys or tokens (Meta, GA4, GTM, Google Ads, Merchant Center, Supabase, Cloudinary, Trustpilot); its product descriptions.
- `npm run check:leaks` (pre-commit hook + CI) must pass before every commit.

## Business rules (do not change without the owner)
- Cash or bank transfer on delivery. An order counts only once the customer confirms it (POST button on `/confirm-order/[id]`).
- Lifecycle: `pending_cod` → `confirmed` → `processing` → `shipped` → `delivered` | `cancelled`. Timestamps are stamped once.
- Money authority is the database (`place_order` etc.). The browser sends identities and quantities, never prices.
- Delivery prices, the date window and offer tiers live in the `shop_settings` table. Promises live in `src/config/promises.ts`; contact details in `src/config/contact.ts`; the domain (`NEXT_PUBLIC_SITE_URL`) and customer email (`SUPPORT_EMAIL`) are one setting each.
- Non-mainland postcodes go to a WhatsApp quote, never the online checkout.

## Tracking rules
- Meta Purchase: server-side only, on confirmation, exactly once (via `conversion_outbox`), never for test or cancelled orders.
- Browser and server copies of every event share one event ID.
- Tracking runs only on a production host **and** with `APP_ENV=production`. Staging, test orders, QA links and excluded staff devices never count.
- Customers' personal details (unhashed), order IDs, confirm/track links and postcodes in URLs never go to Meta or Google.
- Failures must be visible: outbox responses, `email_log`, the admin Health card, alerts.

## Code and platform
- Next.js 16 (App Router), React 19, TypeScript strict, Tailwind v4, Supabase, Cloudinary (custom loader), Nodemailer via Hostinger SMTP.
- Hosting: Vercel (team "Heartwell", Hobby, lhr1) while we build, with `NEXT_PUBLIC_APP_ENV=staging` on every Vercel environment; Hostinger Node.js apps from Phase 18B, before ads or real orders. Keep the code portable: no Vercel crons, no `VERCEL_*` variables in logic, no Vercel-only features; scheduled jobs run from Supabase pg_cron; behind the proxy, build origins from forwarded headers (`externalOrigin`).
- Schema changes only as files in `supabase/migrations/`, applied to staging and production.
- Customer-facing UI follows `docs/DESIGN.md` and must not resemble the sister shop (no warm cream, no amber accent, no Fraunces or Geist, no heavy motion). CSS-only motion. Phone-first; built for the Facebook and Instagram in-app browsers.
- The admin keeps the sister shop's admin design, with Heartwell branding.
- British English everywhere: sofa, wardrobe, basket, £, UK dates (3 October 2026, 03/10/2026).
- Accessibility WCAG 2.2 AA. No fake reviews, ratings, urgency or countdowns.
