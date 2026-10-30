# Heartwell: whole-site audit (31 October 2026)

The owner asked for an audit of the whole site (design, search, speed and everything else), done step by step, with the site at its best on phones and for ads, above all the product pages. This is what I found on the live site and in the code, and the fixes in order, one prompt each.

## How I checked

- **The live site on a phone screen** (375 × 812, the built-in browser's phone mode), as a test visit (`?qa=1`, so nothing counted): home, corner sofas, the Ashton 5 seater corner product page as a normal visitor and as a Facebook ad visitor (`utm_source=facebook&utm_medium=paid_social`), the added-to-basket sheet, checkout (not submitted), the menu.
- **Google PageSpeed Insights** (mobile, Slow 4G, the real scoring) on the product page, a category page and the home page.
- **A crawl of all 129 pages in the sitemap**: status, titles, descriptions, headings, canonical links, structured data, redirects, 404s, caching headers, page and script sizes.
- **Meta**: the catalogue's diagnostics, the dataset's events and match quality, and which ad accounts exist (Meta connector).
- **The code** behind the product page, gallery, sticky buy bar, cookie banner, checkout, structured data and tracking.

## Scorecard

| Area | Verdict | In one line |
| --- | --- | --- |
| Speed (lab) | Strong | Mobile PageSpeed: product 98, corner sofas 97, home 99. Largest paint 2.0 s, layout shift 0.02. |
| Accessibility | Strong | 100 on product and category pages, 97 on home (one link). |
| Technical search | Strong | All 129 pages answer 200, one canonical each, no duplicate titles, structured data on every key page, redirects and 404s right. |
| Product page on a phone | **Needs work (biggest lift for ads)** | Name and price fall below the first screen in Instagram's browser; the basket button is two screens down; one photo per colour. |
| Search words on product pages | Needs work | 75 product titles and headings never say "sofa". |
| Listings | Small fixes | The first corner sofa tile reads pink; the same label on every tile. |
| Checkout on a phone | One owner step | The address finder is built but switched off, so people type their whole address. |
| Ads set-up (Meta) | Waiting on the owner | Catalogue clean (0 issues), events arriving, but still no Heartwell ad account. |
| Speed under ad traffic | Should improve | Product and category pages are built fresh for every visit; nothing caches them. |
| Trust | Honest, thin | No reviews yet (honest empty state), no close-up photos, but strong pay-on-delivery promise. |

## 1. The product page on a phone (the ad landing)

This is where every catalogue ad lands, nearly always inside the Facebook or Instagram app.

**What a phone shows first** (375 × 812, measured on the live page):

| Element | Top of it | Notes |
| --- | --- | --- |
| Announcement bar | 0 px | 58 px: "Free delivery to most postcodes. Pay nothing until it arrives." wraps to two lines |
| Header | 59 px | 61 px |
| Velvet photo stage | 120 px | 420 px: breadcrumb, the arch, the colour plate |
| Name ("Ashton") | 593 px | |
| Price (£749) | 674 px | |
| "To pay today £0" | 739 px for an ad visitor; about 920 px for other first visits | for other visitors it sits below the welcome offer panel (about 180 px) |
| **Add to basket** | **1,591 px** (first visit) | two screens down |
| Cookie banner (first visit) | covers 581–812 px | 231 px, 28% of the screen, over the name and price |

Instagram's in-app browser on an iPhone shows about 660 px of page, so an ad visitor sees the photo and the cookie question, not the name, the price or "£0 today". The sticky buy bar only appears after scrolling **past** the basket button, so for the first two screens there is nothing to tap to buy.

Findings, most important first:

1. **Name, price and "£0 to pay today" aren't on the first screen** (P1). The stage is tall (breadcrumb, arch padding, plate) and the announcement bar takes two lines. Fix: a tighter stage on phones (breadcrumb smaller or after the heading, less padding round the arch, the plate inside the arch), a one-line announcement, so the name, price and "Pay nothing today" sit on the first screen at 375 × 667.
2. **No buy button until 1,591 px** (P1). Show the sticky bar (price, "£0 today", Add to basket) whenever the main button is off screen, above or below, not only after passing it.
3. **The floating WhatsApp button covers controls** (P1): on phones it sits over the postcode "Check" button and the right-hand size card. The product page already has "Ask about this sofa on WhatsApp"; put a WhatsApp icon in the sticky bar on product pages instead of the floating button.
4. **No delivery dates by the price** (P2). The site knows the real window ("Tue 3 – Thu 5 November" on home and checkout) but the product page says only "Free delivery for most postcodes". A line under the price, "Order today, usually with you Tue 3 – Thu 5 November", is true and is what people from ads want to know.
5. **The welcome offer panel is large** (P2): about 180 px between the price and the options. Keep the real countdown but make it one compact row ("£20 off this sofa, 47 h 59 min left, taken off at checkout"), so the receipt and options move up.
6. **One photo per colour, no zoom** (P1 for trust). 107 of the 121 catalogue items have a single photo, and the sofa fills only part of it (the alcove, wall and floor take the rest). There is no tap-to-enlarge. The social-post builder already measured three close-ups per range on the owner's 1,254 px photos (`design/social/products/copy.mjs`, `details`): those crops, the fabric's own swatch photo and the drawn top view can become extra gallery photos without a photo shoot, plus a full-screen view to pinch and zoom.
7. **The cookie banner is tall** (P2): 231 px on every first visit. It's fair (Reject and Accept look the same, as the ICO expects) and should stay that way, but one short sentence with the three choices tighter would cover about half as much. Marketing consent decides how much Meta learns from the site, so the banner matters for ads too.
8. **Reviews**: the honest empty state is right. The review request email after delivery exists (`reviewRequestEmail`); the first real reviews are the next trust step, plus asking delivered customers for a Google review (owner).

What already works well on the product page: the receipt ("To pay today £0 / To pay on delivery £729"), the ad offer and welcome offer taken off the price on the page, honest was-prices, sizes drawn to scale, the door check, questions answered from live data, "Go to checkout" straight from the added sheet, the WhatsApp message naming the piece and colour, and the ad's colour (`?variant=`) opening first.

## 2. Speed

- **Lab scores (PageSpeed Insights, mobile):** product 98 (LCP 2.0 s, blocking 80 ms, CLS 0.019), corner sofas 97 (LCP 2.0 s, blocking 150 ms), home 99 (LCP 2.0 s, blocking 40 ms). Best Practices and SEO 100 on all three.
- **No real-visitor data yet**: Chrome needs more visits before PageSpeed shows field data. Part of the search results check.
- **Page weight:** about 210 KB of scripts compressed (most of it React and Next.js), one 16.5 KB stylesheet, the main photo preloaded at the right size. Nothing to chase here.
- **Product and category pages are built for every visit** (P2): they read `?variant=` and the filters on the server, so they answer `no-store` and Hostinger's CDN can't cache them (about 0.25 s of server time each, `x-hcdn-upstream-rt`). Home, range and guide pages are already prerendered (`x-nextjs-cache: HIT`). Caching the product and category pages (the variant and filters read in the browser, or the variant routed to a cached page) makes the ad landing faster and protects the one Hostinger app when an ad sends many people at once.
- Small: "legacy JavaScript" 12 KB (an older browser target), the stylesheet blocks rendering for about 200 ms (left as is: inlining CSS tripled the page size when tried).

## 3. Search (SEO)

- **Technical health is good:** all 129 sitemap pages answer 200; http and www redirect to https://heartwellsofa.co.uk; a slash at the end redirects; unknown pages answer 404; ad and click parameters keep the clean canonical; no duplicate titles or descriptions; `ProductGroup` with offers on every product, `FAQPage` on categories and ranges, `Article` on guides, `FurnitureStore` on Visit us, `OnlineStore` and `WebSite` on home. robots.txt keeps crawlers off private pages and `?_rsc=`.
- **Product titles and headings never say "sofa"** (P1 for search): "Ashton 5 Seater Corner High Back | Heartwell" (34–49 characters, room for more). People search "ashton corner sofa", "grey velvet corner sofa". Better: "Ashton 5 Seater Corner Sofa, High Back, Grey Plush Velvet | Heartwell", built from the piece's own data (type, size, back, cover), with the H1's second line saying "5 seater corner sofa, high back". One title is too long (the Verona family set, 74 characters).
- **Home page:** one link ("see the areas" in the delivery section) is told apart by colour only (the accessibility 97).
- Product pages share as `og:type` website; `product` with the price helps Facebook and Pinterest previews (small).
- Indexing, Merchant Center and Bing are in the planned search results check (from 1 November) and the owner steps below.

## 4. Listings (category, range, search)

- **The first corner sofa is pink-looking** (P2): Hannah Electric's tile shows its "Beige" colourway, whose photo reads pink (the owner's no-pink rule). Tiles should lead with a colourway that passes the showcase rule (`isShowcaseColour`) when the piece has one.
- **"Made to order" on almost every tile** (P3): when nearly everything is made to order the label says nothing. Labels that differ help choosing: electric recliner, a deal, ready made.
- The sofa is small inside each tile's arch (the alcove and floor take most of the photo). Worth trying a slightly closer crop on tiles and the product stage, so the furniture fills more of the frame while the alcove still shows.

## 5. Basket and checkout

- Works well: "Go to checkout" from the added sheet, the same receipt everywhere, the offer line, autofill on name, phone, email and address, the phone keyboard for the phone number, the minimum-order note, a hidden spam trap that screen readers skip.
- **The address finder is off** (owner step, P1 for phones): the checkout's postcode-first address lookup is built (getAddress.io, Ideal Postcodes or Homedata) but no key is set in Hostinger, so people type every line by hand on a phone. A key (pennies a lookup) switches it on with no code change.

## 6. Ads and tracking (Meta)

- **Catalogue:** 121 items, 0 diagnostics; ad links carry the ad tags, so the ad offer applies. Only 14 items have extra photos (`additional_image_link`); the close-ups from step A2 can go in the feeds for carousel and collection ads.
- **Dataset:** events arrive from the browser and the server with one event ID. Match quality 6.1 out of 10 for page views, basket, checkout and WhatsApp taps; 4.4 for product views (no email or phone before checkout, as expected). Traffic is still very low (a few to 25 page views a day), so the site needs the ads and search to grow before anything can be measured.
- **Still no Heartwell ad account** (checked today): the accounts the owner's login reaches belong to the sister business, "UK Cheap Leather Sofas" or no business. Nothing can run until the owner creates one in the Heartwell Sofa business (`docs/META-ADS.md`, Stage 0).
- Feed fetch is daily; hourly keeps ad prices in step with the site (owner, in Commerce Manager).

## 7. Design, trust and the rules

- The velvet and gold look is distinctive and consistent, and nothing resembles the sister shop. The bold moments (the home gallery, the range gallery, the product stage) are good; on the product page the stage now costs too much height on phones (section 1).
- Security headers are strong (CSP, HSTS, frame and content-type protection).
- **To check with the owner:** made-to-order pieces are sold as exempt from the 14-day change-of-mind return. The exemption covers goods made to the customer's own specification; a sofa built in a colour or fabric from the shop's standard range may not count, and Google and Meta show "no returns". Worth a quick check with a consumer-law adviser before ads scale. Not changed (a business rule).

## The fixes, step by step

One prompt each, in this order. Each ends with did / need / check / next, as usual.

| Step | What it fixes | Why first |
| --- | --- | --- |
| **A1** | Product page first screen and buying on phones: tighter stage, name, price and "£0 today" on the first screen, sticky buy bar whenever the main button is off screen (with WhatsApp in it, no floating button there), delivery dates by the price, a compact welcome offer row, a smaller cookie banner | Every ad lands here |
| **A2** | Product photos: close-ups, the fabric swatch and the drawn top view as extra photos, full-screen zoom, the extra photos in the Meta and Google feeds | Trust, and better catalogue ads |
| **A3** | Search and listings: product titles and headings with "sofa" and the cover, `og:type` product, the home link, tile colourways by the showcase rule, useful tile labels | Search clicks and a cleaner shop |
| **A4** | Speed under ad traffic: product and category pages cached, the variant and filters read without making the page dynamic | Faster landings, safe under bursts |

The planned **search results check** (from 1 November) can run before or after A3; **Meta ads Stage 0** follows once the owner has the ad account.

Prompts:

```
Audit step A1. Read CLAUDE.md, docs/PLAN.md, docs/PROGRESS.md and docs/AUDIT.md, then build step A1 (the product page's first screen and buying on phones).
```

```
Audit step A2. Read CLAUDE.md, docs/PLAN.md, docs/PROGRESS.md and docs/AUDIT.md, then build step A2 (product photos: close-ups, zoom and the feeds).
```

```
Audit step A3. Read CLAUDE.md, docs/PLAN.md, docs/PROGRESS.md, docs/AUDIT.md and docs/KEYWORDS.md, then build step A3 (search titles and listings).
```

```
Audit step A4. Read CLAUDE.md, docs/PLAN.md, docs/PROGRESS.md and docs/AUDIT.md, then build step A4 (cache product and category pages).
```

## What only the owner can do

1. **Meta ad account** in the Heartwell Sofa business, with the dataset and catalogue assigned, Instagram connected and WhatsApp Business on 07460 669864 (`docs/META-ADS.md`, Stage 0). Then say "ad account ready".
2. **Address finder key**: sign up with getAddress.io or Ideal Postcodes, then in Hostinger add `ADDRESS_LOOKUP_PROVIDER` (`getaddress` or `ideal-postcodes`) and `ADDRESS_LOOKUP_KEY`, and redeploy.
3. **Still open from before:** the Merchant Center business address, Bing Webmaster Tools, letting GPTBot and Meta's AI crawler in on Hostinger, the feed fetch hourly in Commerce Manager.
4. **Reviews:** ask delivered customers for a Google review on the Business Profile as well as the site's own request.
5. **Returns on made-to-order pieces:** a quick check with an adviser (section 7).
