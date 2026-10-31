# Keyword map: the search each page is written for

Phase 20, 18 October 2026. Every page Google can index has a search it's written for, so pages don't compete with each other and nothing important is left unanswered. Searches come from Google's own UK suggestions (what people type, in the order Google ranks it), collected on 18 October 2026; there are no volume figures yet, so Search Console → Performance is the check from here (see "Next" at the end).

**What makes Heartwell different, and leads every page:** pay **cash on delivery** (or bank transfer), **no deposit**, **delivered in 2 to 4 working days** to most of mainland Britain (made-to-order sofas too), **free delivery** to most areas, a **showroom in Burnley**. People search these exact words: "cash on delivery sofas", "pay on delivery sofas", "corner sofa cash on delivery", "corner sofa fast delivery uk", "sofa quick delivery uk", "sofas delivered in 7 days", "sofa no deposit", "sofa shop burnley".

**Answer engines (AEO/GEO).** ChatGPT search and Copilot read Bing's index, Perplexity its own and Bing's, Gemini and Google's AI answers Google's. So the same work counts twice: pages answer the question in their first lines and in a questions section (FAQ data on category, range and FAQ pages), Bing hears about every change through IndexNow, and `/llms.txt` and `/llms-full.txt` give assistants the shop and the whole catalogue in plain text.

## Home and shop

| Page | Written for | Also answers | Where the words live |
| --- | --- | --- | --- |
| `/` | heartwell sofa, cash on delivery sofas, sofas delivered in days | pay on delivery furniture, sofa free delivery uk | `src/app/layout.tsx` (title), `META_DESCRIPTION` |
| `/sofas` | sofas delivered in days, pay cash on delivery | sofa quick delivery uk, how much is a sofa | database `categories` (migration `category_search_words`), questions in `src/content/categories.ts` |
| `/sofas/corner-sofas` | corner sofa fast delivery uk, corner sofa cash on delivery | corner sofas under 500, left or right hand corner sofa, will a corner sofa fit through my door | same |
| `/sofas/u-shaped-sofas` | u shaped sofa uk | how much space does a u shaped sofa need, u shaped sofa cheap | same |
| `/sofas/3-2-sofa-sets` | 3+2 sofa set, 3 and 2 seater sofa set | 3+2 sofa set price | same |
| `/sofas/fabric-sofas` | plush velvet sofa, chenille sofa, crushed velvet sofa | best sofa fabric, fabric sofa made in uk | same |
| `/sofas/leather-sofas` | leather look sofa, tech leather sofa, leather aire sofa | is tech leather real leather, faux leather sofa uk | same |
| `/sofas/recliners` | recliner sofa, manual recliner sofa | electric vs manual recliner, recliner sofa with usb | same |
| `/sofas/electric-recliners` | electric recliner sofa uk | electric recliner sofa with usb and cup holders | same |
| `/sofas/armchairs-and-footstools` | armchair and footstool to match sofa | reclining armchair | same |
| `/ranges` | sofa ranges | | `src/app/(shop)/ranges/page.tsx` |
| `/ranges/<range>` | "<range> sofa", "<range> corner sofa", "<range> sofa dimensions" | what colours, high back or scatter back, made to order, delivery, can I see it | `src/app/(shop)/ranges/[slug]/page.tsx`, answers in `src/lib/seo/answers.ts` |
| `/products/<piece>` | the piece by name, size, "sofa" and cover ("ashton corner sofa", "grey velvet corner sofa", "roma recliner sofa 3+2 dimensions", "orlando electric recliner sofa") | how big, cover and colours, delivery, paying, fit, returns, extras | page title built from the piece's data ("Ashton 5 Seater Corner Sofa, High Back, Grey Plush Velvet": `src/lib/product/naming.ts`, audit A3) unless the product has its own SEO title (Admin); the heading's second line says "5 seater corner sofa, high back"; description (database); answers in `src/lib/seo/answers.ts`. The product's own title (orders, OrderFlow, feeds) is unchanged |
| `/fabrics` | sofa fabrics, plush velvet colours | | `src/app/(shop)/fabrics/page.tsx` |
| `/fabric-samples` | sofa fabric samples | | `src/app/(shop)/fabric-samples/page.tsx` |

Range names are trade names other UK shops use too (Verona, Roma, Orlando, Nova, Ashton, Malibu, Windsor…), so "<range> sofa dimensions" and "<range> sofa reviews" are real searches the range and product pages can win with exact measurements. Big names own some of them ("windsor corner sofa" leads to DFS); "sims sofa" is the video game. That's fine: the range page still answers people who already know the name.

## Help and guides

| Page | Written for | Also answers |
| --- | --- | --- |
| `/visit-us` | sofa shop burnley, sofa showroom lancashire, furniture shop burnley | sofas near burnley, sofa blackburn |
| `/delivery-and-returns` | sofa delivery and returns, sofa delivery charges | delivery to devon, cornwall, scotland |
| `/faq` | questions about paying on delivery, delivery, returns | |
| `/will-it-fit` | will a sofa fit through my door | will my sofa fit through the door calculator |
| `/guides/how-paying-on-delivery-works` | pay on delivery sofas, cash on delivery sofas | sofa cash on delivery scam, sofa no deposit, sofa without card |
| `/guides/how-long-does-sofa-delivery-take` | how long does sofa delivery take | sofa next day delivery, sofas delivered in 7 days |
| `/guides/choosing-the-right-size-sofa` | what size sofa do I need | what size sofa for a 12x12 room |
| `/guides/measuring-for-a-corner-sofa` | how to measure for a corner sofa | |
| `/guides/left-or-right-hand-corner-sofa` | left or right hand corner sofa | what does 2c1 mean, 1c2 corner sofa |
| `/guides/high-back-or-scatter-back-sofa` | scatter back sofa vs standard back, what is a scatter back sofa, scatter back vs full back sofa | scatter back vs high back sofa, scatter back sofa pros and cons |
| `/guides/electric-or-manual-recliner` | electric vs manual recliner sofa | are electric or manual recliners better |
| `/guides/tech-leather-and-leather-aire` | what is leather aire, leather aire material, air leather, what is tech leather | is air leather real leather, tech leather vs leather |
| `/guides/choosing-a-sofa-fabric` | best sofa fabric for pets, is velvet good for a sofa | best sofa fabric for kids, chenille or velvet |
| `/guides/what-made-to-order-means` | made to order sofa uk | how long do made to order sofas take |
| `/guides/getting-ready-for-delivery-day` | sofa delivery day checklist | |
| `/about` | heartwell sofa, who are heartwell | |
| `/care-guide` | how to clean a velvet sofa, how to clean faux leather sofa | |
| `/reviews` | heartwell sofa reviews | |
| `/contact` | heartwell sofa contact | |

Not indexed on purpose: basket, saved, checkout, search, order and confirm links, track my order, the style guide, filtered and sorted category pages.

## Ideas for later (each would be a new page)

- **Collections** for searches the categories don't cover: "chesterfield corner sofa" (Rio Chesterfield, Windsor), "grey corner sofa", "corner sofas under £500", "high back corner sofa". Each needs a category in Admin → Catalogue → Structure and its words.
- **Places** only where it's true: the Burnley showroom page already covers Burnley and Lancashire; a page per town would be thin and Google treats it as spam.
- **TikTok** in the footer and Organization data once the profile opens.

## First results (27 October 2026, 11 days after launch)

- **Search Console, 28 days:** 5 clicks, 54 impressions, average position 17. All the clicks are the home page (position 1.9: people searching the name). The guides are what Google tries first: tech leather (12 impressions, position 8.7) and scatter back (13 impressions, position 12.5), then delivery times, sizes and recliners. Their titles now use the words people search ("what is tech leather", "air leather", "full back").
- **Indexing:** 48 pages indexed, 78 found but not yet crawled (mostly product pages). Crawl stats showed why it's slow: 42% of Googlebot's requests (966) failed with server errors, all of them Next.js link preloads (`?_rsc=`) made in bursts by Googlebot's renderer, which Hostinger turned away. robots.txt now keeps crawlers off `?_rsc=` (they're never needed to read a page), so Google stops seeing errors and crawls the site at full speed again.
- **Brand:** "heartwell sofa" on Google mostly shows "Hartwell" sofas from other shops; the Facebook page appears as "Heartwell Sofa | Brimington". Changing the page's location to Burnley helps.
- **Bing:** nothing indexed yet (Bing Webmaster Tools isn't set up).
- **Merchant Center:** 121 products, 120 under review; the account is held only by a missing business address.

## Second results (31 October 2026, 15 days after launch)

- **Search Console, 28 days:** 6 clicks, 196 impressions (54 on 27 October), average position 20.7, 44 searches. All the clicks are still the home page (22 impressions, position 6.7: name searches, which Google hides from the query list). Page one without clicks yet: "what is tech leather" 6.3, "corner sofa dimensions guide" 7, "what is leatheraire" 7, "scatter back sofa vs standard back" 9.3, "pay on delivery sofas" 9.8, "leather aire material" 10, "what is leather aire" 10.6. Most impressions: the scatter back guide (56, position 13.6) and the tech leather guide (45, 10.6). Range and category searches ("windsor sofa", "3+2 sofa set", "electric recliner corner sofa") sit at 60 to 90: big shops own them, and they need the product pages indexed and time.
- **Google still shows the guides' titles from before 27 October** (not re-read yet). Refined again with the words people type: "Scatter back vs standard back sofa (high or full back)", "What is Leather Aire (air leather)? Tech leather explained" (the Leather Aire section now says what it is), "Pay on delivery sofas: how cash on delivery works".
- **Indexing:** 48 indexed, 78 "discovered, not yet crawled" (nearly all products, eight range pages, some categories and guides), the report as of the crawl errors. **The server errors stopped on 24 October** (the last ones were `?_rsc=` preloads, before robots.txt blocked them on 27 October), so crawling can recover. Indexing requested on 31 October for the Ashton, Sims and Salone U-shapes, the Verona and Malibu corners, the Nova and Hannah recliner corners, the Roma 3 seater, the left-or-right corner guide and "Will it fit?". The Ashton 5 seater corner was already indexed.
- **Merchant Center:** the business address was the last setup step (done 31 October, owner's go-ahead), so the 121 products held "Under review" can now be reviewed and shown in free listings. Merchant Center also added a "Found by Google" source (0 products; it only adds products missing from the feed). Google asked for colour, depth, length, seat height, frame material and fabric type in recliners' descriptions: Google's feed descriptions now start with the colour, cover and measurements (we don't know seat heights or frames, so they're not claimed).
- **Bing:** two guides indexed (was nothing); no Bing Webmaster Tools yet (owner).
- **Public Google:** "heartwell sofa" shows the Care guide (2nd) and Contact (4th) but other shops' "Hartwell" sofas around them; product pages appear with prices once indexed (Verona 3 Seater £399, Lily 3 Seater £449).

## Next

1. **Search Console → Performance** again around 10 November: whether the products are indexed now that the crawl errors are gone, and how the retitled guides do. Pages with impressions but few clicks get a better title; searches that land on the wrong page get their own answer.
2. **Bing Webmaster Tools** (owner): sign in with the Microsoft account, choose **Import from Google Search Console**, and the site and sitemap come across. IndexNow already tells Bing about every change.
3. Re-run the search check (`docs/PROGRESS.md`, 17 October) after any big content change.
