# Heartwell — Project Plan

Version 1.1 · 4 October 2026 · Status: **approved by the owner on 3 October 2026**. Updated 4 October 2026: the site is hosted on Vercel while it's being built and moves to Hostinger before ads and real orders (owner's decision, section 8); the preview is open to anyone with the link, with no password; the GitHub repository is public until launch and Vercel deploys straight from it (owner's decisions).

Heartwell (heartwellfurniture.co.uk) is a new online furniture brand for UK Mainland households. It runs the same business as its sister shop, UK Sofa Shop: the same products, prices, back office, delivery partner and order flow. It gets a completely new customer-facing design, its own name, contact details and accounts. It launches with the sister shop's 64 sofas and is built so dining sets, coffee tables, wardrobes and beds can be added routinely later.

This document is the single plan for the whole project. Every build session starts by reading `CLAUDE.md`, this plan and `docs/PROGRESS.md`.

---

## Contents

1. [How we work](#1-how-we-work)
2. [What the sister shop taught us](#2-what-the-sister-shop-taught-us)
3. [Architecture decisions](#3-architecture-decisions)
4. [Feature map: keep, improve, drop, later](#4-feature-map-keep-improve-drop-later)
5. [Customer flow and conversion strategy](#5-customer-flow-and-conversion-strategy)
6. [Catalogue: database, import and new product photos](#6-catalogue-database-import-and-new-product-photos)
7. [Meta tracking and the Meta catalogue](#7-meta-tracking-and-the-meta-catalogue)
8. [From GitHub to Vercel and Hostinger, preview links and domains](#8-from-github-to-vercel-and-hostinger-preview-links-and-domains)
9. [What I need from you](#9-what-i-need-from-you)
10. [Decisions for you (with my recommendations)](#10-decisions-for-you-with-my-recommendations)
11. [The phases](#11-the-phases)
12. [Running costs](#12-running-costs)
13. [Risks and how we handle them](#13-risks-and-how-we-handle-them)
14. [Legal and compliance checklist](#14-legal-and-compliance-checklist)

---

## 1. How we work

- **One phase per prompt.** Each phase below has the exact prompt to send. If a phase turns out too big, I split it and update this plan.
- **Order:** Step 1 study (done) → Step 2 this plan (needs your approval) → Step 3 design (needs your approval) → build phases. No application code is written before the plan and the design are approved.
- **Preview links.** The design phase is shown as a private claude.ai page you can open on your phone. From the first build phase onwards, every phase goes onto the **staging site**: a Vercel preview link while we build, Hostinger's staging app from Phase 18B. It's open to anyone with the link and never indexed.
- **At the end of every build phase** I put it on the staging link, give you a short phone checklist, update `docs/PROGRESS.md`, and remind you of the next prompt.
- **I don't demo for the sake of it.** I verify that builds, type checks and tests pass; I don't send screenshots of everything.
- **Suggestions.** Wherever I see a better way than the sister shop, I say so and explain why. You decide.

---

## 2. What the sister shop taught us

I read the README, both docs, every source file, the 56 migrations, the CI workflows, `reference/sister-schema.sql` and `reference/catalogue/`. The sister repository is cloned read-only at `../sister-uksofashop-readonly` (outside this project) and is never changed.

### The business, as the code enforces it

| Area | Rule (sister shop, carried over unchanged) |
| --- | --- |
| Payment | Cash or bank transfer **on delivery**. Nothing upfront, no cards, no finance. |
| Order counts when | The customer **confirms** it, from a link sent by email and WhatsApp. The link shows the order and confirms only on a button press (POST), so link previews can't confirm it. |
| Lifecycle | `pending_cod` → `confirmed` → `processing` → `shipped` → `delivered`, or `cancelled` with a reason. Each timestamp is stamped once and never moved. |
| Pricing authority | The database function `place_order` prices every line itself and rejects a mismatch with the browser's figure. The browser never decides a price. |
| Delivery | Free to UK Mainland, ground floor, no minimum. Upstairs £20 (first floor, or any floor with a lift) + £10 per extra floor without a lift. Assembly £20. Old sofa removal £10 per seat (1–10 seats, default 3). |
| Delivery area | A postcode classifier separates UK Mainland from custom-quote areas (Northern Ireland, Isle of Man, Channel Islands, Isle of Wight, Isles of Scilly, Scottish islands, BFPO/overseas; IV40 and PA34 resolved by address lookup). Custom-quote postcodes go to WhatsApp, not the online checkout. |
| Timing | Most UK Mainland orders 2–4 working days; some Wales and Scotland postcodes 5–7. Preferred delivery date: from today + 4 days to + 180 days (UK date). Staff-agreed dates: today to + 365. Missed delivery: £50 re-delivery charge. |
| Returns | 14 days to change your mind (customer pays return carriage); made-to-order pieces are exempt; faults collected free. Changes/cancellations by email within 2 working days. 1-year guarantee on frame and springs. Transit damage reported within 24 hours with photos. |
| Made to order | `custom_made` products offer the whole fabric library (70 colours, 6 collections) and carry the Consumer Contracts exemption notice. |
| Fabric samples | Up to 5 samples, £5 for the set, refunded against a later order, settled on a phone call before posting. The limit is enforced in the database. |
| Offers | A public code (SOFAEXTRA) plus an automatic 7-day offer for paid-ad visitors. One discount per basket at the highest tier present: £50 electric, £30 Roma, £20 standard, £0 excluded. Calculated in the database. |
| WhatsApp | Every WhatsApp button mints a reference (e.g. `UKSS-WA-260906-A7F31C`) that is added to the message and saved with the visit's attribution, so a chat that becomes a sale can be traced back to the ad. Staff enter the reference when they take a WhatsApp order. |
| Reviews | All moderated. "Verified buyer" only through a signed link emailed 3 days after delivery. One review per order and product. Trustpilot switches exist, all off by default. |
| Basket reminders | Explicit opt-in at checkout (email and/or WhatsApp), kept at most 90 days, worked from an admin "Leads" page. |
| Emails | Customer: confirmation (with confirm link), status updates, review request, samples, newsletter double opt-in, basket reminder. Shop: new order (with a WhatsApp "ask to confirm" button and a copy-ready block), customer-confirmed, status prompts, samples, contact form, reviews, Monday digest. Sent through the shop's Hostinger mailbox. |
| OrderFlow | A database trigger pushes every new or changed order to OrderFlow (URL and key in Supabase Vault), with a 15-minute re-send job. |
| Tracking | Meta Pixel + Conversions API with shared event IDs; Purchase is sent from the server only after confirmation, once, from an admin button; OrderDelivered on delivery; GA4; a first-party attribution ledger; test traffic and private URLs kept out. |

### Lessons worth keeping

- The sister shop **has already moved from Vercel to Hostinger** (see `scheduled-jobs.yml` and `requestOrigin.ts`). Its README is out of date. It hit and solved real Hostinger problems: request origins behind the proxy, cron jobs, the service worker blocking images. We inherit those fixes.
- One trap it hasn't closed: server-side tracking is switched on by `VERCEL_ENV === 'production'`, which doesn't exist on Hostinger. Heartwell uses its own `APP_ENV` setting.
- Promises, prices and contact details must live in one place each. The sister shop learned this after advertising a £500 delivery threshold and a 30-day trial that were never real.
- No `loading.tsx` under catalogue routes (it turns unknown products into soft 404s).
- Many account IDs and contact details are hardcoded in the sister code (Pixel ID, GA4 ID, GTM, Google Ads, Supabase project, Cloudinary cloud, Trustpilot unit, phone numbers). Heartwell never copies files blindly; a leak scanner checks every commit (see 3.11).

### Data clean-up needed on import (from `reference/README.md`, plus what I found)

- `leather-sofa` lists itself as its own parent.
- `bishop-u-shaped-scattered-back-sofa`: trailing space in the title, placeholder description, colour "145, 122, 107".
- Colour "brown" (lower case) on a Roma variant.
- Spec keys: lower-case `style`/`dimensions` on one product, tabs and line breaks in dimensions, "USP Port" → "USB Port".
- Dimensions are free text; Heartwell stores width, depth and height as numbers.
- Every description ends "Free delivery to mainland UK" — all descriptions are rewritten; delivery wording always comes from the single source.
- The imported recliners are listed as "Leather". Before Heartwell says "leather", we must confirm whether it is genuine leather, bonded leather or PU (decision D9).

---

## 3. Architecture decisions

### 3.1 Stack

| Part | Choice | Why |
| --- | --- | --- |
| Framework | **Next.js 16** (App Router, latest 16.3.x), React 19, TypeScript (strict) | Same as the sister shop, so its business logic and admin port cleanly; current LTS line. |
| Styling | Tailwind CSS v4 with Heartwell's own design tokens | Fast to build, tiny CSS. Tokens come from the approved design. |
| Database, auth | **Supabase** (Postgres, Row Level Security, Auth for admins only, Vault, pg_cron, pg_net) | Same model as the sister shop; money rules live in the database. |
| Images | **Cloudinary** (Heartwell's own account) with a custom Next.js image loader | Cloudinary resizes and converts to AVIF/WebP at the edge, so the Hostinger server never processes images. |
| Email | Nodemailer via Hostinger SMTP, logged to an `email_log` table | Same as the sister shop, plus a log so failures are visible. |
| Validation | Zod | Every server action validates its input. |
| Motion | CSS only (no Framer Motion, no Lenis smooth scroll, no view-transition tricks) | Speed in in-app browsers, and the brief says no heavy motion. |
| Tests | Vitest (pricing, postcode policy, feed, tracking payloads) + Playwright smoke tests run against staging | The sister shop's QA lived in ad-hoc scripts; Heartwell keeps them as real tests. |

Not carried over: next-pwa / service worker (it broke the sister's image loading and adds nothing in in-app browsers), Vercel Analytics, Framer Motion, Lenis, Google Tag Manager, Google Ads tags.

### 3.2 Environments

| Environment | Where | Data | Tracking | Who sees it |
| --- | --- | --- | --- | --- |
| Local | My machine | Staging database | Off | Me |
| **Staging** (preview link) | Branch `staging`. Vercel preview while we build; Hostinger Node.js app #1 from Phase 18B | Staging database | Off (optional Meta test mode, see 7.6) | Anyone with the link, `noindex` |
| **Production** | Branch `main`. Vercel production while we build (run with staging settings, so nothing counts); Hostinger Node.js app #2 at heartwellfurniture.co.uk from Phase 18B | Production database (from Phase 18B) | On (production host only) | Everyone, after go-live |

Your Business plan has two free Node.js app slots, which is exactly this. A third environment would need an upgrade to Cloud Startup (10 apps). Until Phase 18B both slots stay free.

### 3.3 Database

- **Two Supabase projects** in London (eu-west-2): `heartwell-prod` and `heartwell-staging`. Test orders never touch real data.
- **All schema changes are migration files in `supabase/migrations/`**, applied to both. Never edited in the dashboard.
- **Money rules stay in Postgres:** `place_order`, `confirm_order`, `order_for_confirmation`, `track_order`, `place_manual_order`, `update_order_details`, `request_swatches`, the offer calculator, review stats.
- **Improvement:** delivery prices, the preferred-date window and offer tier amounts move into a `shop_settings` table that both the database functions and the website read. The sister shop keeps them in two places (TypeScript and SQL) and relies on a mismatch error to notice drift. With one table, the owner can change a price in the admin and it changes everywhere.
- **Improvement:** a human order number, e.g. **HW-100231**, alongside the private ID. It shows on emails, tracking, delivery notes and OrderFlow. The sister shop uses the first 8 characters of the private ID, and its own OrderFlow code has a TODO asking for exactly this.
- Supabase's newer key format (publishable/secret keys) is used if the projects are created with it.
- Production should be on **Supabase Pro** (no auto-pausing, daily backups). See decision D2.

### 3.4 A catalogue that isn't just sofas

The sister model (one product per size/style "piece", grouped into a range, with photographed colourways as variants) is right for sofas and for SEO, so it stays. What changes:

| Sister shop | Heartwell |
| --- | --- |
| Flat categories, all sofa-specific | **Category tree**: top level "Sofas" now (later "Dining", "Tables", "Wardrobes", "Beds"), with children such as Corner Sofas, U-Shaped Sofas, 3+2 Sofa Sets, Fabric Sofas, Leather Sofas, Recliners, Electric Recliners, Armchairs & Footstools. |
| No product types | **`product_types`** (sofa, armchair, footstool; later dining set, coffee table, wardrobe, bed). Each type defines its specification fields, its filters, which delivery services apply (e.g. "remove old sofa" priced per seat vs "remove old bed" per item), its Google/Meta product category and its size-guide behaviour. Adding a new type is a data change, not a code rewrite. |
| `variant_groups` with a "Style" axis | **`ranges`** with two named axes (e.g. Size × Back style; for beds later Size × Headboard). |
| Dimensions as free text | **Numbers** (width, depth, height, seat height, seat depth, plus corner/U-shape arm lengths) with a free-text note. This powers filters ("fits a 200 cm wall"), the will-it-fit checker, structured data and the Meta catalogue. |
| Fabric library for sofas | **Materials library** (fabric collections now, wood finishes later), attached per product type, with an optional surcharge per collection (0 today, so prices are unchanged). |
| `specifications` free JSON | Typed spec fields per product type, plus free extras. |

### 3.5 Images

- The sister shop's originals are downloaded once and stored in Heartwell's Cloudinary under `heartwell/source/` and **never modified**. All generated photos are **new** assets under `heartwell/products/`.
- The site never hotlinks the sister's Cloudinary. The leak scanner blocks its cloud name.
- Details in section 6.

### 3.6 Scheduled jobs

**Improvement:** scheduled jobs run from **Supabase pg_cron** (calling protected website endpoints through pg_net, with the secret held in Vault) instead of GitHub Actions. GitHub silently disables scheduled workflows after 60 days without repository activity, and the sister shop's own comment flags it. pg_cron also logs every run, which the admin health page shows.

Jobs: conversion sending (every 5 min), OrderFlow re-send (every 15 min), review requests (daily 10:00), basket-reminder clean-up (daily), Monday digest (07:00), health check (hourly).

### 3.7 Email

- Sent through Hostinger SMTP, logged in as `enquiries@heartwellsofa.co.uk` and shown as `orders@heartwellsofa.co.uk` (an alias you create), with replies to `enquiries@`. The address and the email domain are **one setting each**, so moving email to heartwellfurniture.co.uk later is a one-line change.
- Every send is written to `email_log` (type, status, error). Repeated failures raise an alert (3.9).
- Staging never emails real customers: every staging email is redirected to your test inbox.

### 3.8 Tracking architecture (summary; details in section 7)

- Meta Pixel in the browser plus the **Conversions API** from our server, every event with a **shared event ID**, so Meta counts it once.
- **Purchase** is sent from the server when an order is **confirmed**, **exactly once**, through a `conversion_outbox` table that records Meta's response. Improvement: automatic sending after a short hold, instead of the sister's manual button (decision D1).
- A **first-party attribution ledger** saves UTMs and click IDs on arrival and attaches them to every order, WhatsApp click and sample request.
- GA4 for site analytics, with Consent Mode. The outbox has a `platform` column, so Google Ads and Merchant Center can be added later without rework.

### 3.9 Test traffic and "it's obvious when something breaks"

- Tracking runs only when **both** the host is a production host **and** `APP_ENV=production`.
- Orders have an `is_test` flag. It is set automatically on staging, for QA links (`?qa=1`) and for orders matching test patterns; the owner can also set it from the admin. Test orders never send conversions, never reach OrderFlow and are left out of reports.
- **Improvement:** an "Exclude this device" switch in the admin stops your own phone's browsing from counting as customer activity.
- **Improvement:** an admin **Health** card shows the last accepted Meta event, the last email sent, the last run of every scheduled job, OrderFlow push errors and the last time Meta fetched the catalogue feed, each green, amber or red with a plain-English reason. The health check emails you when something turns red, and a free external monitor (UptimeRobot, decision D8) alerts your phone if the site or the email/tracking checks go down. That covers the case where email itself is what broke.

### 3.10 Single sources of truth

| What | Where |
| --- | --- |
| Domain / site URL | `NEXT_PUBLIC_SITE_URL` (one setting), read through `src/config/site.ts` |
| Customer email | `SUPPORT_EMAIL` in `src/config/site.ts` (one setting) |
| Phone, WhatsApp, address, hours, socials, company details | `src/config/contact.ts` |
| Promises (delivery, payment, returns, guarantee, made to order) | `src/config/promises.ts` |
| Delivery prices, date window, offer tiers | `shop_settings` table (editable in the admin) |
| Brand strings | `src/config/brand.ts` |

### 3.11 Keeping the sister shop out

- `scripts/check-sister-leaks.mjs` scans every staged file for the sister's brand name, domain, phone and WhatsApp numbers, emails, address, social handles, Pixel/GA4/GTM/Google Ads IDs, Supabase project ref, Cloudinary cloud name, Trustpilot ID and offer code. It runs as a **git pre-commit hook** and again in **GitHub Actions**; any hit blocks the commit.
- `reference/` (sister schema and catalogue) stays **local only** and is git-ignored. Import scripts read it, and only cleaned, Heartwell-owned data reaches the database.
- No sister reviews, orders, customers, leads, subscribers or videos are ever imported.

---

## 4. Feature map: keep, improve, drop, later

**Keep** = same behaviour, Heartwell design and wording. **Improve** = same purpose, better implementation. **Drop** = not built. **Later** = after launch, one prompt each.

### Storefront

| Sister feature | Heartwell | Why |
| --- | --- | --- |
| Home page (motion-heavy hero, bento, craft story, review ticker, stats band, marquee) | **Improve** (rebuilt) | New design, phone-first, light. No invented numbers or reviews. |
| Announcement bar | Keep | Carries the four promises. |
| Mega menu, mobile menu, search overlay | **Improve** | Driven by the category tree, so new departments appear automatically. |
| Category pages with filters, sort, price range, SEO copy | **Improve** | Filters come from the product type (size, seats, material, colour, price, width, made to order). New SEO copy. |
| Collections / range pages | Keep, as "Ranges" | Good for browsing a family of sizes. |
| Product page (gallery, size/style pills, colours, fabric dialog, dimensions dialog, delivery estimate, made-to-order block, reviews, similar, recently viewed, sticky add, offer strip, videos) | **Improve** | All the logic stays. Rebuilt for conversion with an inline postcode check and will-it-fit, and a lighter gallery. |
| Basket and two-step checkout (postcode + address lookup, extras, preferred date, offer code, reminder opt-in, WhatsApp quote for non-mainland, mobile total bar) | Keep logic, **improve** UI | A one-page mobile checkout with the same server authority. |
| Success page | Keep | Shows next steps and the confirm link. |
| Confirm-order page (confirms on button press) | Keep | The core business rule. |
| Track order (reference + postcode) | **Improve** | Uses the HW order number. |
| Customer accounts (sign up, log in, account page, wishlist) | **Drop** | Cash-on-delivery customers buy as guests. Google sign-in doesn't work inside Facebook/Instagram browsers. Replaced by a "Saved" list kept on the device. |
| Reviews page, product reviews, guest review by signed link | Keep, starts empty | No sister reviews, ever. "Verified" only through the order link. |
| Trustpilot | Keep, switched off | A new Heartwell profile when you're ready; widgets once there are enough reviews. |
| Fabric samples (5 for £5, refundable) | Keep | |
| Fabrics guide | Keep, rewritten | |
| Size guide, doorway calculator, fit check | **Improve** | Uses numeric dimensions, and also appears on the product page. |
| Care guide | Keep, rewritten | |
| Journal (7 articles) | **Improve** → "Guides", rewritten | Organic search; no duplicate text. |
| About | Rebuilt | Heartwell's own story (no link to the sister shop). |
| Showroom | Keep, as "Visit us" | At Heartwell's own address (you answered "a different address"). |
| Contact, FAQ (with FAQ schema) | Keep, Heartwell wording | |
| Delivery & returns, Terms, Privacy, Cookies | Keep, Heartwell details | Privacy and Cookies updated for the Data (Use and Access) Act 2025 cookie rules. |
| Careers | **Drop** | Not needed. |
| HTML sitemap, llms.txt | Keep | Cheap and good for search and AI assistants. |
| Newsletter (double opt-in) | Keep | |
| WhatsApp button and CTAs with references | Keep, **improve** | Better hand-off from Instagram/Facebook in-app browsers to the WhatsApp app. |
| Cookie consent modal | Keep, new design | Equal-weight buttons (PECR). Our own first-party statistics can use the new analytics exemption (with an opt-out); Meta stays consent-only. |
| Offers (code + ad-visitor offer + strip) | **Improve** | Code and tier amounts editable in the admin. The signed `/offer-entry` redirect is removed: it adds a redirect (slower ad landings) to protect a code that's public anyway. |
| AI chat assistant | **Later** (L1) | Needs Heartwell's own Anthropic key; launch the core funnel first. |
| Build-your-own sofa (`/build`) | **Later** (L2) | A big configurator; launch the core funnel first. |
| PWA service worker | **Drop** | Caused image blocking; no benefit in in-app browsers. The admin keeps its install manifest. |
| Motion library (curtain, split text, cursor, parallax, view transitions) | **Drop** | Brief and speed. |
| Google Ads, GTM, Merchant feed, Google consent receipts, Sheet sync | **Drop for now**, structure kept | Meta only for now. The feed generator and outbox can output Google later. |
| Social-image renderer scripts | **Later** (L7) | Becomes an ad-creative kit for Meta. |

### Admin (sister design, Heartwell branding)

| Sister feature | Heartwell | Why |
| --- | --- | --- |
| Overview dashboard | Keep, plus the **Health** card | "Obvious when something breaks." |
| Orders (filters, status flow with emails and WhatsApp prompts, edit, delete, copy, print delivery note, take a WhatsApp order, attribution override, UK/PK times) | Keep | The owner's daily tool. |
| Meta conversion centre (manual send buttons) | **Improve** → "Tracking" | Automatic sending with a hold window, manual override, Meta's responses visible (D1). |
| Leads (basket reminders) | Keep | |
| Inventory (add/edit product) | **Improve** | Product types, numeric dimensions, image picker, description and SEO fields. |
| Categories | **Improve** | Tree with sort order and SEO copy. |
| Reviews, Samples, Videos | Keep | |
| — | **New: Settings** | Delivery prices, offer code and tiers, tracking mode, test-order rules. |
| — | **New: Photos** | Approve, regenerate or reject the new AI product photos. |
| — | **New: Ad links** | Ready-made tagged links for each product and range, to paste into Meta ads. |
| Admin install manifest | Keep | Opens the dashboard from your home screen. Push notifications: Later (L4). |

### Behind the scenes

| Sister feature | Heartwell | Why |
| --- | --- | --- |
| Pricing and order functions in Postgres | Keep, generalised | Server authority. |
| Postcode classifier + address lookup (Homedata) | Keep | Needs Heartwell's own lookup key. |
| Hostinger SMTP email | Keep, plus `email_log` and alerts | |
| Cron via GitHub Actions | **Improve** → Supabase pg_cron | Doesn't silently stop; logged. |
| OrderFlow push | Keep, **tagged Heartwell** | Same OrderFlow, own key, HW- references. Product names sent as the back-office name if ranges are renamed (D4). |
| `conversion_events` audit | **Improve** → `conversion_outbox` | Exactly-once, retries, stores Meta's response. |
| Monday digest | **Improve** | Adds confirmed orders and revenue by campaign/ad and WhatsApp. |
| In-memory rate limiter | Keep | One Hostinger instance makes it effective. |
| Attribution ledger | **Improve** | UTMs and click IDs saved for every visitor (not only those who accept cookies) under the new analytics exemption, with an opt-out. Meta identifiers stay consent-only. |
| Phase-D QA scripts | **Improve** | Proper automated tests in the repo. |

---

## 5. Customer flow and conversion strategy

Almost every visitor arrives from a Facebook or Instagram ad, inside the app's own browser, on a phone, having never heard of Heartwell. The site has to answer three questions within seconds: *Is this the sofa I tapped? Can I trust these people? What happens if I order?*

### The main journey

1. **Ad → product page** (or range/category page for carousel ads). The page opens on the exact colourway from the ad (`?variant=`), with the price and "Pay nothing until it's delivered" in the first screen.
2. **Product page**, top to bottom on a phone:
   - swipeable gallery (the ad's colour first);
   - title, price and a promise row: *Free UK Mainland delivery · Pay cash or bank transfer on delivery · Arrives Thu 9 – Mon 13 Oct*;
   - size and style pills; colour; "Choose any of 70 fabrics" for made-to-order pieces (and "Order 5 samples");
   - **Add to basket** (large, thumb reach) and **Ask us on WhatsApp**;
   - **"How ordering works"** in three steps: order online in 2 minutes → we call or WhatsApp to confirm → pay when it's in your room;
   - inline **postcode check** ("Delivers free to LS6") and **will-it-fit** (door width vs depth);
   - dimensions diagram, specs, care, delivery & returns, reviews (honest empty state at launch), other sizes in the range;
   - a sticky bottom bar with price and Add to basket.
3. **Basket** (drawer): delivery shown as FREE, extras offered later, never surprise fees. Under the DMCC Act 2024 total prices must include all mandatory charges.
4. **One-page checkout**: name, mobile, email → postcode → pick address → delivery extras with live total → preferred date (optional) → place order. Proper `autocomplete`, `inputmode` and large inputs, so the in-app browser's autofill works. No account. The button reads **"Place order: pay nothing today"**.
5. **Success page**: order number, total to pay on delivery, and the next step: *"Check your WhatsApp/email and tap Confirm."* A WhatsApp button lets them message the shop straight away.
6. **Confirmation** from the link → the order counts → Purchase is reported → the team calls to book the day.

### Trust without fake proof

- Real promises from the single source: free delivery, pay on delivery, 14-day returns where applicable, 1-year frame guarantee, UK-made where true.
- A real **Visit us** address and opening hours, a real phone and WhatsApp number, company details in the footer.
- Real reviews and customer videos as they arrive. Never invented ratings, never fake urgency or countdowns (both are illegal under the DMCC Act).
- Honest photography: the AI only changes the backdrop, never the furniture (section 6).

### Built for Facebook and Instagram in-app browsers

- Server-rendered, cached pages; small JavaScript; CSS-only motion; responsive Cloudinary images; self-hosted fonts. Targets: largest contentful paint under 2.5 s on 4G, Lighthouse mobile performance ≥ 90, accessibility ≥ 95.
- No pop-ups, no new windows, no Google sign-in, no file downloads; the basket survives the app closing and reopening.
- WhatsApp links tested from both apps on iPhone and Android, with the most reliable link per app.
- The cookie question is answered in one tap with equal-weight buttons.

### Organic sales

- Unique, rewritten product and category copy; structured data (Product, Offer, Breadcrumb, FAQ, LocalBusiness for the Visit us address); a clean sitemap; one canonical URL per product.
- Guides that answer real buying questions (measuring for a corner sofa, fabric vs leather, how cash on delivery works, what made to order means).
- A Google Business Profile for the Visit us address (your step, with my instructions in Phase 19).
- Fast pages, which Google rewards.

### Lead capture for people not ready to buy

- WhatsApp (with attribution), samples (5 for £5, refundable), a basket reminder opt-in at checkout, and a newsletter with double opt-in.

---

## 6. Catalogue: database, import and new product photos

### 6.1 Database setup (Phase 4)

You create two Supabase projects (London); I apply every migration to both through the Supabase tools available to me, generate TypeScript types, create the admin users and set the Vault secrets. Row Level Security is on for every table, and the anonymous key can only read the public catalogue and call the few public functions.

### 6.2 Import (Phase 5)

A repeatable script reads `reference/catalogue/*.jsonl` and writes Heartwell's own rows (new IDs, matched by slug):

- 7 categories → placed in the new tree (fixing the self-parent).
- 16 ranges with their axis names, keeping their names (D4: they're the design names customers know).
- 64 products: cleaned titles, numeric dimensions parsed from the text (checked by eye), product type assigned, made-to-order and origin flags, featured flags, specifications normalised.
- 105 variants with SKUs **unchanged** (the warehouse and OrderFlow know them), colours tidied, price adjustments.
- 6 fabric collections and 70 fabrics, with their swatch photos copied.
- 64 offer tiers.
- **The import is repeatable:** keyed on slugs and SKUs, so running it again updates rows in place rather than duplicating them, and IDs, URLs and order history never change. A finished catalogue replaces the working one by updating, not by wiping.
- **Descriptions are not imported** (they're the sister's words). Until Phase 17C, product pages show the specifications. Then I write new ones in Heartwell's voice: a range story plus size-specific detail, highlights and SEO titles and descriptions. Delivery wording comes from the single source. You can edit them all in the admin.

### 6.3 New product photos (Phases 17A–17B, after the site is built)

The sister photos are studio renders of each piece in a dark room (grey walls, dark wooden floor). Heartwell keeps the same furniture and gives it a new setting that matches the approved design. I tested the options against your Heartwell Cloudinary account (Free plan, 25 credits a month, currently empty):

| Approach | How | Cost per image | All ~110 images |
| --- | --- | --- | --- |
| **A. Studio cut-out** | Cloudinary AI background removal, then placed on Heartwell's own backdrop with a soft floor shadow | 75 transformations (≈ 0.08 credit) | ≈ 8–9 credits |
| **B. AI room scene** | Cloudinary generative background replace, with a fixed Heartwell room prompt and seed per category | 230 transformations (≈ 0.23 credit) | ≈ 25 credits (the whole free month) |

~~My recommendation: A for every variant photo, B only for one hero photo per range.~~ **Updated 3 October 2026 after testing on real photos in the design phase:** A doesn't work on these images, because background removal keeps the original's dark floor shadow as a grey smudge. B produced a bright, realistic room with the sofa untouched in 7 of 8 tests. **Recommendation now: B for every main photo**, with a tighter prompt and the approval step catching the occasional miss. About 110 images × 230 = ~25 credits, which is one full free month (≈ 2 credits were used for the design samples). So either spread the run over two months, or take Cloudinary Plus for one month, then drop back to free. The sample photos already made are kept and reused.

How it runs:

1. **Originals copied once** from the sister's Cloudinary into `heartwell/source/` and never touched again.
2. **Pilot (Phase 17A):** both approaches on 6 representative pieces (fabric sofa, corner, U-shape, leather recliner, electric recliner, footstool), shown side by side on an admin **Photos** page. You pick the direction.
3. **Full run (Phase 17B):** each result is saved as a **new permanent asset**, so it is never regenerated or charged again, in square (catalogue/ads) and 4:5 (Instagram) crops. Every image appears in the Photos page to **approve, regenerate (new seed) or reject**; only approved images go live.
4. **Honesty rule:** the furniture's shape, legs, stitching and colour must be unchanged. Anything distorted is rejected. Product images must represent the product accurately under consumer law.

---

## 7. Meta tracking and the Meta catalogue

### 7.1 Events

| Moment | Browser (Pixel) | Server (Conversions API) | Notes |
| --- | --- | --- | --- |
| Any page | PageView | — | After consent. |
| Product or colour viewed | ViewContent | ViewContent | Same event ID; `content_ids` = variant ID = catalogue item ID. |
| Added to basket | AddToCart | AddToCart | Same event ID. |
| Checkout started | InitiateCheckout | InitiateCheckout | Same event ID. |
| WhatsApp or phone tap | Contact | Contact | Meta's standard event for "contacted the business". The WhatsApp reference is saved with the attribution. |
| Sample request | Lead | Lead | A real lead: the customer submitted their details. |
| Basket reminder opt-in | Lead | Lead | Tagged `reminder`. |
| Order placed (not yet confirmed) | OrderPlaced (custom) | OrderPlaced (custom) | Funnel step only; never optimised for. |
| **Order confirmed** | — | **Purchase** | Server only, **exactly once**; `event_time` = confirmation time; value = delivery-inclusive total from the database. |
| Order delivered | — | OrderDelivered (custom) | True-revenue reporting. |

You described WhatsApp clicks and sample requests as "leads". In Meta's terms a tap is a **Contact** and a submitted form is a **Lead**. Using both correctly gives you cleaner optimisation options. Both are leads in the admin reports.

### 7.2 Deduplication and exactly-once Purchase

- Browser and server copies share one event ID generated in the browser, so Meta keeps one.
- Purchase uses the order's `purchase_event_id`. It is sent through `conversion_outbox` (unique per order and event): claimed before sending, retried on failure, and Meta's response (`events_received`, trace ID, errors) is stored. A cancelled or test order is never sent. If an order is cancelled after its Purchase was sent, the admin shows a warning (as the sister shop does).
- **D1 (recommended):** sent automatically 30 minutes after confirmation, which leaves a window to mark a mistaken order as test or cancelled, with **Send now** and **Hold** buttons. The sister shop's manual-only mode stays available as a setting.

### 7.3 Event match quality within UK rules

- **Browser events:** only after the visitor taps "Accept". At checkout the Pixel gets advanced matching (email, phone, name, postcode, city).
- **Server events:** hashed email, phone, first and last name, postcode, city and country, plus a hashed first-party visitor ID. `fbp`, `fbc`, IP address and user agent are taken from the checkout request only where the visitor consented (D10 covers the one judgement call). Typical Purchase match quality with these fields is "Good" to "Great" (7–9/10).
- **Never sent to Meta or Google:** raw personal data, order IDs, confirmation links, tracking links, postcodes in URLs, review tokens. Pages with those in the URL don't load the Pixel at all, and GA4 sees redacted URLs (sister rule, kept).

### 7.4 Attribution: which ad produced which sale

- On arrival, UTMs (`utm_source/medium/campaign/content/term`), `fbclid` and Meta's ad/adset/campaign IDs (via URL parameters in your ad template) are saved server-side against first-party visitor, session and arrival IDs.
- They are attached to **every order, WhatsApp enquiry, sample request and reminder opt-in**, with first touch and last touch.
- The admin shows source, campaign and ad per order. The Monday digest summarises confirmed sales and revenue by campaign and ad, and WhatsApp orders are linked through their reference.
- The admin "Ad links" page gives ready-made URLs with Heartwell's UTM template for each product and range.

### 7.5 Meta catalogue

- Feed: `https://heartwellfurniture.co.uk/feeds/meta-catalogue.xml`, generated from the database.
- One item per variant: **ID = variant ID, the same ID the Pixel and CAPI send**; `item_group_id` = product; title, description, price, availability, condition, brand (Heartwell), link (product URL with `?variant=` and the catalogue UTMs), image and extra images (the new photos), colour, material, size, Google product category (Furniture > Sofas), product type, shipping (GB, £0), and custom labels (range, made to order, price band, offer tier) for product sets.
- Validated in tests. The admin health card shows when Meta last fetched it.
- Your steps in Commerce Manager (Phase 15): create the catalogue, add the scheduled feed (hourly), connect the Pixel/dataset, create product sets by category and label.

### 7.6 Testing without polluting data

- Staging never loads the production Pixel and never sends live events.
- During setup, a **Meta test mode** sends staging events to Events Manager's **Test events** tab only (using the test event code), so we can see browser and server copies arrive and deduplicate.
- QA links, test orders and excluded staff devices never count.

### 7.7 Domain verification

In Phase 19 you add one TXT record for heartwellfurniture.co.uk (in the **domains** account) from Meta Business settings → Brand safety → Domains. I give you the exact values on the day.

### 7.8 GA4

GA4 for site analytics, using Consent Mode v2 (defaults denied; cookieless pings until consent) and URL redaction. The confirmed-purchase event goes to GA4 from the server through the same outbox, so revenue shows in GA4 without trusting the browser. Google Ads and Merchant Center can later be switched on as new outbox platforms and a second feed output, with no rework.

---

## 8. From GitHub to Vercel and Hostinger, preview links and domains

### 8.1 Code flow while we build (Vercel)

```
my work (feature branch) ──► staging branch ──► Vercel preview (auto-deploy on push) = your preview link
                                    │  you approve the phase
                                    ▼
                              main branch ──► Vercel production (auto-deploy) = the approved build
```

- Repository `HeatrWell-UK/heartwell`, **public until launch** (owner's decision, 4 October 2026), made private again in Phase 19. Public means anyone can read the code and the docs, so: no secrets in files (the leak check also blocks credential formats), no customer data in the repo, and GitHub's secret scanning and push protection stay on.
- **Vercel is connected to the repository** (Vercel's GitHub app on HeatrWell-UK). Every push deploys: `staging` to the preview link, `main` to the approved build, any other branch to its own preview. Project `heartwell` (team "Heartwell"), Node 24, functions in London (`lhr1`).
- The build runs the **leak and credential check first** (`prebuild`), so a leak fails the build and never deploys. TypeScript errors fail it too. Every push also runs GitHub Actions (lint, type check, tests, leak check, build); a red run means the deployment from that push needs fixing. The pre-commit hook runs the leak check locally as well.
- Environment variables live in the Vercel project; `.env.example` lists the names, and secrets are never committed.
- **Why Vercel for now:** nothing to set up, a fresh preview after every push, and both Hostinger slots stay free. Vercel's free Hobby plan is for non-commercial use only, so it hosts the build, never the live shop.
- **Kept portable:** the code reads its own `APP_ENV`, never Vercel's variables; scheduled jobs run from Supabase pg_cron, not Vercel Cron; origins come from forwarded headers (`externalOrigin`). Moving host means copying environment variables, not changing code.

### 8.2 Preview links

The `staging` branch has a fixed Vercel address (recorded in `docs/PROGRESS.md`). It's open to anyone with the link (your choice: no password), `noindex`, uses the staging database, sends its emails to you and has tracking off. It redeploys a minute or two after every push to `staging`. Every other branch also gets its own preview address. During the build, **both** Vercel environments run with `NEXT_PUBLIC_APP_ENV=staging`, so nothing on Vercel ever counts as the real shop.

### 8.3 Moving to Hostinger before ads and real orders (Phase 18B)

- Create the two Hostinger Node.js apps (staging on `staging`, production on `main`) in the hosting account, copy the environment variables, and set production's `NEXT_PUBLIC_APP_ENV=production`.
- Staging first: a full checkout test on Hostinger's temporary address, then production. Vercel stays as a fallback until the live domain has run on Hostinger for a week; then the Vercel project is deleted.
- **If you'd rather stay on Vercel:** the Pro plan ($20 a month) allows commercial use, and the code runs unchanged on either.

### 8.4 Domains (exact steps in Phase 19)

- **heartwellfurniture.co.uk** (domains account → DNS zone): point the root and `www` to the production app's address shown in the **hosting** account; SSL is issued in the hosting account.
- **heartwellsofa.co.uk** keeps its **email records exactly as they are** (MX, SPF, DKIM, DMARC). Only its web records change, so it 301-redirects to heartwellfurniture.co.uk. Before touching anything, I'll have you screenshot or export its current DNS zone, and we test sending and receiving email before and after.
- Meta domain verification: one TXT record on heartwellfurniture.co.uk.

---

## 9. What I need from you

Grouped by the phase that needs it. Nothing is needed before the design phase except your design instructions.

| # | Item | Needed by |
| --- | --- | --- |
| 1 | Your design instructions, likes, dislikes and reference sites. I already have `reference/Logo-Concept.jpeg`; tell me if there's a newer version. | Phase 2 |
| 2 | GitHub organisation name, and an **empty private repo** called `heartwell` (no README) | Phase 3 |
| 3 | Being in hPanel (hosting account) for about 15 minutes to create the two Node.js apps with my step-by-step instructions | Phase 18B (moved from Phase 3: Vercel hosts the build) |
| 4 | ~~A staging password~~ Not needed: the preview is open to anyone with the link (your choice) | — |
| 5 | Supabase: a "Heartwell" organisation with two projects (`heartwell-prod`, `heartwell-staging`, London region) in the Supabase account connected to Claude, and the Pro/free decision (D2) | Phase 4 |
| 6 | Email address(es) of everyone who logs into the admin | Phase 4 |
| 7 | ~~Cloudinary API key and secret~~ Not needed: images are copied with the Cloudinary tools already connected | — |
| 8 | What the "Leather" recliners actually are (D9). Range names: decided, keep (D4) | Phase 17C |
| 9 | SMTP password for `enquiries@heartwellsofa.co.uk`; create the alias `orders@heartwellsofa.co.uk`; which inbox gets shop notifications; an optional personal inbox for copies of everything | Phase 10 |
| 10 | A postcode-to-address lookup key for Heartwell (Homedata, as the sister uses, or Ideal Postcodes / getAddress.io) | Phase 10 |
| 11 | **Customer phone number** (shown on the site, click-to-call) | Phase 10 |
| 12 | **WhatsApp Business number** (a UK mobile) | Phase 10 |
| 13 | OrderFlow: the ingest URL and a **new key for Heartwell**, and whether OrderFlow can display a shop/brand field (else the HW- prefix is the tag) | Phase 17 |
| 14 | Meta: Business portfolio, Facebook Page, Instagram account, ad account; **Pixel/dataset ID**; a **Conversions API access token** (system user); a test event code | Phase 14 |
| 15 | GA4: Measurement ID and a Measurement Protocol API secret | Phase 14 |
| 16 | Commerce Manager catalogue created (my steps) | Phase 15 |
| 17 | The Heartwell offer code name (e.g. HEARTWELL20) and whether the automatic ad-visitor offer runs at launch (D6) | Phase 15 |
| 18 | **Visit us** address, opening hours, appointment rules, and photos or videos of the premises | Phase 16 |
| 19 | Legal trading details: company name, company number, registered office, VAT number (if registered), and whether Heartwell is a trading name of an existing company | Phase 16 |
| 20 | Social profile links (Facebook, Instagram, TikTok if any) | Phase 16 |
| 21 | UptimeRobot (free) account, if you approve D8 | Phase 17 |
| 22 | Both Hostinger accounts available for about an hour | Phase 19 |
| 23 | **Original photos of the Lily range** (7 pieces, 23 colourways): they're missing from the source library, so the import has none. Supplier or studio photos, any background | Phase 17A |

---

## 10. Decisions for you (with my recommendations)

| # | Decision | My recommendation |
| --- | --- | --- |
| D1 | Purchase to Meta: **automatic** 30 min after confirmation (with Hold / Send now), or manual like the sister shop | **Automatic.** Faster learning for Meta, nothing forgotten, still protected by the hold window and test flags. |
| D2 | Supabase production plan | **Pro ($25/month).** Free projects pause when idle and have no daily backups. Staging can stay free. |
| D3 | Photo direction | **AI room scenes for every main photo** (updated after the design-phase test: the cut-out method fails on these images). Budget: two free months, or one month of Cloudinary Plus. |
| D4 | Range names (Verona, Lily, …): keep, or give Heartwell its own names | **Decided 4 October 2026: keep.** They're the design names customers across the UK know. The title style is refreshed in Phase 17C. |
| D5 | Logo wording and colours | Drop "SOFA" under the name (Heartwell will sell dining, wardrobes and beds), or use "FURNITURE". The concept's cream and caramel are close to the sister's cream and amber, which the brief rules out; we'll settle this in the design phase. |
| D6 | Offers at launch | **Yes:** a Heartwell code plus the automatic ad-visitor offer, same tiers (£50 / £30 / £20). It gives ads a reason to act now, honestly. |
| D7 | Customer accounts | **Drop** (see section 4). |
| D8 | External uptime monitor (UptimeRobot, free) | **Yes.** It's the only alert that still works when email is the thing that broke. |
| D9 | "Leather" recliners | Confirm with the supplier: genuine, bonded or PU. We describe them accordingly; mis-describing leather is a Trading Standards issue. |
| D10 | IP address and user agent on server Purchase events for visitors who declined cookies | The sister shop sends them for every order. I recommend sending them only with consent, keeping hashed contact details for everyone (disclosed in the privacy notice under legitimate interests). It costs a little match quality and is the safer reading of the ICO's April 2026 guidance. Worth a quick check with your adviser. |
| D11 | Later phases (AI assistant, build-your-own sofa, WhatsApp automation, push notifications) | After launch, in the order in section 11. |

---

## 11. The phases

**Order (updated 4 October 2026):** 1–5, 8–17, 17A–17C, 18, 18B, 19. The whole site is built on the imported catalogue first; photos and catalogue words come once it's finished.

Each phase gives the goal, what gets built, what to prepare, **the exact prompt**, how to test on your phone and what "done" means. Text in `<angle brackets>` is filled in by you.

### Phase 1 — Study and plan (Steps 1–2) ✅ approved 3 October 2026

- **Done means:** you approve this plan (changes welcome).
- **Prompt to approve:** `Plan approved.` (or `Plan approved with these changes: …`)

---

### Phase 2 — Design (Step 3)

- **Goal:** an approved customer-facing design: colours, typography, spacing, buttons and forms, product cards, page layouts, photography and icon style, and motion.
- **What happens:** I ask for your design instructions and logo idea. I propose 2–3 distinct directions (short visual boards), then build your chosen one as a **private preview page** (claude.ai link): a full **style guide**, a sample **home page** and a sample **product page** using real Heartwell catalogue data, designed for phones first. We iterate until you approve. Output: `docs/DESIGN.md` plus a design-token file. These are design specs, not application code.
- **Rules:** nothing like the sister shop (no warm cream backgrounds, no amber accent, no Fraunces or Geist, none of its components, layouts or motion effects); not a generic AI template; fast; accessible (WCAG 2.2 AA contrast and touch targets).
- **Prepare:** design instructions, a few sites you like or dislike, the logo idea.
- **Prompt:**
  ```
  Phase 2 — Design. Read CLAUDE.md, docs/PLAN.md and docs/PROGRESS.md, then ask me for my design instructions and logo idea before designing anything.
  ```
- **Phone test:** open the preview link on your phone. Also send it to yourself in an Instagram DM and open it there, to see it inside the in-app browser. Check that text is easy to read, buttons are easy to hit with your thumb and it feels like a brand you'd trust.
- **Done means:** you approve the design in writing; `docs/DESIGN.md` is saved.

---

### Phase 3 — Foundations and the deployment pipeline

- **Goal:** the real project skeleton, live on staging, with the approved look.
- **Builds:** Next.js 16 project; design tokens, fonts and base components (buttons, inputs, selects, drawer, accordion, badges, price; dialog, toasts and skeletons arrive with the first phase that uses them); site shell (announcement bar, header, mobile menu, footer); home hero; config single sources (`site`, `contact`, `promises`, `brand`); security headers and CSP; error and 404 pages; `noindex` everywhere; `.env.example`; **sister-leak scanner** as pre-commit hook and in CI; GitHub Actions (type check, lint, tests, build); first push to GitHub; Vercel project connected to `staging` (preview) and `main` (production).
- **Prepare:** item 2 in section 9.
- **Prompt:**
  ```
  Phase 3 — Foundations. Read CLAUDE.md, docs/PLAN.md, docs/DESIGN.md and docs/PROGRESS.md, then build Phase 3. GitHub organisation: <org>. The empty private repo <org>/heartwell exists. Staging password: <password>. I'm logged into hPanel on the hosting account and ready to follow your steps.
  ```
- **Phone test:** open the staging link → the Heartwell shell (header, menu, footer) and home hero in the approved design; the menu opens and closes smoothly.
- **Done means:** a push to `staging` redeploys automatically; CI is green; the leak scan passes.

---

### Phase 4 — Database and core server logic

- **Goal:** both databases ready, with every business rule in place.
- **Builds:** migrations for the generalised catalogue (product types, category tree, ranges, products, variants, materials library), orders and order items (HW order numbers, test flag), `shop_settings` (delivery prices, date window, offer tiers), all order functions (`place_order`, `confirm_order`, `order_for_confirmation`, `track_order`, `place_manual_order`, `update_order_details`), offers, samples (limit of 5), reviews and stats, newsletter, attribution ledger, WhatsApp enquiries (`HW-WA-` references), basket-reminder leads, videos, `conversion_outbox`, `email_log`, job runs, the OrderFlow schema (switched off until configured); RLS policies and grants; Vault secrets; pg_cron schedule; generated types; Supabase clients; admin login and the `/admin` guard; an **admin Status page** (database, environment, email, jobs). Postcode policy and pricing ported, with tests (TypeScript and SQL must agree).
- **Prepare:** items 5 and 6.
- **Prompt:**
  ```
  Phase 4 — Database. Read CLAUDE.md, docs/PLAN.md and docs/PROGRESS.md, then build Phase 4. Supabase projects heartwell-prod and heartwell-staging exist (plan: <Pro/Free>). Admin emails: <emails>.
  ```
- **Phone test:** log in at staging `/admin` and open Status: database green; things not set up yet show amber with a plain-English reason.
- **As built (4 October 2026):** everything above, with two deliberate deferrals: Vault secrets and the cron jobs that call website endpoints arrive with those endpoints (Phases 13, 14, 17). Admin sign-in is Supabase email and password; the owner creates the account in the Supabase dashboard (no email set-up needed before Phase 10).
- **Done means:** both databases match the migrations in the repo; Supabase's security advisor shows no warnings; pricing and postcode tests pass.

---

### Phase 5 — Catalogue import (working data)

- **Goal:** the real catalogue on staging, so every page from Phase 8 on is built and tested against real sofas, sizes, prices and fabrics.
- **Update (4 October 2026):** the owner wants the whole site built first and the catalogue's look and words finished afterwards. New titles, descriptions and photos moved to Phases 17A–17C. Range names stay (D4): they're the design names customers know.
- **Builds:** the repeatable import script with every clean-up in section 2, **keyed on slugs and SKUs so re-running it updates rows in place** (IDs, URLs and order history stay stable); numeric dimensions; product types and the category tree; ranges (names kept); variants (SKUs unchanged); fabrics; offer tiers; the product, category and swatch originals copied into Heartwell's Cloudinary (`heartwell/source/`, untouched) and used as **temporary** photos; descriptions left empty (the sister's text is never imported; pages show the specifications until 17C); a read-only admin **Catalogue check** page. Staging only: production receives the finished catalogue in Phase 18B.
- **Prepare:** nothing.
- **Prompt:**
  ```
  Phase 5 — Catalogue import. Read CLAUDE.md, docs/PLAN.md and docs/PROGRESS.md, then build Phase 5.
  ```
- **Phone test:** open Admin → Catalogue check; scroll a few products: photo, price, sizes, dimensions and fabrics look right.
- **Done means:** 64 products, 105 variants and 70 fabrics on staging; re-running the import changes nothing; the leak scan finds no sister text or IDs; every image is served from Heartwell's Cloudinary.
- **Done (4 October 2026):** all of the above. One gap: the 23 Lily colourway photos don't exist in the source library any more (404), so the Lily range has no photos until item 23 arrives. How to re-run the import is in the README ("Catalogue").

---

### Phase 8 — Product page and basket

- **Goal:** the page every ad lands on, finished.
- **Builds:** the product page as designed (gallery, size/style switcher, colours, made-to-order fabric picker, samples entry, price and promises, inline postcode check, delivery window, will-it-fit, dimensions diagram, specs, care, delivery and returns, honest reviews block, other sizes, sticky add bar, WhatsApp ask); basket drawer and page (on the device); Saved items; Product JSON-LD (no fake ratings); social-share images; image and JavaScript budgets.
- **Prompt:**
  ```
  Phase 8 — Product page and basket. Read CLAUDE.md, docs/PLAN.md, docs/DESIGN.md and docs/PROGRESS.md, then build Phase 8.
  ```
- **Phone test:** open a product on staging (and again from an Instagram DM): switch sizes and colours, pick a fabric, check your postcode, add to basket, close the app, reopen, and the basket is still there.
- **Done means:** Lighthouse mobile performance ≥ 90 and accessibility ≥ 95 on the product page; it works in both in-app browsers.
- **As built (6 October 2026):** product pages live at `/products/<slug>`; ads and shared links open a colourway with `?variant=<SKU>` and a made-to-order fabric with `&fabric=<code>`, and every other parameter (utm_, fbclid) is left untouched for Phase 14. Lighthouse mobile on the preview: performance 94–98, accessibility 100 on four kinds of product page. Checkout and samples are built-in switches (`src/config/features.ts`), off until Phases 10 and 13. Delivery and returns details in the structured data are left for Phase 16, so nothing is claimed before the policies are final. Breadcrumbs point at `/sofas` and `/sofas/<category>`, which Phase 9 builds.

---

### Phase 9 — Home, categories, search and navigation

- **Goal:** everything else a shopper browses.
- **Builds:** home page (built for ad visitors and returning customers); category pages with type-driven filters and sort; range pages; search; the menu from the category tree; breadcrumbs; `sitemap.xml`, `robots.txt`, canonical rules; new category SEO copy; the Visit us page structure.
- **Prompt:**
  ```
  Phase 9 — Home, categories and search. Read CLAUDE.md, docs/PLAN.md, docs/DESIGN.md and docs/PROGRESS.md, then build Phase 9.
  ```
- **Phone test:** home → category → filter by size and price → product → back. Search "corner grey".
- **Done means:** every product and category is reachable; the sitemap validates; the pages meet the same speed and accessibility targets.
- **As built (6 October 2026):** departments live at `/<department>` and their categories at `/<department>/<category>`, read from the category tree, so a "Dining" department needs data only. Filters come from each product type's `filters` list, with live counts and shareable addresses (`?shape=corner&colour=grey&sort=price-asc`); filtered and sorted pages are noindex with a canonical to the plain page. Also built: range pages (`/ranges`, `/ranges/<range>`), `/search`, the fabric library (`/fabrics`), the menu and footer from the tree (search in the menu), `sitemap.xml`. Category copy is in the database (migration `category_copy`, fills empty fields only). The Visit us page and home section exist but stay hidden until the address is set (Phase 16). Lighthouse mobile: performance 91–96, accessibility 100 on home, a category, a range and search.

---

### Phase 10 — Checkout, orders and confirmation

- **Goal:** a customer can order, confirm and track.
- **Builds:** one-page mobile checkout (contact, postcode → address lookup, delivery extras with live totals, preferred date, offer code, notes, reminder opt-in); server action → `place_order` (server authority); non-mainland → WhatsApp quote path; success page; customer confirmation email with the confirm link; shop notification email (WhatsApp "ask to confirm" button + copy block); confirm-order page (button press) and "customer confirmed" email; track order (HW number + postcode); rate limits; plain-English errors.
- **Prepare:** items 9–12.
- **Prompt:**
  ```
  Phase 10 — Checkout and orders. Read CLAUDE.md, docs/PLAN.md, docs/DESIGN.md and docs/PROGRESS.md, then build Phase 10. SMTP password is set in the Vercel project (Preview). Shop notifications go to <email>; copies to <email or none>. Address lookup key: <provider, key set in Vercel>. Phone: <number>. WhatsApp: <number>.
  ```
- **Phone test:** place an order on staging with a mainland postcode and extras → receive both emails → tap Confirm → track the order. Try a Belfast postcode and you're routed to WhatsApp.
- **Done means:** totals always match the database; emails arrive in the inbox (not spam); non-mainland is routed correctly; staging orders are flagged as test.
- **As built (6 October 2026):** `/checkout` (one page), `/order/<id>` (placed), `/confirm-order/<id>` (confirms on the button only), `/track-order` (reference and postcode posted, never in the address). Totals shown come from `price_order` and `place_order` refuses any other figure. Address lookup works with Homedata, Ideal Postcodes or getAddress.io on the server (`ADDRESS_LOOKUP_PROVIDER`, `ADDRESS_LOOKUP_KEY`); without one, customers type the address and IV40/PA34 go to a quote. Emails are sent after the response (`after()`), each logged in `email_log`; outside production customer emails go to `EMAIL_TEST_INBOX`. Needs `SUPABASE_SECRET_KEY` and `SMTP_PASSWORD` in the hosting settings (the Status page turns red without them).

---

### Phase 11 — Admin: dashboard and orders

- **Goal:** the owner runs every order from a phone.
- **Builds (sister design, Heartwell branding):** dashboard (plus Health card shell); orders list, filters and search; status workflow with customer emails and WhatsApp prompts; edit order; delete (test orders); copy and print delivery note; take a WhatsApp order (with the HW-WA reference); attribution override; UK and Pakistan times; admin install manifest and icons.
- **Prompt:**
  ```
  Phase 11 — Admin orders. Read CLAUDE.md, docs/PLAN.md and docs/PROGRESS.md, then build Phase 11.
  ```
- **Phone test:** add the admin to your home screen; take the Phase 10 test order through every status; take a WhatsApp order by hand; print a delivery note.
- **Done means:** feature parity with the sister shop's orders admin.
- **As built (6 October 2026):** `/admin/orders` (needs attention by default; filters, counts, workload tiles, search, paging), `/admin/orders/<id>` (next step, WhatsApp message per status, customer status emails for confirmed, on its way, delivered and cancelled, timeline and history in UK and Pakistan time, copy block, edit, corrections with a reason, test flag, source override, notes, delete for test orders only), `/admin/orders/<id>/note` (printable delivery note), `/admin/orders/new` (WhatsApp or phone order with the HW-WA reference), dashboard with a Health card, installable admin (`/admin-manifest.webmanifest`). Better than the sister shop: one page per order instead of everything on one long list, search, notes, and real orders can't be deleted (cancel instead). Meta conversion buttons arrive with Phase 14; the review ask with Phase 13.

---

### Phase 12 — Admin: catalogue, settings and the rest

- **Goal:** the owner manages everything else, and new product types are routine.
- **Builds:** Inventory (generalised product form: type, range, sizes and styles, numeric dimensions, typed specs, variants, Cloudinary image picker, descriptions, SEO, active/featured); category tree; reviews moderation; samples queue; videos; leads; **Settings** (delivery prices, date window, offer code and tiers, tracking mode, test-order rules); `docs/ADDING-PRODUCT-TYPES.md`.
- **Prompt:**
  ```
  Phase 12 — Admin catalogue and settings. Read CLAUDE.md, docs/PLAN.md and docs/PROGRESS.md, then build Phase 12.
  ```
- **Phone test:** create a test "Coffee table" product (to prove the catalogue isn't sofa-only), change a price, see it on the site within a minute, then delete it.
- **Done means:** adding a new product type takes data entry, not code.

---

### Phase 13 — WhatsApp, samples, reviews and automation

- **Goal:** the lead and after-sale flows.
- **Builds:** WhatsApp buttons with HW-WA references and saved enquiries, plus reliable app hand-off from in-app browsers; samples (Fabrics guide page, Samples page, product dialog; 5 for £5); reviews (request email 3 days after delivery, signed guest links, reviews page, product reviews, structured data only from real reviews); newsletter double opt-in; basket reminders worked from Leads; contact form; pg_cron jobs live with last-run times on the Status page.
- **Prompt:**
  ```
  Phase 13 — WhatsApp, samples and reviews. Read CLAUDE.md, docs/PLAN.md, docs/DESIGN.md and docs/PROGRESS.md, then build Phase 13.
  ```
- **Phone test:** tap WhatsApp on a product (the message carries the reference); request samples; mark the test order delivered and trigger the review email; leave a review; approve it.
- **Done means:** every scheduled job shows a recent successful run.

---

### Phase 14 — Meta Pixel, Conversions API, GA4 and attribution

- **Goal:** complete, deduplicated, privacy-safe measurement.
- **Builds:** consent modal; GA4 with Consent Mode and URL redaction; the Pixel (production host + consent only); the event layer with shared IDs and the server mirror; advanced matching at checkout; first-party attribution (all visitors, opt-out; Meta IDs consent-only) saved on orders, enquiries, samples and leads; `conversion_outbox` with automatic/manual Purchase, OrderDelivered, retries and stored responses; the admin **Tracking** page; test-traffic rules (staging, test orders, staff-device exclusion, QA links); Meta test mode for staging; GA4 server-side purchase.
- **Prepare:** items 14 and 15.
- **Prompt:**
  ```
  Phase 14 — Meta and GA4 tracking. Read CLAUDE.md, docs/PLAN.md and docs/PROGRESS.md, then build Phase 14. Pixel ID: <id>. The CAPI token and test event code are set in the Vercel project. GA4 Measurement ID: <id>; its API secret is set in the Vercel project. Purchase sending: <automatic / manual>.
  ```
- **Phone test:** with Meta test mode on staging, browse, add to basket, check out, tap WhatsApp and confirm an order. In Events Manager → Test events, each event appears from both browser and server (deduplicated), and Purchase appears once after you confirm.
- **Done means:** every funnel event deduplicates; Purchase arrives exactly once; the Tracking page is green.

---

### Phase 15 — Meta catalogue, offers and ad landings

- **Goal:** catalogue ads and offers ready, landings tuned for ads.
- **Builds:** the Meta catalogue feed (IDs matching the Pixel, item groups, custom labels) with tests; offers (Heartwell code + ad-visitor offer, admin-editable tiers, offer strip); Admin → **Ad links** (tagged URLs per product and range, plus the recommended URL-parameter template for Meta ads); final in-app browser tweaks; the Google feed output kept dormant.
- **Prepare:** items 16 and 17.
- **Prompt:**
  ```
  Phase 15 — Catalogue feed and offers. Read CLAUDE.md, docs/PLAN.md and docs/PROGRESS.md, then build Phase 15. Offer code: <CODE>. Ad-visitor offer at launch: <yes / no>. I've created the catalogue in Commerce Manager.
  ```
- **Phone test:** Commerce Manager shows every item with the new photos and correct prices; open an ad-style link from an Instagram DM and the offer appears in the basket.
- **Done means:** the catalogue has no errors and the Pixel's content IDs match it.

---

### Phase 16 — Content, policies and trust pages

- **Goal:** every page a cautious first-time buyer checks.
- **Builds:** About, Visit us (address, hours, map, appointments), Contact, FAQ, Delivery & returns, Terms, Privacy (including the Conversions API, attribution and the new cookie rules), Cookies, Care guide, Size guide, Fabrics guide, 4–6 Guides articles, llms.txt, Organization/LocalBusiness structured data, footer legal details. All wording is Heartwell's own; promises come from the single sources.
- **Prepare:** items 18–20.
- **Prompt:**
  ```
  Phase 16 — Content and policies. Read CLAUDE.md, docs/PLAN.md, docs/DESIGN.md and docs/PROGRESS.md, then build Phase 16. Visit us: <address, hours, appointment rules>. Company: <legal name, number, registered office, VAT>. Socials: <links>.
  ```
- **Phone test:** read Delivery & returns and the FAQ as a customer would; tap every footer link.
- **Done means:** no placeholder text anywhere; the leak scan passes.

---

### Phase 17 — OrderFlow, monitoring and the Monday digest

- **Goal:** the back office connected, and nothing fails silently.
- **Builds:** OrderFlow push (HW-tagged, Vault URL/key, 15-minute re-send, failures logged and shown); Monday digest (confirmed orders and revenue by campaign/ad/WhatsApp, funnel, top landing pages); `/api/health`, alert emails, the Health card complete; UptimeRobot set-up steps; data-retention jobs.
- **Prepare:** items 13 and 21.
- **Prompt:**
  ```
  Phase 17 — OrderFlow and monitoring. Read CLAUDE.md, docs/PLAN.md and docs/PROGRESS.md, then build Phase 17. OrderFlow URL and Heartwell key: <set in the Vercel project / given here>. UptimeRobot: <yes / no>.
  ```
- **Phone test:** one clearly marked order appears in OrderFlow tagged Heartwell (then you delete it there); turning off a setting on staging makes the Health card go red and sends an alert.
- **Done means:** every integration reports its health.

---

### Phase 17A — Product photos: pilot (was Phase 6)

- **Goal:** lock the photo recipe so every range comes out in the same room.
- **Moved (4 October 2026):** after the site is built, at the owner's request.
- **Update (3 October 2026):** the direction was already tested in the design phase (AI room scenes won, see 6.3). This phase is now the pipeline and prompt-tuning step.
- **Builds:** the photo pipeline script; the room prompt tightened and tested on about 10 pieces covering every shape (corner, U-shape, 3+2, recliner, armchair, footstool, light and dark fabrics); the admin **Photos** page (original vs result, seed, regenerate, approve); a credit-usage readout from Cloudinary.
- **Prepare:** item 23 (Lily originals), so the pilot can include that range.
- **Prompt:**
  ```
  Phase 17A — Photo pilot. Read CLAUDE.md, docs/PLAN.md and docs/PROGRESS.md, then build Phase 17A.
  ```
- **Phone test:** open Admin → Photos, compare the versions, and reply with your choice and any changes (warmer, lighter floor, a different backdrop colour…).
- **Done means:** you've chosen the direction; the cost per image is confirmed from Cloudinary usage.

---

### Phase 17B — Product photos: full run and approval (was Phase 7)

- **Goal:** every live variant shows an approved Heartwell photo.
- **Builds:** the batch run in the chosen direction; new permanent assets in square and 4:5 crops; approve / regenerate / reject in Admin → Photos; approved photos linked to variants, products, ranges and categories.
- **Prepare:** 20–30 minutes on your phone to approve photos.
- **Prompt:**
  ```
  Phase 17B — Photo run. Read CLAUDE.md, docs/PLAN.md and docs/PROGRESS.md, then build Phase 17B. Direction chosen in Phase 17A: <A / B / mix, plus any notes>.
  ```
- **Phone test:** approve the batch in Admin → Photos; regenerate any you don't like.
- **Done means:** every active variant has an approved photo; the originals are untouched; credits stay within budget.

---

### Phase 17C — Catalogue content: titles, descriptions and SEO

- **Goal:** every product, range and category in Heartwell's own words, ready for launch.
- **Builds:** the restyled title format (range names kept, D4); **new descriptions, highlights and SEO titles and descriptions for 64 products, 16 ranges and every category**, written in Heartwell's voice with delivery wording from `src/config/promises.ts`; the leather wording settled (D9); everything editable in the admin. Updated in place, so product URLs and IDs don't change.
- **Prepare:** item 8 (what the "leather" recliners are).
- **Prompt:**
  ```
  Phase 17C — Catalogue content. Read CLAUDE.md, docs/PLAN.md and docs/PROGRESS.md, then build Phase 17C. The "Leather" recliners are: <genuine / bonded / PU / not sure>. Title style: <any preferences>.
  ```
- **Phone test:** open five products of different shapes: title, description and highlights read well and match the photos and specifications.
- **Done means:** no empty descriptions; the leak scan finds no sister text; every page has its own SEO title and description.

---

### Phase 18 — Quality pass

- **Goal:** fast, accessible, secure and clean before launch.
- **Does:** speed audit on key pages (Web Vitals, images, JavaScript); WCAG 2.2 AA audit; in-app browser checklist (Facebook and Instagram on iPhone and Android); security review (RLS audit, Supabase advisors, headers, rate limits, secrets); full sister-leak audit; end-to-end checkout test on staging; British English proofread. Everything found is fixed; findings saved in `docs/QA-REPORT.md`.
- **Prompt:**
  ```
  Phase 18 — Quality pass. Read CLAUDE.md, docs/PLAN.md and docs/PROGRESS.md, then run Phase 18.
  ```
- **Phone test:** the in-app browser checklist I give you (about 10 minutes).
- **Done means:** all targets met; no open issues rated high.

---

### Phase 18B — Move to Hostinger

- **Goal:** the shop runs on the hosting account before any ad money or real order touches it.
- **Does:** creates the Hostinger staging and production Node.js apps on `staging` and `main` (section 8.3); copies environment variables and sets production's `NEXT_PUBLIC_APP_ENV=production`; checks forwarded-header origins, pg_cron jobs and SMTP from Hostinger; copies the finished catalogue from staging into production (catalogue tables only, never test orders; not by re-running the reference import, which would bring back the old titles); full checkout test on Hostinger staging; production app ready on its temporary address for Phase 19. Vercel stays as a fallback.
- **Prepare:** item 3 in section 9.
- **Prompt:**
  ```
  Phase 18B — Move to Hostinger. Read CLAUDE.md, docs/PLAN.md and docs/PROGRESS.md, then run Phase 18B. I'm logged into hPanel on the hosting account and ready to follow your steps.
  ```
- **Phone test:** open the Hostinger staging address; place and confirm a test order; the admin Health card is green.
- **Done means:** both Hostinger apps redeploy on push, and staging on Hostinger behaves exactly as it did on Vercel.

---

### Phase 19 — Go-live

- **Goal:** Heartwell is live.
- **Does:** production settings; DNS steps (exact, by account); heartwellsofa.co.uk redirect with email untouched (verified before and after); SSL; Meta domain verification; catalogue feed switched to the live URL; Google Search Console and sitemap; Google Business Profile steps for the Visit us address; tracking switched live (test code removed); final smoke test; `SITE_INDEXABLE=true` on the live domain; the GitHub repository made private (Hostinger keeps deploying through its GitHub connection); launch checklist and rollback plan.
- **Prepare:** item 22.
- **Prompt:**
  ```
  Phase 19 — Go-live. Read CLAUDE.md, docs/PLAN.md and docs/PROGRESS.md, then run Phase 19. I'm logged into both Hostinger accounts (domains and hosting) and Meta Business settings.
  ```
- **Phone test:** visit heartwellfurniture.co.uk and heartwellsofa.co.uk (which redirects); send and receive an email on enquiries@; place and confirm one real low-risk order (then cancel it as test).
- **Done means:** the site is live, email still works, the first order flows end to end, and Meta shows live events.

---

### Later phases (after launch, one prompt each, in suggested order)

| # | Phase | What it adds |
| --- | --- | --- |
| L1 | AI shopping assistant | Answers questions from the live catalogue, delivery rules and policies (Claude Haiku 4.5, about a penny per question); hands over to WhatsApp. Needs Heartwell's own Anthropic API key. |
| L2 | Design-your-own sofa | The sister shop's `/build` configurator, in Heartwell's design. |
| L3 | WhatsApp automation | WhatsApp Business Platform (Cloud API) sends the confirm link and status updates automatically. Likely the biggest lift in confirmation rate and the biggest time-saver. Small cost per message; needs Meta set-up. |
| L4 | Admin push notifications | A phone notification for every new or confirmed order. |
| L5 | New departments | Dining sets, coffee tables, wardrobes, beds: product types, categories, delivery rules and size guides. |
| L6 | Google Ads + Merchant Center | Google feed output, Google conversions through the outbox, Consent Mode for ads. |
| L7 | Ad creative kit | Generates Meta ad images and carousels from the catalogue and the new photos. |
| L8 | Trustpilot | Heartwell profile, invitations, widgets once there are enough reviews. |

---

## 12. Running costs

| Service | Cost | Notes |
| --- | --- | --- |
| Vercel Hobby | Free | Hosts the build only (non-commercial); replaced by Hostinger in Phase 18B. |
| Hostinger Business (hosting account) | Already paid | Uses your 2 remaining Node.js slots from Phase 18B. |
| Supabase | $25/month for production (recommended), staging free | D2. |
| Cloudinary | Free plan (25 credits/month) | Photos ≈ 13–15 credits once; normal delivery well inside the plan at launch traffic. |
| Address lookup | Small, pay-per-use | Homedata or an alternative. |
| Meta, GA4, Search Console, UptimeRobot | Free | |
| Anthropic (L1), WhatsApp Cloud API (L3) | Pennies per use | Later. |

---

## 13. Risks and how we handle them

| Risk | Handling |
| --- | --- |
| Hostinger Business resources under an ad spike | Cached pages, Cloudinary images, small JavaScript; monitor; upgrade path to Cloud Startup with no code changes. |
| Only two app slots | Staging and production use both. A third project on this account would need an upgrade. |
| Vercel Hobby is for non-commercial use | Used only while we build, with staging settings and `noindex`; the move to Hostinger (Phase 18B) comes before ads or real orders. |
| Public repository until launch | Anyone can read the code and docs (including that Heartwell and the sister shop are related), and anything pushed stays in forks and caches even after the repo goes private. The leak and credential check runs before every commit, in CI and before every build; customer data never enters the repo; secrets live only in the host's environment variables. Made private in Phase 19. |
| In-app browser quirks | Phone-first testing in both apps every phase; no pop-ups, sign-ins or downloads. |
| Email from heartwellsofa.co.uk while the site is heartwellfurniture.co.uk | SPF, DKIM and DMARC checked on heartwellsofa.co.uk; one setting to move email to the main domain later (recommended once it's set up). |
| AI photos misrepresenting a product | Mandatory human approval; the furniture itself must be unchanged. |
| Duplicate content with the sister shop | Rewritten text, new photos, optional new range names (D4). |
| A new ad account's spend limits and learning phase | Purchase sent promptly (D1); Contact and Lead events available as interim optimisation signals. |
| Sister IDs slipping in | Leak scanner on every commit and in CI; `reference/` never committed. |
| Tracking or email silently failing | Outbox responses, email log, Health card, alert emails, UptimeRobot. |

---

## 14. Legal and compliance checklist

- **Consumer Contracts Regulations:** trader name, geographic address, email and phone before purchase; the 14-day cancellation right; the made-to-order exemption shown on those products and at checkout.
- **DMCC Act 2024:** no fake reviews (none carried over, none invented); total prices including mandatory charges; no fake urgency or countdown timers; honest "was/now" prices only.
- **Product claims:** "Made in the UK" only where `origin = uk`; leather wording per D9; photos represent the product.
- **PECR / Data (Use and Access) Act 2025:** consent for Meta and GA4 cookies with equal-weight choices; our own first-party statistics under the analytics exemption with a clear opt-out; details in Privacy and Cookies.
- **UK GDPR:** privacy notice covering the Conversions API (hashed data), attribution, OrderFlow, email and the delivery partner; retention (basket-reminder leads 90 days, attribution data limited); ICO fee paid by the trading company.
- **Company details:** if Heartwell is a trading name of a limited company, the company's name, number and registered office appear on the site and in emails.
- **Accessibility:** WCAG 2.2 AA.
