# Heartwell — Design system

Status: **revision 3, being built** (Phase 18C, from 15 October 2026; done: the home page and the shop's frame (R1), category, range, search and saved pages (R2), the product page (R3); the basket, checkout and content pages follow in R4–R5, `docs/PLAN.md`). Revision 2 was approved on 3 October 2026.
Revision 2 preview: https://claude.ai/artifact/EDNrBLMoJGDt8MR2NtuR5y · source: `design/canvas/project/*.dc.html` · logo files: `design/logo/` · logo build scripts: `design/logo-work/`

Direction name: **Red Velvet and Gold**, revision 3: **the velvet alcove**. Deep velvet red for every action, metallic gold for the finishing touches, white and soft stone behind everything. Phone first, built for the Facebook and Instagram in-app browsers.

**The idea behind revision 3.** Every photo the owner took stands the furniture in the same room: soft white panelled walls, a velvet-red arched alcove with a lit gold rim, a herringbone oak floor. That room is the brand. The site takes its shapes from it (the alcove, the moulded wall panels, the gold rim) rather than inventing decoration, and spends its boldness in one place: on the home page the promise is lit in gold inside the photo's own alcove, and the main button stands on its floor. Everything else is quiet: white, hairlines, generous space, real photos, real prices, real dates.

Revision history: revision 1 ("Daylight and Velvet", green and rose, new logo) was rejected by the owner on 3 October 2026: keep the original logo, recolour it; red velvet and golden gradients; no green or pink. Revision 2 kept revision 1's layout, fonts and components, recoloured. Revision 3 (15 October 2026, the owner asked for a full redesign "for UK customers": "you decide what's best and amaze me") keeps the colours and logo, changes the display face to Gloock and rebuilds the pages around the owner's photo set.

## What it must never be

Nothing from the sister shop: no warm cream backgrounds, no flat amber or orange accent, no Fraunces or Geist, none of its components or layouts, no heavy or self-running motion. Gold is always a metallic gradient or a deep antique gold, never the sister's flat amber on cream. Also not a template: no gradient washes across whole sections, no all-caps eyebrow labels, no countdowns, no fake reviews or stats.

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
| Hero (home) | Gloock, 7.4cqw ≈ 28–32 px | 3cqw ≈ 43 px at 1440 | sized to the alcove, two lines, one sentence each |
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

- **The alcove.** On the home page the headline is set inside the velvet alcove of the owner's photo, in gold (`text-gold-lit`, lighter stops so every part of each letter keeps over 5:1 on the velvet), and the main button stands on the oak floor. Positions are measured from the photo, in container units, so the layout is identical at every width (`.hw-hero` in `globals.css` records the measurements). Phones use the square original in a 7:8 frame; from 640 px the room is widened to 2:1 with Cloudinary's generative fill (`home-hero-wide`, made once and stored). A different hero photo needs its alcove measured again.
- **The wall panel.** A stone panel with an inset hairline, like the moulded panels on the walls in the photos (`.hw-panel`). One or two per page, for the content that matters most (on the home page: how paying works).
- **The gold thread.** A thin gold line joining numbered steps, down on phones and across on desktops (`.hw-thread`). Only for real sequences.
- **Velvet grounds.** Wine sections with gold headings: one per page at most (on the home page: the fabrics).

## The home page (revision 3)

1. **Hero**: the owner's room, the promise in the alcove ("Choose it today. Pay when it's home."), "Shop sofas" on the floor; under it one line on delivery and payment and "Ask us on WhatsApp".
2. **Nothing to pay until it's in your room**: the three ordering steps on a wall panel with the gold thread; underneath, the guarantee, the 14 days and the person who checks every order.
3. **Shop by shape**: the owner's category photos with the top-view plans beside each name and how many there are to choose from; a velvet tile for everything.
4. **Our ranges**: one card per range (photo, name, sizes, made to order, from-price, colours), featured ranges first; a row to swipe on phones, a grid on desktops.
5. **Your sofa, in your fabric** (velvet ground): a swatch card of pinked swatches with their names, full rows only, light to dark, never green, pink or orange (the owner's rule; `isShowcaseColour`); samples and "See all 70 fabrics".
6. **Free delivery across mainland Britain**: a drawn map of the free-delivery area (mainland Great Britain and Anglesey, from about 240 coastline points; `scripts/build-britain-outline.mjs`) with the Burnley showroom marked by a gold heart; the instant postcode check; how to visit the showroom.
7. **Questions people ask**: heading beside the answers on desktops.

The header gains a row of categories on desktops (with Ranges, and All sofas from 1280 px); the footer puts the logo and contact details, the link columns and the newsletter side by side on desktops.

## Category, range, search and saved pages (revision 3, part R2)

- **Product tiles** (category pages, search): the photo with one label (electric, reclining or made to order) and the save heart; then the **range's name in Gloock** with the size underneath, said once ("Ashton" over "3+2 seater, high back", never the size twice); the price it starts from and the colours. Sizes are written in sentence case with commas ("Armed U-shape", "4 seater corner 2c1, high back").
- **Category pages**: the name in sentence case, "31 sofas, from £479", and on desktops the introduction with the category's top-view plan drawn large beside it. On phones the introduction moves to "About …" at the bottom so the sofas come first, the **shape rail** (every category with its plan, the current one in gold tint, centred on load) lets people hop between shapes, and the filter and sort bar stays pinned to the top while the grid scrolls (the Filter button turns gold when filters are on). Desktops use the header's category row instead of the rail; it underlines the page you're on.
- **Range pages** (the bold moment of R2): the range's room photo and its own introduction (`ranges.description`, migration `range_copy`), sizes, back styles, the from-price and colours, "Choose a size" and "Ask about …" on WhatsApp. Then **every size drawn to scale**: one card per size with its top view (`ScalePlan`) in real centimetres inside one frame shared by the whole range, standing on a common baseline, so a 2 seater and a 5 seater corner can be compared at a glance; under each, the measurement people compare first ("198 cm wide", "240 × 190 cm", "198 cm and 168 cm wide") and a row per back style with its price. Plans are velvet lines on white over stone, dashed seams for the back cushions, arms and seats. Then "Will it fit?" and other ranges.
- **Range cards** (home, ranges page, other ranges): photo, name in Gloock, sizes, made to order, from-price, colours. They size themselves with a container query: narrow cards (two across a phone) stack the price under the name, wider ones set it beside.
- **Search**: a large rounded field with the magnifier inside; with no results, "Browse by shape" (the rail) and popular searches. Search also reads each range's introduction, so "velvet" or "chesterfield" find the right ranges.
- **Saved**: tiles to match; an empty state with a gold-tint heart.

## The product page (revision 3, part R3)

- **Gallery**: square photos to swipe on phones (dots below), sticky beside the buy box on desktops with a row of thumbnails under the photo.
- **Heading**: "Made to order" and "Made in the UK" pills, then the **range's name in Gloock** (40 px phones, 52 px desktops) over the size in Figtree ("Salone" / "5 seater corner"); the full title is still the heading's text.
- **Price and the receipt**: the price with "Free delivery", then a small receipt with what's paid when: **Pay today £0** (in velvet) and **Pay on delivery £699**, "cash or bank transfer to the driver, once it's in your room". While an ad visitor's offer is live it comes off the "on delivery" line. The same two lines as the "Added to your basket" sheet, so the promise reads the same all the way to checkout. Paying on delivery is no longer repeated in the promise rows below.
- **Size cards**: each size with its top view drawn to the range's shared scale (the range page's drawings, small), its name in sentence case and its price. Back styles stay a segmented control, in sentence case.
- **Fabric button**: three pinked swatches, light, middle and dark, picked by the same rule as the home page (never green, pink or orange).
- **Will it fit?** (the page's panel, `.hw-panel`): the top view drawn to scale with every measurement on white, the door check beside it, a line on sections (or two separate sofas for a 3+2), and "How to measure up".
- **About {range}**: the description (open), specifications, delivery and returns, care; reviews (the honest empty state until real ones arrive) beside it on desktops; then "You might also like".

## Components (as drawn in the revision 2 preview)

Same set as revision 1, recoloured: announcement bar (wine with a thin gold rule), header (mark + wordmark, rose count badge now velvet), primary (velvet sheen), secondary (velvet outline), WhatsApp, on-wine (gold gradient), disabled; promise tiles (stone); how ordering works (gold-gradient numbers); shop by shape (top-view plans); product card; colour swatches (velvet ring); pinking-shear fabric swatches; size cards (velvet border on gold tint); segmented control (velvet); postcode check; delivery extras; measurements (gold dimension lines); will it fit; accordions; honest reviews empty state; sticky buy bar; basket sheet; offer strip (gold tint, gold heart); footer (wine, gold logo).

## Icons

Line icons, 24 px grid, 1.75 px stroke, rounded caps and joins, in velvet on light grounds and pale gold on wine. Build: **Phosphor Icons (regular)**. Shape tiles use custom top-view plan drawings.

## Photography

- **Revision 3: the owner's own photos** (Cloudinary `heartwell/Product Images/…`, Phase 17A) are what the shop shows: every piece in the same panelled room with the velvet alcove. Widened versions for wide screens are made once with generative fill, checked by eye and stored as their own files, never generated on the fly.
- Revision 2 (design-stage samples, no longer used): main product photos: the real product with an AI-generated **bright, elegant British living room**: soft white painted wall panelling, light oak floorboards, a brass floor lamp, soft morning daylight. Made with Cloudinary generative background replace, prompt `bright elegant British living room with soft white painted wall panelling and light oak floorboards and a brass floor lamp and soft morning daylight`, seed fixed per batch (seed 21 for the samples).
- Only the room changes; anything distorted is regenerated or rejected; every photo approved by a person (admin Photos page).
- The samples sit a little small in frame. Phase 6 adds a tighter crop (`g_auto` fill) so the sofa fills more of a square, and tightens wall colour consistency (one sample came out greige).
- Square for product pages and catalogue ads, 4:5 for Instagram.

## Motion

Only in answer to the customer: basket sheet slides up (260 ms); accordions and selections 150–200 ms. Nothing animates on its own (revision 3 keeps this: the hero is striking because of the photo and the lettering, not movement). `prefers-reduced-motion` turns slides off.

## Voice

Plain and specific, honest even when it costs us, British and warm, never pushy. Sentence case. Buttons say exactly what happens.

## Accessibility

WCAG 2.2 AA: contrast as above, visible focus ring (`0 0 0 3px white, 0 0 0 5px velvet`), real buttons and labels, 44 px targets, errors in words, no meaning by colour alone, reduced-motion support, alt text naming the product and colour. Gold gradients never sit behind small text.
