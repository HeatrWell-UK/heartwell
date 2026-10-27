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
| **Ad account** | **Missing.** None belongs to the Heartwell business; the sister business's accounts must never be used |
| **Instagram** | **Not confirmed** as connected to the business |
| **WhatsApp Business on 07460 669864** | **Not confirmed** |

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
