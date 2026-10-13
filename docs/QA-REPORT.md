# Heartwell: quality pass (Phase 18)

Run on 13 October 2026 against the one site, https://heartwellfurniture.vercel.app (pre-launch mode, demo catalogue), and the one database, heartwell-prod. Everything rated high or medium was fixed in this phase; what's left is listed at the end with who does it.

## Summary

| Area | Result |
| --- | --- |
| Security: database | **1 high, 2 medium found and fixed.** Visitors could read the order ID on approved reviews, and an order's ID opens its confirmation page with the customer's details. Fixed with column grants. |
| Security: website | Headers strong (CSP, HSTS, frame, referrer, permissions). Sign-in had no rate limit: fixed. No secrets in the code, the build or the git history. |
| Supabase advisors | Security: only "leaked password protection" (needs the Pro plan, D2). Performance: 34 "unused index" notes, expected on a shop with no traffic yet (they back foreign keys and reports); kept. |
| Sister-shop leaks | **None.** 623 files across the whole git history, 50 live pages (every sitemap page, the Meta feed, llms.txt, basket, checkout, login, tracking, 404) and every table visitors can read. |
| Speed | **Target met** on Google's PageSpeed Insights (mobile, slow 4G): product 98, home 96, category 90, accessibility 100, best practices 100. Five fixes; one idea tried and rejected. |
| Accessibility (WCAG 2.2 AA) | Lighthouse 100 on every page after fixes (two pages were 96). Manual checks for the 2.2 additions: 2 fixes. |
| British English | Every visible word on 50 pages, plus emails and admin text: no American spellings, no US dates or $. |
| Order flow | Checked end to end in the database (undone afterwards): prices, extras, offer code, confirm, refusals. The owner's own order HW-100101 went through the live site and into OrderFlow the same day. |

## Security

### Database (row level security and grants)

Every table has row level security on. Everything private (orders, customers, leads, logs) is readable by admins only. What visitors may read was audited table by table, then tested from outside with the public key, the way a stranger would.

| Finding | Severity | Fix |
| --- | --- | --- |
| `reviews.order_id` (and `is_test`) readable on approved reviews. With an order's ID, `order_for_confirmation` returns the customer's name, phone, email and address. No reviews are published yet, so nothing was exposed. | **High** | Visitors get only the review columns the site shows (migration `visitor_columns`). |
| Back-office names readable by visitors: `products.trade_title`, `ranges.trade_name`, `materials.supplier_title`, `material_collections.supplier` and `supplier_handle`. Empty in the demo, but they would carry warehouse and supplier names. | Medium | Visitors get every other column; these stay admin and OrderFlow only. |
| `track_order` (reference + postcode) callable straight from the database, skipping the website's limit of 15 tries per 10 minutes. References run in sequence, so guessing needs only a postcode. It never returns personal details. | Medium | Only the server key may call it; the website calls it after its rate limit. |
| Supabase allows anyone to create an account (`disable_signup` is off). Such an account isn't an admin and can't see anything private, but it shouldn't exist. | Medium | Defence added: signed-in accounts that aren't admins now read none of the five tables above. **Owner:** switch off sign-ups (below). |
| Legacy API keys (JWT `anon` and `service_role`) are still enabled; the site uses the new publishable and secret keys. | Low | **Owner, before go-live:** disable legacy keys once `SUPABASE_SECRET_KEY` in Vercel is confirmed to start `sb_secret_`. |

The storefront's own queries were re-run as a visitor after the change (product page, listing, Meta feed, fabrics, basket, reviews): all work. **Rule for later:** visitors read `products`, `ranges`, `materials`, `material_collections` and `reviews` through column grants, so a new column the shop must show needs `grant select (column) … to anon` in its migration (CLAUDE.md, Code and platform).

Also confirmed: admin-only functions refuse visitors (`permission denied`); `place_order` runs only with the server key; the browser never sends prices (a £1 order for a £549 sofa is refused with `PRICE_MISMATCH`).

### Website

- **Headers** on every page: Content-Security-Policy (no frames, no plugins, forms only to the site, images only from the site and Cloudinary), Strict-Transport-Security (2 years), `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, Permissions-Policy (no camera, microphone, location or Topics), `X-Robots-Tag: noindex` before launch. HTTP redirects to HTTPS.
- **Rate limits:** checkout, confirm, contact, samples, newsletter, review, track order, `/api/attribution`, `/api/offer`, `/api/track` and `/api/whatsapp-enquiry` were already limited. **Added:** sign-in, 10 tries per 15 minutes per device and per account (Supabase sees only the server's address, so it can't tell guessers apart).
- **Secrets:** only public values use `NEXT_PUBLIC_`. The built browser scripts contain no secret names or values. Every commit in the repository's history was scanned for credential formats: none.
- **For Phase 18B:** the limiter reads the visitor's address from `x-forwarded-for`. Vercel overwrites that header; check that Hostinger's proxy does too (or use the last hop), or a determined guesser could fake addresses.

## Sister-shop leak audit

Matched against the leak check's fingerprints (names, contacts, account IDs and the sister shop's product descriptions):

- **Git history:** 623 distinct files across all 50 commits, including deleted ones. Nothing from `reference/` was ever committed. Clean.
- **Live site:** all 43 sitemap pages plus the Meta feed, llms.txt, robots.txt, login, basket, checkout and track order. Clean.
- **Database:** products, categories, ranges, fabrics, colourways, product types and videos as visitors read them. Clean (demo catalogue).
- **Cloudinary:** the `heartwell/source` folders (the sister shop's original photos) are already empty. One file remains from the old import, `heartwell/import/catalogue-….json` (the sister shop's catalogue data). Its address is random and was never committed or linked, so it can't be found, but it has no further use: **owner deletes it** (below).
- **Home page:** the hero photo's description named a product range ("Malibu"); now it describes the photo only. The photo itself is the design-stage room scene and is replaced by the owner's own in Phase 17A.

## Speed

Targets (PLAN section 5): Lighthouse mobile performance 90 or more, accessibility 95 or more, largest paint under 2.5 s.

**Google's PageSpeed Insights** after the fixes (Lighthouse 13.5, emulated Moto G Power on slow 4G, 13 October 2026):

| Page | Performance | Largest paint | Blocking time | Layout shift | Accessibility |
| --- | --- | --- | --- | --- | --- |
| Product | **98** | 2.3 s | 20 ms | 0 | 100 |
| Home | **96** | 2.9 s | 50 ms | 0 | 100 |
| Category | **90** | 3.4 s | 0 ms | 0 | 100 |

Best practices 100 on all three; SEO 66–69 only because the pre-launch site asks search engines to stay away (it becomes 100 at go-live).

The two largest-paint figures over 2.5 s are within the score target and come from the test's slow 4G (1.6 Mbit/s, slower than real 4G): the home photo (41 KB) shares that bandwidth with the page's scripts, and on the category page the largest item is the introduction text, counted again when the brand font arrives and replaces the stand-in font. Switching the font to "optional" would hide that in the test, but first-time visitors from ads would often see a plain stand-in font, so it stays.

Before and after on this PC (Lighthouse 12.6, processor slowdown 1.8 to match Google's machines, since this PC benchmarks at about 560 against Google's 1,300; blocking times vary by ±150 ms between runs here):

| Page | Before (score · largest paint · CLS) | After |
| --- | --- | --- |
| Home | 77 · 4.1 s · 0 | 88 · 2.8 s · 0 |
| Product | 84 · 3.5 s · 0 | 83 · 3.2 s · 0 |
| Category | 89 · 3.2 s · 0 | 83 · 3.1 s · 0 |
| Checkout | 95 · 2.7 s · 0 (a first run measured a **0.28** shift) | 94 · 2.2 s · 0 |
| Delivery and returns | 97 · 2.3 s · 0 | 94 · 2.2 s · 0.047 |
| Visit us | — | 95 · 2.3 s · 0 |
| Basket | — | 86 · 2.4 s · 0 |

The 0.047 shift on text pages is the cookie banner growing by a line when the brand font replaces the stand-in font. It's well inside "good" (under 0.1), and showing the banner at first paint avoids it popping up under someone's thumb a moment later.

**Fixed:**

- **Cloudinary connection opened early** (`preconnect`): photos start a round trip sooner.
- **Heading font:** only Besley 700 is downloaded (the only weight the design uses), not the whole variable font.
- **Logos:** 1x, 2x and 3x files at the exact display sizes. The footer logo was 600 px wide for a 190 px slot (37 KB, now 9–35 KB by screen).
- **Cookie banner** is drawn by the server, so it appears at first paint instead of after the JavaScript (it was the largest element on text pages, painted late). A tiny script in `<head>` hides it before anything paints for people who have already answered, so it never flashes.
- **No jumping footer:** basket, checkout and saved pages keep a screen-tall space while they read the device (checkout's layout shift was 0.28; the limit is 0.1).

**Tried and rejected:** Next.js's `inlineCss`. It removes the stylesheet request, but Next 16.3 also copies the stylesheet twice into each page's React payload, so the home page grew from 18 KB to 57 KB (gzipped) to save one 13 KB request.

**What's left:** about 160 KB (gzipped) of JavaScript per page, of which roughly 110 KB is React and Next.js themselves; the shop's own code is about 50 KB (the 40 KB polyfill file is only for old browsers and modern phones skip it). Re-check with PageSpeed Insights after Phase 17A (real photos) and at go-live on Hostinger.

## Accessibility (WCAG 2.2 AA)

Lighthouse accessibility after the fixes: 100 on all seven pages measured (home, category, product, basket, checkout, Delivery and returns, Visit us) and in Google's runs. Before, Delivery and returns and Visit us were 96 (links shown only by colour).

Checked by hand, with the criteria new in WCAG 2.2:

| Criterion | Result |
| --- | --- |
| 1.4.1 Use of colour | **Fixed:** links in running text are underlined. |
| 2.4.7 Focus visible | One visible focus ring everywhere (white gap, velvet ring). |
| 2.4.11 Focus not obscured (new) | **Fixed:** the cookie banner and the product page's buy bar now reserve room at the end of the page and set scroll padding, so a focused link or field is never scrolled underneath them. The header doesn't stick. |
| 2.5.7 Dragging movements (new) | **Fixed:** on phones the photo gallery could only be swiped; its dots are now buttons, one tap per photo. Arrows on larger screens. |
| 2.5.8 Target size (new) | Buttons and icon buttons are 44 px or more; gallery dots 24 px; Lighthouse's target-size check passes. |
| Phone keyboard | The phone field opens a number keypad and offers the phone's saved number (`tel` type, input mode and autocomplete). |
| 3.2.6 Consistent help (new) | The phone number, email and Contact page are in the same places on every page (menu and footer). |
| 3.3.7 Redundant entry (new) | Checkout never asks for anything twice; the address search fills the address. |
| 3.3.8 Accessible authentication (new) | Sign-in is email and password with no puzzle; password managers and paste work. |
| Reduced motion | Animations and smooth scrolling are switched off for people who ask for less motion. |
| Language, headings, labels, alt text | `lang="en-GB"`; one H1 per page; every field labelled; photos described. |

## Order flow (end to end)

Run inside the database and rolled back (nothing kept, queued or sent):

- 2 × Sample Velvet 3 Seater (£549), second floor without a lift, assembly, code HEARTSOFA: items £1,098, upstairs £30, assembly £20, discount £20, **total £1,128**, matching the checkout's own sum. Status `pending_cod`, a test order.
- Confirming twice: one confirmation, timestamp stamped once.
- Purchase events for a test order: built for the outbox, and the sender only ever sends them as Meta *test* events or a dry run, never a real purchase.
- An Orkney postcode (KW15) is refused for online checkout (`NOT_MAINLAND`), so it goes to a WhatsApp quote.
- A price sent from the browser that doesn't match the database (£1) is refused.
- Status changes need an admin (`NOT_AUTHORISED` for anyone else).

On the live site, the owner's order HW-100101 (13 October) was placed, confirmed by the customer button, and accepted by OrderFlow.

## In-app browser checklist (owner, about 10 minutes)

On your phone, send yourself this link in **Facebook Messenger**, then tap it (it opens in Facebook's own browser). Then do the same from an **Instagram** direct message.

`https://heartwellfurniture.vercel.app/?utm_source=facebook&utm_medium=paid_social&utm_campaign=qa-check`

1. The page and the hero photo appear quickly; the cookie question is at the bottom straight away. Tap **Reject all**, then reload: it doesn't come back.
2. Open the menu, pick a category, then use the phone's back gesture: you're back where you were.
3. Open a sofa. Swipe the photos, then tap the small dots under them: each dot shows its photo.
4. The gold offer line says how much is off and its end date (you came from an "ad" link).
5. Scroll down: the bar with **Add to basket** slides up and doesn't cover the bottom of the page. Add the sofa.
6. Basket → **Checkout**: tap Name, Phone and Email. The phone offers to fill them, and Phone shows a number keypad.
7. Type a postcode and pick the address. Place the order with your own details. The confirm page opens; tap the confirm button. The confirmation email arrives at heartwellsofa@gmail.com.
8. Tap **WhatsApp**: WhatsApp opens with a message ready. Tap the phone number: the dialler opens.
9. From the in-app browser's menu, choose **Open in Safari / Chrome**: the same page opens and the offer line is still there.
10. Turn the phone sideways: nothing is cut off. Make the phone's text size larger: everything still fits.

Anything odd: a screenshot and the step number is all I need.

## Left for the owner

| What | Why | Where |
| --- | --- | --- |
| **Switch off sign-ups** (now) | Anyone can create an account on the shop's database. It sees nothing private, but there's no reason to allow it. | Supabase → heartwell-prod → Authentication → Sign In / Providers → **Allow new users to sign up**: off → Save. |
| Delete the old import file (now) | Last copy of the sister shop's catalogue data. | Cloudinary → Media Library → search `catalogue-` → the `.json` file in `heartwell/import` → Delete. The empty `heartwell/source` folders can go too. |
| Disable legacy API keys (before go-live) | Unused old keys that never expire. | First check Vercel's `SUPABASE_SECRET_KEY` starts `sb_secret_`; then Supabase → Settings → API Keys → Legacy API keys → Disable. If the Status page then shows a key problem, re-enable and tell me. |
| Leaked password protection (with Pro) | Stops passwords known from breaches. Needs the Supabase Pro plan (D2). | Supabase → Authentication → Attack Protection. |
