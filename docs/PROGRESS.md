# Heartwell — progress log

Newest entry first. Each entry records what was done, where things stand, anything waiting on the owner, and the next prompt. A new session reads this, `CLAUDE.md` and `docs/PLAN.md`, then carries on.

## Current status

| | |
| --- | --- |
| **Current phase** | Phase 4 approved and merged into `main` (4 October 2026). Next: Phase 5, the catalogue import as working data. |
| **Design** | Approved 3 October 2026 (revision 2). Spec in `docs/DESIGN.md` · source in `design/` · canvas https://claude.ai/artifact/EDNrBLMoJGDt8MR2NtuR5y |
| **Staging link** | https://heartwell-staging.vercel.app (branch `staging`; open to anyone with the link, noindex) |
| **Approved build** | https://heartwellfurniture.vercel.app (branch `main`) |
| **Live site** | Not yet (move to Hostinger is Phase 18B, go-live Phase 19) |
| **Admin** | https://heartwell-staging.vercel.app/admin. Anyone not signed in as an admin is sent to the ordinary-looking https://heartwell-staging.vercel.app/login (Supabase email and password; allowlist in `public.admins`). |
| **Next phase** | Phase 5: Catalogue import (working data). Order from here: 5, 8–17, 17A–17C (photos and catalogue words), 18, 18B, 19. |
| **Next prompt** | `Phase 5 — Catalogue import. Read CLAUDE.md, docs/PLAN.md and docs/PROGRESS.md, then build Phase 5.` |
| **Open decisions** | D1–D11 in `docs/PLAN.md` section 10 |

## Known facts (so nobody has to ask again)

- Hosting account: Hostinger **Business Web Hosting**, 2 Node.js app slots free (the other 3 are used/in preview). Staging and production take both.
- Domains (heartwellfurniture.co.uk, heartwellsofa.co.uk) are on the owner's separate Hostinger account. heartwellsofa.co.uk email must keep working.
- Customer email: enquiries@heartwellsofa.co.uk (one setting).
- OrderFlow: the **same** OrderFlow as the sister shop, with its own key; Heartwell orders are tagged (HW- references).
- "Visit us": Heartwell has its **own address** (different from the sister's showroom); details to come in Phase 16.
- **Never mention the sister shop** on the Heartwell site (the owner chose to keep them separate).
- Heartwell's Cloudinary (connected via MCP): Free plan, 25 credits/month, empty as of 3 Oct 2026.
- The Supabase account connected via MCP had no projects as of 3 Oct 2026.
- Logo concept: `reference/Logo-Concept.jpeg` (brown/cream heart-shaped sofa, "Heartwell / SOFA").
- Sister repo cloned read-only at `../sister-uksofashop-readonly` (from a zip of master on 3 Oct 2026; no git history).
- GitHub: organisation **HeatrWell-UK**, repo **heartwell**, **public until launch** (owner's decision; made private in Phase 19). `main` = approved, `staging` = preview. Local commits are authored as "Heartwell <heartwellsofa@gmail.com>". The push sign-in is held by Git Credential Manager on the owner's PC.
- Vercel: team **Heartwell** (slug `heartwell`, `team_ROWTCazIeGNQ0zVEY4xIvRLg`, Hobby, login heartwellsofa@gmail.com), project **heartwell** (`prj_kXuZGVcI3xbw2inPEgTKNE6XUpq5`, Next.js, Node 24, functions in `lhr1`, preview toolbar off, Vercel Authentication off). Vercel deploys straight from the GitHub repo (owner's decision); the build runs the leak check first (`prebuild`).
- Vercel environment variables: `NEXT_PUBLIC_APP_ENV=staging` on all environments during the build; `NEXT_PUBLIC_SUPPORT_EMAIL`; `NEXT_PUBLIC_SITE_URL` = heartwellfurniture.vercel.app (production), heartwell-staging.vercel.app (preview), localhost (development). No `SITE_INDEXABLE` anywhere.
- Leak check: banned values live in `reference/leak-terms.txt` (local only). After changing it or the catalogue, run `npm run leaks:fingerprints` and commit `scripts/sister-fingerprints.json`, which holds hashes only.
- Supabase: organisation "Heartwellsofa" (free plan, owner's choice for now; D2 recommends Pro for production before launch). Projects in London: **heartwell-staging** `jfacgarejzvpuitiuvrk` and **heartwell-prod** `oeakyeibdczedgvncomk`. Every Vercel environment uses staging during the build (`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` set in Vercel); production's database is connected at Phase 18B. Free projects pause after a week without use: restore heartwell-prod from the dashboard when it's needed.
- Database rules: every schema change is a file in `supabase/migrations/` applied to both projects with the same version (the MCP tool records its own time, so the files are named after staging's recorded versions and production's rows are updated to match). Security definer functions live in the unexposed `private` schema behind thin `public` wrappers, so Supabase's security advisor stays empty: keep it that way.
- Admins: `public.admins` holds heartwellsofa@gmail.com (both projects). The account itself is created by the owner in the Supabase dashboard; `claim_admin()` links it on first sign-in.

## Log

### 4 October 2026 — Phase 4 approved; plan reordered
- Phase 4 approved and merged into `main`.
- **D4 decided: keep the range names** (they're the design names known across the UK); the title style is refreshed later.
- **Owner's direction: build the whole site first, then finish the catalogue's look and words.** Plan updated: Phase 5 imports the catalogue as working data (repeatable, keyed on slugs and SKUs, temporary photos, no descriptions); photos move to 17A–17B and new titles, descriptions and SEO to the new 17C. Order: 5, 8–17, 17A–17C, 18, 18B, 19.
- **Wiping later:** possible on staging (it holds only test orders), but not needed: re-running the import or editing in the admin updates rows in place, which keeps URLs, IDs and order history stable. Production gets the finished catalogue at Phase 18B, so the live shop starts clean either way.

### 4 October 2026 — Phase 4: database and core server logic
- **Owner:** Phase 3 approved (merged into `main`). Supabase on the free plan; admin email heartwellsofa@gmail.com.
- **Supabase:** created heartwell-staging and heartwell-prod in London (free, $0). Ten migrations applied to both; their functions, columns, policies, grants and cron jobs are byte-for-byte identical (fingerprint check). Security advisor: no findings on either.
- **Schema:** product types, category tree (no cycles), ranges with two named axes and a trade name for OrderFlow, products with numeric dimensions, colourways (SKUs), materials library with per-collection surcharge, offer codes and tiers; orders with HW-100101-style references, test flag, delivery zone, attribution and consent; order lines that keep the name, SKU, price and basket position as ordered; order history with who changed what; conversion outbox (exactly-once key); email log; job runs; attribution sessions and actions; WhatsApp enquiries (HW-WA- references); basket reminders; newsletter; samples (limit from settings); reviews (order-verified, approved only) with stats; ad-visitor offer tokens; OrderFlow (off until Phase 17); daily clean-up and OrderFlow re-send jobs.
- **Rules in the database:** `shop_settings` holds delivery prices, the delivery and preferred-date windows, offer tier amounts and the sample limit. `price_order`/`place_order` price everything from the catalogue and settings, refuse non-mainland postcodes (the database classifies them itself), check the delivery date in UK time and stop on a price mismatch. The lifecycle trigger allows only valid status changes and stamps each timestamp once. Staff tools (`place_manual_order`, `update_order_details`, `set_order_status`, `set_order_test`) check `is_admin()` themselves.
- **Tests:** `supabase/tests/order_flow.sql` (49 checks, run on staging, rolls itself back): all pass. It caught one real gap, order lines with no fixed order, fixed by migration `order_line_position`. In the app: 249 tests, including 214 that check the TypeScript postcode and delivery rules give exactly the database's answers, plus delivery windows, UK date format and the Status page verdicts.
- **App:** Supabase clients (request-bound, public and secret-key), session-refreshing proxy for `/admin`, `requireAdmin()`/`adminGuard()`, admin sign-in (email and password), admin shell in the sister admin's layout with Heartwell's colours, Home overview and the **Status** page (green, amber or red with a plain-English reason), `/api/health` now checks the database (503 if it can't). Storefront pages moved into a `(shop)` group so the admin has no shop header.
- **Deferred to their phases (by design):** Vault secrets and the website-calling cron jobs (conversion sending, review requests, digest, hourly health check) arrive with their endpoints; the secret key (`SUPABASE_SECRET_KEY`) is needed from Phase 10.
- **Owner feedback:** the admin sign-in should look like a normal account sign-in. Changed: `/admin` now redirects to `/login`, an ordinary "Sign in" page in the shop's own frame (noindex, not linked, robots-disallowed). Failed sign-ins and non-admin accounts get one generic "don't match" message, so nothing reveals an admin area; an admin lands on the page they asked for.
- **Waiting on the owner:** create the admin sign-in in the Supabase dashboard and switch off public sign-ups (steps in the chat), then check the Status page.

### 4 October 2026 — Phase 3: foundations
- **Owner decisions:** GitHub org HeatrWell-UK, repo heartwell; **no preview password** (anyone with the link can see it; still noindex); **Vercel while we build**, moving to Hostinger before ads and real orders. `PLAN.md` (version 1.1: section 8, Phase 3, new Phase 18B "Move to Hostinger", costs, risks) and `CLAUDE.md` updated to match.
- **Built:** Next.js 16.3 / React 19.3 / TypeScript 6 strict / Tailwind 4.3 project; design tokens and fonts (Besley, Figtree) from `DESIGN.md`; brand assets script (logo WebP, favicon, icons, OG image); Cloudinary loader that never re-runs generative transforms; security headers, CSP and noindex; config single sources (`env`, `site`, `brand`, `contact`, `promises`, `navigation`); UI kit (Button, Field inputs, Badge, Price, Accordion); announcement bar, header, swipe menu drawer (works in in-app browsers, focus and inert handled), footer; home page (heart-frame hero with an AI room photo, promise tiles, how ordering works); 404, error pages, robots (disallow all until go-live), manifest, `/api/health`, `/styleguide`.
- Contact details not supplied yet (phone, WhatsApp, address, company details) are `null` and hidden everywhere, never shown as placeholders.
- **Leak check:** fingerprint-based (hashes of the sister's name, domain, emails, phone, address, socials, account IDs and product description passages), so the repo holds no sister values at all. Runs as the pre-commit hook (`--staged`) and in CI (`--all`). Verified that it catches spaced phone numbers, IDs inside code and copied description text.
- **CI:** GitHub Actions runs lint, types, 18 tests, the leak check and the build on every push and pull request. Deploys come from Vercel's own GitHub connection; its build runs the leak and credential check first, so a leak never deploys.
- `npm run verify` passes locally. First commit pushed to `main` and `staging`.
- First tried deploying from GitHub Actions with a Vercel token, which works with a private repo. The owner then chose to make the repo public and connect Vercel directly, so the deploy job was removed and the leak check now also blocks credentials (API keys, tokens, private keys) and runs before every build. The `VERCEL_TOKEN` secret and token are no longer used and should be deleted.
- The owner made the repo public and connected it in Vercel. Vercel's first build on connecting came out as a production deployment of the `staging` commit; later pushes behave correctly (`staging` builds a preview, `main` is the production branch), and production was redeployed from `main`. Vercel's build log confirms the leak check runs first, then TypeScript; functions run in `lhr1`.
- Checked live: home, `/styleguide`, 404, manifest, icons, OG image and `/api/health` respond; every response carries `X-Robots-Tag: noindex, nofollow`; robots.txt disallows everything; CSP, HSTS and frame headers are present; the hero photo is preloaded through Cloudinary.
- **GitHub Actions has never run** (the workflow is registered but has zero runs), probably an Actions setting on the organisation or repo. Not blocking: Vercel's build runs the leak check and TypeScript. Lint and tests run locally (`npm run verify`) until it's fixed.
- **Waiting on the owner:** approve Phase 3 from the phone checklist; enable GitHub Actions; say whether I create the Supabase projects (free) or production goes on Pro.

### 3 October 2026 — Phase 2: design revision 2 (red velvet and gold)
- Owner feedback on revision 1: good, but keep the **original logo** (only change its colour), use **red velvet and golden gradients**, **no green or pink**. Everything else unchanged.
- Logo: traced the original to vector in Cloudinary (`heartwell/brand/logo-concept-original`), recoloured with `design/logo-work/build.mjs`: red velvet sofa and wordmark, gold-gradient cushion/legs/"SOFA" on white; gold wordmark and frame on wine. Files in `design/logo/` (full logo, mark, wordmark, each with a reversed version). Cloudinary's simple colour-replace gave muddy results and wasn't used.
- Palette: velvet red #8E1B2E (buttons with a velvet sheen gradient), wine #4A0D17, metallic gold gradient, gold tint, white and stone grounds. No cream, no flat amber (sister shop).
- Photos regenerated with soft white panelled walls, oak floors and a brass lamp (seed 21), replacing the sage walls; about 1.6 more Cloudinary credits.
- Recoloured all four boards (same layouts) and republished. `docs/DESIGN.md` rewritten as revision 2. The artifact is now shared "anyone with the link" (owner's change).
- **Waiting on:** approval of revision 2.
- The owner couldn't see the canvas: it loads slowly on phones and opens zoomed out or off-screen. Fix: `design/render-static.mjs` renders every board to plain HTML in `design/static/`, and headless Chrome screenshots were sent to the owner as images. Also fixed: footers recoloured to wine (they had come out bright red), the product board shortened, and the "Heartwell" wordmark crop tightened (stray marks from the sofa legs). For future design rounds, send images as well as the canvas link.

### 3 October 2026 — Phase 2: design proposed
- The owner left every design and photo decision to me ("our customers are from the UK") and was happy for the logo to change completely.
- Direction **Daylight and Velvet**: velvet green #1E3A2F for actions, rose #C23B5E as the heart accent, sage-mist and chalk grounds (no cream, no amber), Besley headings and prices, Figtree body, CSS-only motion. Signature details: the heart-sofa logo, a heart-topped hero frame (home only), pinking-shear fabric swatches, top-view plan drawings for shop-by-shape.
- **New logo** drawn as vector: a sofa whose backrest is a heart (`design/logo/`). Tagline "Sofas and furniture" replaces "Sofa".
- **Photos tested on Heartwell's Cloudinary** (cloud `iv3tp2iq`): 8 originals copied to `heartwell/source/` (untouched). Background removal + backdrop failed (kept the original dark floor shadow). Generative background replace into a bright sage-panelled room with oak floor worked in 7 of 8 (Ashton came back with a white wall). Plan section 6.3, D3 and Phase 6 updated. About 2 credits used.
- Published the design canvas (brand, style guide, phone home page, interactive phone product page): https://claude.ai/artifact/EDNrBLMoJGDt8MR2NtuR5y. Spec saved to `docs/DESIGN.md`.
- **Waiting on:** the owner's approval or change requests. After approval: Phase 3 (needs GitHub org + empty private repo `heartwell`, hPanel access, a staging password).

### 3 October 2026 — Plan approved; Phase 2 started
- The owner approved `docs/PLAN.md` as written (no changes). Decisions D1–D11 are still open and are picked up in the phases that need them.
- Phase 2: asked the owner for design instructions and the logo idea.

### 3 October 2026 — Steps 1 and 2: study and plan
- Downloaded the sister repository (master) read-only to `../sister-uksofashop-readonly` and studied the README, docs, all source, 56 migrations, CI workflows, `reference/sister-schema.sql` and `reference/catalogue/`.
- Found that the sister shop has already moved from Vercel to Hostinger (its README is out of date), and that its server tracking switch depends on `VERCEL_ENV`.
- Asked the owner the four things the repository can't answer: hosting plan (Business, 2 slots free), OrderFlow (same, tagged), showroom (own address), sister link (keep separate).
- Checked current docs: Next.js 16.3.x is the current LTS line; Hostinger runs Node.js apps on Business and Cloud plans with GitHub auto-deploy and no preview deployments; Cloudinary background removal = 75 transformations per image and generative background replace = 230; the UK cookie exemptions for analytics took effect on 5 February 2026 (ICO guidance 29 April 2026).
- Wrote `docs/PLAN.md` (19 phases plus later phases, feature map, tracking, catalogue and photo plans, deployment, what's needed from the owner, decisions), `CLAUDE.md` and this log.
- **Waiting on:** the owner's approval of the plan.
