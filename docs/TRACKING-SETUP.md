# Connecting Meta and Google

The website's tracking is built and running as a **dry run**: every event is built exactly as it would be sent and shown in **Admin → Tracking**, but nothing reaches Meta or Google. Connecting the accounts means creating a few things in Meta and Google, putting five values into the hosting settings, and switching the mode.

When you're ready, say so and we'll go through this together, screen by screen (Meta's and Google's menus change often, so the exact clicks are checked on the day).

## What the site already does

| What | How |
| --- | --- |
| Cookie question | A bar at the bottom with equal **Reject all** / **Accept all**, and **Choose what to allow**. "Cookie settings" in the footer reopens it. |
| Meta Pixel | Loads only on heartwellsofa.co.uk with `NEXT_PUBLIC_APP_ENV=production`, after **Accept**, never on order, confirmation, tracking, review or newsletter pages. |
| Conversions API (server) | A copy of every browser event with the same event ID (Meta counts it once), for visitors who accepted. |
| Events | PageView, ViewContent (each colour viewed), AddToCart, InitiateCheckout, Contact (WhatsApp or phone tap), Lead (samples, basket reminder), OrderPlaced (custom). |
| Purchase | From the server only, when the customer **confirms**, once per order, 30 minutes later (Send now / Hold / Don't send in Admin → Tracking). Value = the database's total including delivery extras. OrderDelivered follows on delivery. |
| Customer details | Hashed email, phone, name, postcode and our visitor ID on server events. IP address, browser and Meta's cookies only for customers who accepted (decision D10). Never order numbers, links or raw postcodes. |
| GA4 | Consent Mode (no cookies until accepted), addresses redacted; purchases sent from the server so revenue matches the database. |
| Never counts | The site before go-live, test orders, `?qa=1` visits, and devices excluded in Admin → Tracking → This device. |
| Your own record | Campaign tags (utm_), landing page and referring site on every order, WhatsApp enquiry and lead, for every visitor unless they switch it off. |

## What you'll create

**Meta** (business.facebook.com):

1. A **Business portfolio** for Heartwell, with the Heartwell **Facebook Page**, **Instagram account** and an **ad account** (card on file).
2. A **dataset** (Pixel) in Events Manager. Its ID is the Pixel ID.
3. A **Conversions API access token** for that dataset (Events Manager → the dataset → Settings → Conversions API → Generate access token).
4. A **test event code** (Events Manager → the dataset → Test events), for checking before going live.
5. Later, at go-live: **domain verification** for heartwellsofa.co.uk (one DNS record, Phase 19).

**Google** (analytics.google.com):

1. A **GA4 property** for Heartwell (UK, GBP) with a **web data stream** for heartwellsofa.co.uk. Its **Measurement ID** starts G-.
2. A **Measurement Protocol API secret** on that stream.

## Where each value goes

All in Hostinger → the heartwellsofa.co.uk Node.js app → Environment variables, then redeploy (`NEXT_PUBLIC_` values are built into the pages, so they only take effect after a redeploy). The Meta values went in at go-live (16 October 2026); the GA4 steps are below.

| Name | What | Sensitive? |
| --- | --- | --- |
| `NEXT_PUBLIC_META_PIXEL_ID` | The dataset (Pixel) ID, digits only | No (it's public in every page) |
| `META_CAPI_ACCESS_TOKEN` | The Conversions API token | **Yes** |
| `META_TEST_EVENT_CODE` | The test event code, e.g. TEST12345 | Yes |
| `NEXT_PUBLIC_GA4_MEASUREMENT_ID` | G-XXXXXXXXXX | No |
| `GA4_API_SECRET` | The Measurement Protocol secret | **Yes** |

Admin → Tracking then shows a tick for each one (never the values).

## Switching on, in order

1. **Dry run** (now): check Admin → Tracking → Recent events after browsing the site with cookies accepted.
2. **Test**, before go-live: set the mode to **Test**. Server events and test-order Purchases appear in Events Manager → **Test events**; GA4 purchases go to Google's checker. Nothing counts.
3. **At go-live** (Phase 19, on heartwellsofa.co.uk with `NEXT_PUBLIC_APP_ENV=production`): stay on **Test** and browse the live site through Events Manager's test link. Each event should show from both **Browser** and **Server**, deduplicated. Then switch to **Live**.
4. **In your ads**: use a link from the admin's **Ad links** page as the website address, and paste the URL parameters from the same page into every ad, so every sale shows its campaign and ad in the admin and ad visitors get the ad offer.

## GA4, step by step (17 October 2026)

The site's code and Content Security Policy are ready; GA4 only needs its two values. Use the same Google account as Search Console.

1. **analytics.google.com → Start measuring** (or Admin → Create → Account). Account name **Heartwell**. Data sharing: leave only "Technical support" ticked.
2. **Property:** name **Heartwell**, reporting time zone **United Kingdom**, currency **British pound (£)**.
3. **Business details:** industry **Home & garden**, size **Small**. **Objectives:** "Drive online sales" and "Generate leads". Accept the terms with **United Kingdom** and tick the data processing terms.
4. **Data collection → Web:** URL `https://heartwellsofa.co.uk`, stream name **Heartwell website**. Open **Enhanced measurement**'s settings (the gear): open **Page views → Show advanced settings** and **untick "Page changes based on browser history events"** (the site sends its own page views with private addresses removed); turn **Form interactions** off; leave Scrolls, Outbound clicks and Site search on (search parameter `q`, the default). Create the stream.
5. **Measurement ID:** on the stream's page, copy the ID starting **G-**.
6. **API secret:** same page → **Measurement Protocol API secrets** → accept the terms if asked → **Create**, nickname **Heartwell server** → copy the **Secret value**.
7. **Hostinger:** the Node.js app → Environment variables → add `NEXT_PUBLIC_GA4_MEASUREMENT_ID` (the G- ID) and `GA4_API_SECRET` (the secret) → save → **redeploy**.
8. **Check:** Admin → Tracking shows a tick for both. On a phone that isn't excluded in Admin → Tracking → This device, open the site, tap **Accept all** and browse: GA4 → Reports → **Realtime** shows the visit within a minute.
9. **Settings once it works:** Admin → Data collection and modification → **Data retention** → 14 months. Leave **Google signals** off (only needed for Google Ads). Admin → Product links → **Search Console links** → link heartwellsofa.co.uk to the web stream, then Reports → Library → publish the Search Console collection.
10. **Key events** (a day after the first ones arrive): Admin → Data display → Key events → New key event: `order_placed`, `generate_lead`, `contact`. `purchase` is one already; it comes from the server when a customer confirms, so GA4 revenue matches the admin.

GA4 only counts visitors who accept cookies (Consent Mode estimates some of the rest). The admin's own visit statistics count everyone.

## The catalogue (for catalogue ads)

The feed is built and waiting: **Admin → Ad links** shows its address (`https://heartwellsofa.co.uk/feeds/meta-catalogue.xml` once live), how many items it holds, which colours are left out for want of a photo, and when Meta last fetched it.

1. In **Commerce Manager** (business.facebook.com/commerce), create a catalogue for Heartwell (type: e-commerce, products uploaded by you).
2. **Data sources → Data feed → scheduled feed**: paste the feed address, repeat **hourly**, currency GBP.
3. **Connect the dataset (Pixel)** to the catalogue, so Meta matches views, baskets and purchases to items. The IDs already match: each item's ID is the colourway ID the Pixel sends.
4. **Sets**: make product sets from the labels (range, made to order, price band, offer tier, type; listed on Ad links), e.g. "Corner sofas" or "Offer high".
5. Check **Issues** in Commerce Manager after the first fetch; the admin's Status page turns green once Meta fetches the feed.

Do this on the live domain (Phase 19), so the catalogue's links point at heartwellsofa.co.uk.
