# Meta ads plan

Owner, 27 October 2026: start Meta ads now (this replaces the 17 October order "after organic searches"; search work carries on alongside). Written from a check of Heartwell's Meta set-up on 26 October 2026 (`docs/PROGRESS.md`) and what the website already does (`docs/TRACKING-SETUP.md`).

## Where things stand

| | Status |
| --- | --- |
| Business portfolio "Heartwell Sofa" | Ready (not business-verified; owner's choice, it isn't needed to advertise) |
| Facebook page "Heartwell Sofa" | Ready. Still to do: location Burnley (Google shows "Brimington"), new number 07460 669864, WhatsApp button |
| Dataset (Pixel + Conversions API) "Heartwell" | Live since 16 October: page views, product views, basket, checkout, WhatsApp taps, leads; **Purchase from the server when a customer confirms**, with hashed contact details, for every real order |
| Domain verification (heartwellsofa.co.uk) | Done at go-live (DNS TXT) |
| Catalogue "Heartwell Products" | 121 items (75 products), fetched daily from the site, 0 errors, connected to the dataset (100% product match) |
| Website for ad visitors | Ad links and URL parameters (Admin → Ad links); the ad offer (£50/£30/£20 by piece, 7 days) and the welcome offer (£20 off each piece, 48 hours); minimum order £399; WhatsApp button on every page; pay on delivery |
| **Ad account** | **Ready (2 November 2026):** the owner's own GBP, Europe/London account, moved into Heartwell Sofa, with a card; the Heartwell dataset assigned. Its two old campaigns (paused, from before Heartwell) stay paused. **Meta also offers it the sister shop's catalogue and even recommends it: always choose "Heartwell Products"** |
| **Instagram** | Ready: @heartwellsofa connected to the ad account |
| **Catalogue product sets** | Made 2 November: "Can be ordered alone (£399 and over)" 68 pieces, "Corner and U-shape sofas" 29, "Recliners (electric and manual)" 15, "3+2 sofa sets" 10 (all £399 and over; they follow price changes) |
| **Audiences** | "Page and Instagram engaged 365d" (120255172256190416). Terms accepted by the owner on 6 November 2026; website audiences made the same day: "Ordered 180d (exclude)" (120255252016240416, Purchase or OrderPlaced, excluded from both ad sets), "Website visitors 30d" (120255252016320416), "Viewed or added to basket 14d" (120255252016690416, for the follow-up ad set) |
| **Ads** | **Published 6 November 2026 (owner: "Yes, publish it"): the whole campaign, both ad sets and all 13 ads.** R1–R4 and R6 went live first; R5, V1 and the collection ad set (C1–C6) followed the same day after two fixes, found when the owner pressed Publish in Ads Manager: the connector had given the videos and carousel cards both an image link and an image hash (Meta's publish rejects that: rebuilt with the hash only, and each carousel card's button now opens its own page), and Meta now wants a catalogue product set on the ad, not the ad set (taken off the collection ad set; C6 carries it). Campaign "Heartwell \| Sales \| Website \| Nov26" (120255251575220416, Sales, £700 limit, Heartwell Products catalogue). Ad sets: Rio (120255251579460416, £30 a day: R1–R6, V1) and the collection (120255251589740416, £20 a day: C1–C6, catalogue set "Can be ordered alone"). Add to basket, ages 25–65+, Advantage+ audience and placements, every Meta AI creative change off. Northern Ireland and the quote-only islands left out by 19 map circles (Meta rejects UK postcode exclusions). Links carry `utm_source=facebook&utm_medium=paid_social&utm_campaign=heartwell-sales-nov26&utm_term=rio\|collection&utm_content=<ad code>`. Media on Cloudinary `heartwell/ads/`. Buyers ("Ordered 180d") excluded from both ad sets |
| **WhatsApp Business on 07460 669864** | **Not confirmed** (only needed for WhatsApp chat ads, not planned for now) |

## The agreed plan (owner, 2–3 November 2026)

This replaces Stage 1's two campaigns below where they differ.

- **Who does what:** ChatGPT makes the creatives from the owner's own photos, one range at a time, with prompts I write; I check every creative against the real photos (the sofa must not be redrawn) and build and launch through the Meta connector, paused until the owner says "publish". Premium videos are made from the real photos (the `design/ads/made-your-way` pipeline), not AI video.
- **Hero range: Rio Chesterfield** (2 seater £399 to 3+2 and corner £699), the shop's symbol.
- **One campaign, Sales, website, two ad sets with their own budgets (£50 a day):**
  1. **Rio Chesterfield, £30 a day:** hero image, close-ups (buttoning, scroll arms, feet), a sizes-and-prices carousel, a "pay nothing upfront" ad, and a premium Rio video.
  2. **The collection, £20 a day:** one carousel (Ashton, Verona, Bishop U-shape, Lilly, Oakland, Windsor, Ruby, Malibu, each card to its range page; owner, 5 November 2026), three single images (Ashton, Lilly, Oakland), the "Your sofa, your way" video, and one catalogue ad.
  3. **Later (about two weeks in):** a follow-up catalogue ad set (about £10 a day) for people who viewed or added to basket, once that audience reaches about 1,000.
- **Optimise for:** add to basket for the first two weeks; Purchase once there are 10–15 confirmed orders a week.
- **The money:** each sale leaves about £100 (owner); ad visitors get £20 off on every piece in these ranges (standard tier, or the welcome offer), so about **£80 per ad sale**. Break-even is £80 per confirmed order; the target is £50 or less.
- **Offers by range (owner, 3 November 2026):** not the same for every sofa. **Rio: £50 off the 3+2 set and the 5 seater corner** for ad visitors (offer tier HIGH since 3 November 2026; the other Rio sizes stay STANDARD). The owner says a Rio sale still leaves about £100 after the £50 off, so the Rio ad set breaks even at about £100 per confirmed order. Made-to-order product pages now say "Need another size or shape? Ask us on WhatsApp" (the owner: every sofa can be made in any size, shape and fabric), and the Rio can have chrome legs on request. **The collection: £20 off on every range** (owner, 5 November 2026: Verona, until then without an ad offer, moved to STANDARD), through the ad or the code HEARTSOFA, which the carousel cards show. The guarantee is on the **frame and foam**: no Heartwell sofa has springs (owner, 5 November 2026).
- **Creatives (owner, 3 November 2026, second try):** ChatGPT designs each ad freely (idea, scene, layout, type); my prompt for each lists only what must be on it. The one fixed point: the sofa is placed from a cut-out of the real photo (`design/ads/<Range>/Cut-outs/`, made locally with BiRefNet), never redrawn, and I compare it with the cut-out before launch. The first, rule-heavy brief and its R1 (rejected by the owner) are kept locally in `.qa/ads/`, with the Rio facts (`RIO.md`).
- **The test:** 14 days, about £700, with a campaign spending limit of £700 so it can't overspend. After it: over £80 per confirmed order, stop and rethink; £50–80, change creatives; under £50, raise budgets about 20% every 3–4 days.
- **Not advertised:** pieces under £399 on their own. Bishop (6 seater U-shape, £649 and £699) is on sale since 5 November 2026 and joins the catalogue and the "Corner and U-shape sofas" set with the feed; it gets a card in the collection carousel (C1).

## Stage 0: before the first ad

### The owner (about an hour)

1. **Ad account**: business.facebook.com → Settings → Accounts → Ad accounts → **Add → Create a new ad account**. Name **Heartwell**, time zone **(GMT+00:00) Europe/London**, currency **GBP** (neither can be changed later). For "This ad account will be used for": **My business**. Give yourself **Full control**.
2. **Payment**: in that ad account's Billing, add a card. Set an **account spending limit** (e.g. £1,000) as a safety net.
3. **Connect the data**: Settings → Data sources → **Datasets → Heartwell → Add assets → the new ad account**. Then **Catalogues → Heartwell Products → Add assets → the new ad account**.
4. **Instagram**: Settings → Accounts → **Instagram accounts → Add** @heartwellsofa, then connect it to the ad account. Ads then run on Instagram as Heartwell.
5. **WhatsApp**: install WhatsApp Business on **07460 669864**, then on the Facebook page: Settings → **Linked accounts → WhatsApp** → that number. Needed for "Send WhatsApp message" ads and the page's button.
6. **Page**: location **Burnley** (Unit 4, Blacker Street, BB10 2AF), phone **07460 669864**, website heartwellsofa.co.uk, button **Send WhatsApp message**.
7. **Turn off AI changes to product photos**: when creating ads, under **Advantage+ creative**, switch off "Expand image", "Generate backgrounds" and similar image changes. Meta's AI can change how a sofa looks, and the picture must show the real product.
8. **Decide** (see "Decisions" below): daily budget, the most you'll pay for one confirmed order, and whether to keep the ad offer.

Then say "ad account ready".

### Me (with the Meta connector), the same day

1. **Check the chain**: ad account → dataset → catalogue → page → Instagram, payment method, account status.
2. **Product sets** in the catalogue:
   - **Can be ordered alone (£399 and over)**: every piece except the 10 under the minimum, so nobody clicks an ad for something they can't order.
   - **Corner and U-shape sofas**.
   - **Recliners** (electric and manual).
   - **3+2 sets**.
3. **Audiences**:
   - Website visitors (30 days).
   - Viewed a product or added to basket (14 days).
   - Ordered (180 days), to leave out of prospecting.
   - Engaged with the page or Instagram (365 days): the page's existing followers, which is why the old page was kept.
4. **Custom conversion "Order placed"** from the site's OrderPlaced event, so ads can be judged by orders placed as well as confirmed.
5. **The first campaigns, built and left PAUSED** (Stage 1). You check the previews; nothing spends until you say go.

## Stage 1: launch (weeks 1 and 2)

Two campaigns. Small and steady: Meta's system learns from about 50 results a week per ad set, so few ad sets with enough budget beat many small ones.

### Campaign A: "Heartwell | Sales | Catalogue" (about 70% of the budget)

- **Objective**: Sales. **Advantage+ catalogue ads** from the product set "Can be ordered alone". Meta shows each person the sofas they're most likely to want, including the ones they looked at.
- **Optimise for**: **Add to cart** for the first two weeks (there aren't enough purchases yet to learn from). Switch to **Purchase** once the account has about 10 to 15 confirmed orders a week. Keep the same attribution: 7-day click, 1-day view.
- **Audience**:
  - Location: United Kingdom, **excluding Northern Ireland** and the islands the online checkout doesn't take, as far as Meta's locations allow: Orkney, Shetland, the Western Isles, the Isle of Wight and the Isles of Scilly (the full list of quote-only postcodes is in `docs/MERCHANT-CENTER.md`). Those areas get a WhatsApp quote instead, so ads there mostly waste money. The Isle of Man and the Channel Islands aren't in Meta's "United Kingdom".
  - Age 25 to 65+, Advantage+ audience on (Meta finds the buyers), Advantage+ placements.
- **Ads**: the catalogue's own photos with a frame showing the price and "Free delivery". Primary texts (take turns, all true):
  - "Nothing to pay until it's in your room. Pay the driver in cash or by bank transfer."
  - "Delivered in 2 to 4 working days, free to most of mainland Britain."
  - "Made to order in 70 fabrics, from a showroom in Burnley."
- **Website**: the catalogue links already carry the ad tags. Destination URL parameters on every ad come from Admin → Ad links (`utm_source=facebook&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_term={{adset.name}}&utm_content={{ad.name}}`). Without them the ad offer doesn't apply and the admin can't tell which ad sold what.

### Campaign B: "Heartwell | WhatsApp | Ranges" (about 30%)

- **Objective**: Engagement → **Messaging apps: WhatsApp**. Many sofa buyers want to ask a question before ordering, especially when paying on delivery. These ads open a WhatsApp chat with a first message.
- **Ads**: a carousel of the strongest ranges (corners, U-shapes, recliners) from the owner's photos (the social posts in `design/social/` work as they are), and later a short Reel from the showroom.
- **Needs**: WhatsApp Business on the new number, and someone answering within the hour in the day. Slow replies waste these ads.
- **Recording**: when a chat becomes an order, put it in through the admin with acquisition source **Meta**, so it counts.

### Not yet: retargeting and lookalikes

With today's traffic (about 30 page views a week) a retargeting audience is too small; Campaign A already shows people the sofas they looked at. A separate retargeting campaign comes when "viewed or added to basket, 14 days" passes about 1,000 people. Lookalikes come with 100 or more buyers.

## Stage 2: learn (weeks 3 and 4)

Twice a week, from Ads Manager and the admin (Orders by campaign; every order carries its ad):

| Watch | Rule |
| --- | --- |
| Click-through rate (link) | Under 0.8% after 2,000 impressions: change that ad's picture or first line |
| Cost per add to cart | Rising for 5 days with no orders: new pictures (ads tire after a week or two at small budgets) |
| Cost per **confirmed** order | The number that counts. Above your maximum for 7 days: pause that ad set and rethink, don't just add money |
| Placed orders that get confirmed | Under 70%: the problem is after the ad (calls, confirm link, WhatsApp follow-up), not the ad |
| Orders under £399 attempts | Shouldn't happen (product set); if the basket note shows up often, check the set |

Don't change budgets or targeting more than once every 3 or 4 days: every edit restarts Meta's learning.

## Stage 3: grow (month 2)

- Raise the budget of what works by **20% every 3 or 4 days**, not all at once.
- Switch Campaign A to **Purchase** (if not already).
- Add **retargeting** and **lookalikes** when the audiences are big enough.
- Reels made from showroom video, the new ranges and real customers' photos (with their permission). No made-up reviews.
- **Google Ads** follows one to two months after Meta (owner's order of 17 October; Merchant Center must be approved first).

## Decisions for the owner

1. **Daily budget.** Suggested start: **£25 a day** (£18 Campaign A, £7 Campaign B), about £750 a month, for at least two weeks before judging. The minimum that can learn anything is about £15 a day.
2. **The most you'll pay for one confirmed order.** It comes from the margin. Example: if a typical £700 order leaves £200 after the sofa and delivery, paying up to £60 to £80 in ads per confirmed order still leaves a profit. This number decides what's kept and what's switched off.
3. **The ad offer.** Ad visitors get £50, £30 or £20 off depending on the piece (7 days); everyone also has the welcome offer (£20 off each piece, 48 hours), and the order gets whichever is bigger. Keep both (simple to advertise: "money off your first order"), or switch the ad offer off in Admin → Settings and advertise just the welcome offer.
4. **Who answers WhatsApp**, and in what hours.

## Honest advertising (UK rules and the site's own)

- Prices, offers and delivery promises in ads must match the website on the day. The feed updates prices daily (hourly is better: Commerce Manager → the feed → Schedule).
- No "ends tonight" or "only 2 left" unless it's true. The welcome offer's countdown is real; an ad must not invent another.
- Was-prices only where the piece really sold at that price on the site for 28 days in a row (the admin checks).
- Leather-look covers (tech leather, Leather Aire, tech air leather) are never called leather.
- Photos are the real product; no AI-changed sofas.

## What the website records

Every order, WhatsApp enquiry and lead carries the ad's campaign, ad set and ad (the URL parameters), so the admin shows sales per ad independently of Meta's own counting. Meta receives Purchase once per confirmed real order (never test or cancelled orders) and OrderDelivered on delivery; test orders, staff devices and `?qa=1` visits never count.
