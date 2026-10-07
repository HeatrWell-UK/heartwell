# Connecting Meta and Google

The website's tracking is built and running as a **dry run**: every event is built exactly as it would be sent and shown in **Admin → Tracking**, but nothing reaches Meta or Google. Connecting the accounts means creating a few things in Meta and Google, putting five values into the hosting settings, and switching the mode.

When you're ready, say so and we'll go through this together, screen by screen (Meta's and Google's menus change often, so the exact clicks are checked on the day).

## What the site already does

| What | How |
| --- | --- |
| Cookie question | A bar at the bottom with equal **Reject all** / **Accept all**, and **Choose what to allow**. "Cookie settings" in the footer reopens it. |
| Meta Pixel | Loads only on heartwellfurniture.co.uk with `NEXT_PUBLIC_APP_ENV=production`, after **Accept**, never on order, confirmation, tracking, review or newsletter pages. |
| Conversions API (server) | A copy of every browser event with the same event ID (Meta counts it once), for visitors who accepted. |
| Events | PageView, ViewContent (each colour viewed), AddToCart, InitiateCheckout, Contact (WhatsApp or phone tap), Lead (samples, basket reminder), OrderPlaced (custom). |
| Purchase | From the server only, when the customer **confirms**, once per order, 30 minutes later (Send now / Hold / Don't send in Admin → Tracking). Value = the database's total including delivery extras. OrderDelivered follows on delivery. |
| Customer details | Hashed email, phone, name, postcode and our visitor ID on server events. IP address, browser and Meta's cookies only for customers who accepted (decision D10). Never order numbers, links or raw postcodes. |
| GA4 | Consent Mode (no cookies until accepted), addresses redacted; purchases sent from the server so revenue matches the database. |
| Never counts | Staging and previews, test orders, `?qa=1` visits, and devices excluded in Admin → Tracking → This device. |
| Your own record | Campaign tags (utm_), landing page and referring site on every order, WhatsApp enquiry and lead, for every visitor unless they switch it off. |

## What you'll create

**Meta** (business.facebook.com):

1. A **Business portfolio** for Heartwell, with the Heartwell **Facebook Page**, **Instagram account** and an **ad account** (card on file).
2. A **dataset** (Pixel) in Events Manager. Its ID is the Pixel ID.
3. A **Conversions API access token** for that dataset (Events Manager → the dataset → Settings → Conversions API → Generate access token).
4. A **test event code** (Events Manager → the dataset → Test events), for checking before going live.
5. Later, at go-live: **domain verification** for heartwellfurniture.co.uk (one DNS record, Phase 19).

**Google** (analytics.google.com):

1. A **GA4 property** for Heartwell (UK, GBP) with a **web data stream** for heartwellfurniture.co.uk. Its **Measurement ID** starts G-.
2. A **Measurement Protocol API secret** on that stream.

## Where each value goes

All in Vercel → the heartwell project → Settings → Environment Variables (and the same names on Hostinger after the move in Phase 18B). Tick **Production** and **Preview** for each, then redeploy.

| Name | What | Sensitive? |
| --- | --- | --- |
| `NEXT_PUBLIC_META_PIXEL_ID` | The dataset (Pixel) ID, digits only | No (it's public in every page) |
| `META_CAPI_ACCESS_TOKEN` | The Conversions API token | **Yes** |
| `META_TEST_EVENT_CODE` | The test event code, e.g. TEST12345 | Yes |
| `NEXT_PUBLIC_GA4_MEASUREMENT_ID` | G-XXXXXXXXXX | No |
| `GA4_API_SECRET` | The Measurement Protocol secret | **Yes** |

Admin → Tracking then shows a tick for each one (never the values).

## Switching on, in order

1. **Dry run** (now): check Admin → Tracking → Recent events after browsing staging with cookies accepted.
2. **Test**, on staging: set the mode to **Test**. Server events and test-order Purchases appear in Events Manager → **Test events**; GA4 purchases go to Google's checker. Nothing counts.
3. **At go-live** (Phase 19, on heartwellfurniture.co.uk with `NEXT_PUBLIC_APP_ENV=production`): stay on **Test** and browse the live site through Events Manager's test link. Each event should show from both **Browser** and **Server**, deduplicated. Then switch to **Live**.
4. **In your ads**: use the URL parameters the admin's **Ad links** page gives you (Phase 15), so every sale shows its campaign and ad in the admin.
