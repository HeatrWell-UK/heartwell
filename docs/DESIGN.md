# Heartwell — Design system

Status: **revision 3, live on every customer page** (Phase 18C, 15–16 October 2026, in five parts: the home page and the shop's frame (R1); category, range, search and saved pages (R2); the product page (R3); basket, checkout and order pages (R4); content pages, page not found and errors (R5)). **The home page is on revision 4, "the lit gallery"** (30 October 2026), and so are the range, category and ranges pages, every product and range photo in the shop's grids (31 October 2026) and the product page's photos (31 October 2026). Revision 2 was approved on 3 October 2026. The admin keeps the sister shop's admin design with Heartwell branding (CLAUDE.md), so it shares only the display face.
Revision 2 preview: https://claude.ai/artifact/EDNrBLMoJGDt8MR2NtuR5y · source: `design/canvas/project/*.dc.html` · logo files: `design/logo/` · logo build scripts: `design/logo-work/`

Direction name: **Red Velvet and Gold**, revision 3: **the velvet alcove**. Deep velvet red for every action, metallic gold for the finishing touches, white and soft stone behind everything. Phone first, built for the Facebook and Instagram in-app browsers.

**The idea behind revision 3.** Every photo the owner took stands the furniture in the same room: soft white panelled walls, a velvet-red arched alcove with a lit gold rim, a herringbone oak floor. That room is the brand. The site takes its shapes from it (the alcove, the moulded wall panels, the gold rim) rather than inventing decoration, and spends its boldness in one place: on the home page the promise is lit in gold inside the photo's own alcove, and the main button stands on its floor. Everything else is quiet: white, hairlines, generous space, real photos, real prices, real dates.

Revision history: revision 1 ("Daylight and Velvet", green and rose, new logo) was rejected by the owner on 3 October 2026: keep the original logo, recolour it; red velvet and golden gradients; no green or pink. Revision 2 kept revision 1's layout, fonts and components, recoloured. Revision 3 (15 October 2026, the owner asked for a full redesign "for UK customers": "you decide what's best and amaze me") keeps the colours and logo, changes the display face to Gloock and rebuilds the pages around the owner's photo set.

## What it must never be

Nothing from the sister shop: no warm cream backgrounds, no flat amber or orange accent, no Fraunces or Geist, none of its components or layouts, no heavy or self-running motion. Gold is always a metallic gradient or a deep antique gold, never the sister's flat amber on cream. Also not a template: no gradient washes across whole sections (the one exception is the lit velvet ground, `.hw-velvet`, which is the alcove wall in the photos, not decoration), no all-caps eyebrow labels, no fake countdowns or urgency, no fake reviews or stats. The one countdown is the welcome offer's (Phase 21, owner's request): it counts to the end time the database holds, never restarts, and counts calmly in hours and minutes (no ticking seconds, nothing flashing, not read out on every change).

## Logo

- **The owner's original logo**, kept exactly (heart-backed sofa, "Heartwell" with the swash H, "SOFA" between rules), traced to vector and recoloured:
  - **On white** (`hw-logo.svg`): frame and wordmark in deep velvet red #5E1020, cushions in a velvet-red gradient (#B8263F to #8A1A2D), cushion, legs, "SOFA" and rules in a metallic gold gradient.
  - **On wine** (`hw-logo-reversed.svg`): frame and wordmark in the gold gradient, cushions in a lighter red gradient, pale-gold cushion and "SOFA".
- **Parts for small spaces:** `hw-mark.svg` (the sofa alone), `hw-wordmark.svg` ("Heartwell" alone), each with a `-reversed` version. Header and footer use mark + wordmark side by side; the full stacked logo is for the brand board, social, print and the footer on the home page.
- App icon and favicon: the reversed mark on a wine rounded square.
- Built by `design/logo-work/build.mjs` from a Cloudinary vector trace of `reference/Logo-Concept.jpeg` (asset `heartwell/brand/logo-concept-original`). Colours change in one place in that script.
- Suggestion for later: when dining, wardrobes or beds launch, "SOFA" under the name can become "FURNITURE" with the same script.

## Colour

| Token | Value | Use |
| --- | --- | --- |
| `velvet` | #8E1B2E | Links, selected rings, outline buttons, logo sofa |
| `velvet-sheen` | linear-gradient(180deg, #A3243A, #7E1627) | Primary buttons |
| `wine` | #4A0D17 | Announcement bar, dark sections, footer |
| `alcove` | #5A181A | The velvet inside the photos' alcove: behind the home hero while its photo loads (revision 3) |
| `gold-lit` | linear-gradient(100deg, #D6B260, #F6E3A8 42%, #DDB968 68%, #F2DC9C) | Gold lettering on velvet and wine (revision 3): lighter than gold-gradient so every part of a letter keeps over 5:1 |
| `gold-gradient` | linear-gradient(135deg, #94701F 0%, #E9CC7B 35%, #B58A2F 60%, #F2DC9C 85%, #9E7626 100%) | Step numbers, headings on wine, the announcement rule, the main button on wine, logo on wine. Never behind small text. |
| `gold` | #B58A2F | Gold lines and icons on white (graphics only, 3:1) |
| `gold-pale` | #E9CC7B | Gold text on wine; offer badges with wine text |
| `gold-tint` | #F4E7C6 | Selected options, product badges |
| `gold-cream-tint` | #FBF4E6 | Ticked delivery extra |
| `white` | #FFFFFF | Page background |
| `stone` | #F5F1EF | Section grounds, image placeholders |
| `ink` | #22171A | Main text |
| `slate` | #5E4F52 | Secondary and help text |
| `body-dark` | #3E2F32 | Long text in accordions |
| `line` | #E5DADB | Borders, dividers |
| `line-soft` | #EFE7E7 | Hairline separators |
| `field` | #CDBFC1 | Input borders |
| `on-wine` | #EBDADD / #F2E4E6 | Text and links on wine |
| `error` | #B42318 | Errors, always with words and an icon |
| `whatsapp` | #25D366 | WhatsApp glyph only |

Contrast (checked): white on velvet 9.0:1, wine on pale gold 10.0:1, slate on white 7.7:1, slate on stone 6.8:1, on-wine text 11.5:1.

## Type

Revision 3:

- **Gloock** (Google Fonts, one weight, self-hosted via `next/font`): headings, prices and the step numbers. A high-contrast serif with sturdy stems, close to the "Heartwell" wordmark in the logo, so the page and the logo read as one hand. It has one weight: it's never set bold (`font-synthesis-weight: none` stops browsers faking it).
- **Figtree**: all body text, labels and buttons. 400/500/600/700.
- Besley (revisions 1 and 2) is retired.

| Role | Phone | Desktop | Notes |
| --- | --- | --- | --- |
| Hero (home) | Gloock, 9.8vw ≈ 37 px at 375 | 4.6vw ≈ 66 px at 1440 (72 max) | gold-lit on velvet, two lines, one sentence each (revision 4) |
| Display (H1) | Gloock, 32–36/1.1 | 44–52 | letter-spacing −0.01em, `text-wrap: balance` |
| H2 | Gloock, 30/1.15 | 42/1.1 | |
| H3 | Gloock, 22–24 | 24–28 | |
| Price | Gloock, 18–32 | same | £749; pence only when needed |
| Body large | Figtree 400, 17/1.55 | 18 | |
| Body | Figtree 400, 16/1.5 | 16 | |
| Label / button | Figtree 600, 15–17 | | sentence case |
| Small | Figtree 400, 13–14 | | never below 13 px |

Inputs are 17 px so iPhones never zoom.

## Space, shape, elevation

- 4 px base: 4, 8, 12, 16, 24, 32, 48, 64, 96. Page edges 16 px on phones, 24 px tablets; content max-width 1200 px.
- Radius: pills for buttons and chips; inputs 12 px; cards and images 18–24 px; the heart frame (arched top with a centre notch) once, on the home hero.
- Shadows only for overlays (basket sheet, menus): `0 -8px 24px rgba(34,23,26,.12)`.
- Touch targets ≥ 44 px; primary buttons 56 px tall on phones, 48 px desktop.

## Shapes taken from the room (revision 3)

Each one stands for something, and each is used sparingly.

- **The alcove.** Revision 4: the home hero lines the alcoves up as a gallery (`.hw-alcove`): arch-topped frames with a metallic gold rim and a fine inner line, each holding one of the owner's photos, so the photo's own alcove sits inside the frame's arch. The arch tops are true half circles at any width (each alcove is a container; its layers round their tops by `50cqw`). Shape photos use the same arch, smaller (`.hw-niche`), and the empty alcove marks page not found. (Revision 3 set the headline inside the photo's alcove; `home-hero-wide` is no longer used.)
- **The wall panel.** A stone panel with an inset hairline, like the moulded panels on the walls in the photos (`.hw-panel`). One or two per page, for the content that matters most (on the home page: how paying works).
- **The gold thread.** A thin gold line joining numbered steps, down on phones and across on desktops (`.hw-thread`). Only for real sequences.
- **Velvet grounds.** Wine sections with gold headings: one per page at most, except the home page, which has two (the hero and the fabrics), far apart. Since revision 4 they're lit velvet (`.hw-velvet`): lighter at the top like the lit alcove wall, deep wine below, with a fine warm grain for the nap. It's the site's only gradient ground.

## The home page (revision 4, "the lit gallery", 30 October 2026)

The owner liked the colours and fonts but found the home page, and above all the hero, "too bland", and asked for a completely new concept. Revision 3.1 (29 October) had brought motion to the old layout; revision 4 changes the hero itself.

**The idea:** every photo the owner took stands the furniture in the same room, in a velvet alcove with a gold rim. The hero lines those alcoves up along a lit velvet wall like a gallery, and they light up one after another as the page opens, like a showroom switching its lights on. It has the same velvet, gold lettering, arched gold frames and gold seal as the owner's own social posts, which they liked.

1. **Hero, the gallery** (`src/components/home/Hero.tsx`, `.hw-gallery` in `globals.css`): on lit velvet, the promise in gold-lit Gloock ("Choose it today. Pay when it's home.") and one line under it (free delivery to most of mainland Britain, usually in 2–4 working days). Below, the alcoves: in the middle the owner's room photo (5:6), with a gold **medallion** "To pay today £0" (lighter gold so the wine text keeps over 6:1) and "Shop sofas" standing on its oak floor. Either side are the first ranges from `homeRanges` (featured first), each a link with its name and from-price on a **plate** under it. Phones show the room photo, with the next two alcoves peeking out from behind it (their plates are read out, not shown). From 640 px there are three alcoves; from 1024 px five, stepping down from the middle. The middle alcove's size is capped by the screen's height, so the button is always on the first screen. The alcoves stand on a **gold floor line**, and under it are today's facts: this week's real delivery window, "Pay the driver, in cash or by bank transfer", and the welcome offer with its real time left while it's live (otherwise the 1-year guarantee).
2. **Nothing to pay until it's in your room**: what you pay and when, on a gold thread that draws itself as it scrolls by: **Today £0** (order in two minutes, no card, no deposit, no account), **Straight after £0** (confirm with one tap), **Usually Tue 3 – Wed 4 November: On delivery** (look it over, then pay the driver). The amounts are large velvet Gloock and the dates are real (`windowLabel`). Underneath: the guarantee, the 14 days and the person who checks every order.
3. **Shop by shape**: the owner's category photos in gold-lined arches (`.hw-niche`) with the top-view plans beside each name and how many there are to choose from, and a velvet arch for everything. Photos settle in their arches as they scroll in.
4. **Our ranges**: one card per range (photo, name, sizes, made to order, from-price, colours), featured ranges first; a row to swipe on phones (each card opens from the arch as it slides in), a grid on desktops with the **first range featured** at twice the size (nine ranges, so the grid stays full).
5. **Your sofa, in your fabric** (velvet ground): a swatch card of pinked swatches showing **each fabric's own photo** (its colour shows until the photo loads), lifting like a picked-up sample when touched (`.hw-swatch`); full rows only, light to dark, never green, pink or orange, and no strong reds or aubergines either, since their photos read pink or coral (the owner's rule; `isShowcaseColour`); samples and "See all 70 fabrics".
6. **Free delivery across mainland Britain**: a drawn map of the free-delivery area (mainland Great Britain and Anglesey, from about 240 coastline points; `scripts/build-britain-outline.mjs`) with the Burnley showroom marked by a gold heart; the instant postcode check; how to visit the showroom.
7. **Questions people ask**: heading beside the answers on desktops.

The header gains a row of categories on desktops (with Ranges, and All sofas from 1280 px); the footer puts the logo and contact details, the link columns and the newsletter side by side on desktops.

## Range, category and ranges pages (revision 4, 31 October 2026)

The owner asked for the home page's gallery look on the category and range pages too.

- **Range pages: the range's own gallery** (`src/app/(shop)/ranges/[slug]/page.tsx`, built from the home page's `Arcade` in `src/components/catalogue/Arcade.tsx`). On lit velvet:
  - the breadcrumb, then the range's name large in gold-lit Gloock, with how many sizes and back styles and "made to order in the colours shown or any of our 70 fabrics";
  - its cover in the middle alcove, squared up (`square`) so a set or corner isn't cut, with a gold medallion "from £429" and "Choose a size" on its floor (it jumps to the sizes drawn to scale);
  - either side, up to four of its other sizes, each with its own photo (`sizePhotos`: never the cover, never a photo another size already shows), named on a plate with its price ("5 seater corner, from £699"), each a link to that size;
  - under the gold floor line, the range's own words, its colours, and "Ask about Ashton" on WhatsApp.

  It's the range's social post cover, as a page. A range with one size stands alone in its alcove.
- **Category pages and the ranges page: a velvet header** (`VelvetHeader`): the breadcrumb, the name in gold, "34 sofas, from £479", the introduction on desktops (phones still get it at the foot of the page, so the sofas come first) and a small lit alcove holding the owner's photo for the category (the featured range's on the ranges page; the top-view plan in gold when a category has no photo). It stands on a gold line, then the shape rail, filters and grid continue on white.
- **Every product and range photo in an arch** (`.hw-niche-square`): the frame's half-circle top answers the photo's own alcove, with a fine gold line that turns stronger under the pointer. On product tiles the label (made to order, electric recliner, a deal) sits on the photo's floor, and the save heart sits beside the arch's shoulder. The home page's featured range keeps its 5:6 arch on desktops (`--arch-v` sets the top's height for another shape).
- **Product page photos** (`Gallery`, `ProductPurchase`): the photos sit on a velvet stage, a full-width band on phones and a rounded panel beside the buy box on desktops (sticky, as before). The breadcrumb is at the stage's top, and the photos swipe inside a gold-rimmed alcove (`.hw-alcove-flow`: its height comes from the photos, its rim is its padding). The colour is on a plate at the alcove's foot (`.hw-plate`) and the save heart sits beside the arch's shoulder. Dots are gold on velvet on phones; on desktops the thumbnails are small arches, the current one ringed in pale gold. The buy box stays on white, where people read prices and choose options. The rim lights up as the page opens, and again when a new colour brings new photos. The photo is never dimmed. "You might also like" cards use the same arch.
- **Motion:** each alcove lights the same way as the home page's. In the shop's grids the photos stay still: a photo there must look the same however far it's scrolled. The settle-on-scroll (`.hw-settle`) is for the home page only.

## Category, range, search and saved pages (revision 3, part R2)

The headers and photo frames below were replaced by revision 4 (above); the rest still holds.


- **Product tiles** (category pages, search): the photo with one label (electric, reclining or made to order) and the save heart; then the **range's name in Gloock** with the size underneath, said once ("Ashton" over "3+2 seater, high back", never the size twice); the price it starts from and the colours. Sizes are written in sentence case with commas ("Armed U-shape", "4 seater corner 2c1, high back").
- **Category pages**: the name in sentence case, "31 sofas, from £479", and on desktops the introduction with the category's top-view plan drawn large beside it. On phones the introduction moves to "About …" at the bottom so the sofas come first, the **shape rail** (every category with its plan, the current one in gold tint, centred on load) lets people hop between shapes, and the filter and sort bar stays pinned to the top while the grid scrolls (the Filter button turns gold when filters are on). Desktops use the header's category row instead of the rail; it underlines the page you're on.
- **Range pages** (the bold moment of R2): the range's room photo and its own introduction (`ranges.description`, migration `range_copy`), sizes, back styles, the from-price and colours, "Choose a size" and "Ask about …" on WhatsApp. Then **every size drawn to scale**: one card per size with its top view (`ScalePlan`) in real centimetres inside one frame shared by the whole range, standing on a common baseline, so a 2 seater and a 5 seater corner can be compared at a glance; under each, the measurement people compare first ("198 cm wide", "240 × 190 cm", "198 cm and 168 cm wide") and a row per back style with its price. Plans are velvet lines on white over stone, dashed seams for the back cushions, arms and seats. Then "Will it fit?" and other ranges.
- **Range cards** (home, ranges page, other ranges): photo, name in Gloock, sizes, made to order, from-price, colours. They size themselves with a container query: narrow cards (two across a phone) stack the price under the name, wider ones set it beside.
- **Search**: a large rounded field with the magnifier inside; with no results, "Browse by shape" (the rail) and popular searches. Search also reads each range's introduction, so "velvet" or "chesterfield" find the right ranges.
- **Saved**: tiles to match; an empty state with a gold-tint heart.

## The product page (revision 3, part R3)

- **Gallery**: square photos to swipe on phones (dots below), sticky beside the buy box on desktops with a row of thumbnails under the photo. Since revision 4 they're in a lit alcove on velvet (see "Range, category and ranges pages (revision 4)").
- **Heading**: "Made to order" and "Made in the UK" pills, then the **range's name in Gloock** (40 px phones, 52 px desktops) over the size in Figtree ("Salone" / "5 seater corner"); the full title is still the heading's text.
- **Price and the receipt**: the price with "Free delivery", then a small receipt with what's paid when: **To pay today £0** (in velvet) and **To pay on delivery £699**, "cash or bank transfer to the driver, once it's in your room". While an offer is live (the welcome offer or an ad visitor's, whichever is bigger) it comes off the "on delivery" line. A piece on a deal shows its **was-price** struck through (Gloock, slate) after the price, with a "20% off" pill (gold-pale, wine text; rounded down); tiles show the same pill as their one label and the was-price after the from-price. Between the price and the receipt, the **welcome panel**: gold tint with a hairline gold outline and the gold heart, "Welcome offer: £20 off this sofa", "Taken off at checkout, no code needed", the end time in words, and the hours and minutes left in two wine tiles with gold-lit Gloock numbers (dashes until the time is known, so the panel never pushes the page down). A piece under the minimum order says so under the buttons. The same two lines as the "Added to your basket" sheet, so the promise reads the same all the way to checkout. Paying on delivery is no longer repeated in the promise rows below.
- **Size cards**: each size with its top view drawn to the range's shared scale (the range page's drawings, small), its name in sentence case and its price. Back styles stay a segmented control, in sentence case.
- **Fabric button**: three pinked swatches, light, middle and dark, picked by the same rule as the home page (never green, pink or orange).
- **Will it fit?** (the page's panel, `.hw-panel`): the top view drawn to scale with every measurement on white, the door check beside it, a line on sections (or two separate sofas for a 3+2), and "How to measure up".
- **About {range}**: the description (open), specifications, delivery and returns, care; reviews (the honest empty state until real ones arrive) beside it on desktops; then "You might also like".

## Basket, checkout and after ordering (revision 3, part R4)

- **One receipt everywhere.** Every summary ends with the same two lines (`PayRows`): **To pay today £0** in velvet Gloock and **To pay on delivery** in large Gloock. Product page, "Added to your basket" sheet, basket, checkout, order page, confirm page, Track my order and the order emails all say it the same way.
- **Basket**: the summary on a wall panel (sticky on desktops), then "What happens next" in three steps with the gold numbers. Empty basket: a gold-tint basket and one line on why there's nothing to lose.
- **Checkout**: "No card and nothing to pay today" under the heading; the four sections (your details, delivery address, delivery, anything else) on white cards, each headed by its **gold number** and a Gloock title; "Your order" on the wall panel, sticky on desktops.
- **The order journey** (`OrderJourney`, from `orderJourney(status, dates)`): five steps (order placed, confirmed by you, being prepared, on its way, delivered) joined by a thread, done ones ticked in velvet with their day, the next one in gold with what happens there in a line, the rest outlined. On the order page after checkout ("Thank you, Ann", the gold tick, "One more step: confirm your order" on the panel), on the confirm page once confirmed, and on Track my order with real dates.
- **Emails**: the header is the real logo (gold mark and wordmark on wine, `public/brand/hw-email-header.png`, 230 × 40, alt text in the gold serif when images are blocked); "To pay today £0" in velvet.

## Content pages (revision 3, part R5)

- **The frame** (`ContentPage`: About, Delivery and returns, Questions and answers, guides, care, will it fit, terms, privacy, cookies): the title at 38/56 px, the introduction, the date the wording last changed, an optional figure, then the text in a 46 rem column. Long pages get **On this page**: a list to fold away on phones and a list that stays beside the text on desktops (after the text in reading order, placed on the left by the grid). Section headings 28/34 px; real sequences use the gold numbers (`ol.hw-steps`); notes have a gold rule down the side.
- **About** opens with the owner's room photo (full width on phones). **Visit us** puts the address, hours and booking on a wall panel beside the map with the showroom marked. **Delivery and returns** opens with a panel of the map (the delivery area alone, `showroom={false}`) and the three facts people look for: free to the room of your choice, usually 2–4 working days with this week's dates, Northern Ireland and the islands by arrangement.
- **The map** is one component (`BritainMap`) for the home page, Visit us and Delivery and returns.
- **Our fabrics** opens on the velvet ground of the home page's fabric section (gold title, "Order samples" as the gold button), with the full library below, every colour on sale shown.
- **Guides, reviews, contact and fabric samples**: the same heading scale; the reviews empty state on a wall panel.
- **Page not found and errors**: the alcove with nothing in it, drawn in gold line (`EmptyAlcove`), then a way on: search, the shapes, home and contact (not found), or try again (errors).

## The system in one breath

White and stone grounds; velvet for every action; wine for the one dark band a page may have; gold as a gradient on numbers, rims and lettering on velvet, never behind small text. Gloock for names, headings and prices, Figtree for everything people read and tap. Shapes from the owner's room: the alcove (the home hero, the empty alcove), the wall panel (`.hw-panel`, one or two a page), the gold thread and numbers for real sequences, top-view plans drawn to scale for sizes. One bold moment a page; everything else quiet. On the home page that moment is the gallery of alcoves on lit velvet, which light up one after another as the page opens (revision 4); arches open and settle as you scroll; all of it stays still with reduced motion.

## Components (as drawn in the revision 2 preview)

Same set as revision 1, recoloured: announcement bar (wine with a thin gold rule), header (mark + wordmark, rose count badge now velvet), primary (velvet sheen), secondary (velvet outline), WhatsApp, on-wine (gold gradient), disabled; promise tiles (stone); how ordering works (gold-gradient numbers); shop by shape (top-view plans); product card; colour swatches (velvet ring); pinking-shear fabric swatches; size cards (velvet border on gold tint); segmented control (velvet); postcode check; delivery extras; measurements (gold dimension lines); will it fit; accordions; honest reviews empty state; sticky buy bar; floating WhatsApp button (velvet circle, gold rim, the WhatsApp mark; a pill with "Ask us on WhatsApp" on wide screens; above anything fixed to the bottom; its first message fits the page); basket sheet; offer strip (gold tint, gold heart); footer (wine, gold logo).

## Icons

Line icons, 24 px grid, 1.75 px stroke, rounded caps and joins, in velvet on light grounds and pale gold on wine. Build: **Phosphor Icons (regular)**. Shape tiles use custom top-view plan drawings.

## Photography

- **Revision 3: the owner's own photos** (Cloudinary `heartwell/Product Images/…`, Phase 17A) are what the shop shows: every piece in the same panelled room with the velvet alcove. Widened versions for wide screens are made once with generative fill, checked by eye and stored as their own files, never generated on the fly.
- Revision 2 (design-stage samples, no longer used): main product photos: the real product with an AI-generated **bright, elegant British living room**: soft white painted wall panelling, light oak floorboards, a brass floor lamp, soft morning daylight. Made with Cloudinary generative background replace, prompt `bright elegant British living room with soft white painted wall panelling and light oak floorboards and a brass floor lamp and soft morning daylight`, seed fixed per batch (seed 21 for the samples).
- Only the room changes; anything distorted is regenerated or rejected; every photo approved by a person (admin Photos page).
- The samples sit a little small in frame. Phase 6 adds a tighter crop (`g_auto` fill) so the sofa fills more of a square, and tightens wall colour consistency (one sample came out greige).
- Square for product pages and catalogue ads, 4:5 for Instagram.

## Motion

In answer to the customer: basket sheet slides up (260 ms); accordions and selections 150–200 ms; photos grow a little under the pointer; fabric swatches lift when touched.

On its own, since revision 3.1 (owner, 29 October 2026: the site felt "too dull and static"), and only on the home page:

- **Once, on load (revision 4): the lights come on.** The two lines rise in turn. The middle alcove's gold rim rises from the floor up both sides and meets at the top, its lamp glows on the velvet behind it and its photo brightens from dim. Then the alcoves either side light the same way (from 0.45 s), then the outer pair (from 0.75 s), and the medallion is stamped on (1.05 s). The button is on its way within half a second and settled by 1.1 s, so it never keeps anyone waiting. All is still by 1.9 s. The photos are only dimmed, never hidden (the room photo is the page's largest paint).
- **Tied to scrolling**: photos of shapes and ranges open from the arch of the alcove to a rounded square, with a slight zoom; the gold thread draws itself. They move with the finger and stop when it stops, so nothing plays by itself. Built with CSS scroll-driven animations (`animation-timeline`), only where the browser supports them; elsewhere the page is simply still.

Rules: CSS only (no scripts, no libraries); only `transform`-family properties, opacity and clip-path, so it stays smooth in the Facebook and Instagram browsers; every animation sits inside `prefers-reduced-motion: no-preference`, so reduced motion shows the finished page; no loops, no parallax on text, nothing that delays reading or tapping. The welcome offer's time left is the only countdown, and only because the offer really ends then.

## Voice

Plain and specific, honest even when it costs us, British and warm, never pushy. Sentence case. Buttons say exactly what happens.

## Accessibility

WCAG 2.2 AA: contrast as above, visible focus ring (`0 0 0 3px white, 0 0 0 5px velvet`), real buttons and labels, 44 px targets, errors in words, no meaning by colour alone, reduced-motion support, alt text naming the product and colour. Gold gradients never sit behind small text.
