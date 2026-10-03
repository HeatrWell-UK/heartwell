# Heartwell — Design system

Status: **revision 2, waiting for the owner's approval** (3 October 2026)
Preview: https://claude.ai/artifact/EDNrBLMoJGDt8MR2NtuR5y (brand, style guide, phone home page, phone product page)
Source: `design/canvas/project/*.dc.html` · logo files: `design/logo/` · logo build scripts: `design/logo-work/`

Direction name: **Red Velvet and Gold**. Deep velvet red for every action, metallic gold for the finishing touches, white and soft stone behind everything. Phone first, built for the Facebook and Instagram in-app browsers.

Revision history: revision 1 ("Daylight and Velvet", green and rose, new logo) was rejected by the owner on 3 October 2026: keep the original logo, recolour it; red velvet and golden gradients; no green or pink. Layout, fonts and components stayed the same in revision 2.

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

Unchanged from revision 1:

- **Besley** (Google Fonts, variable, self-hosted via `next/font`): headings and prices. 700 for headings.
- **Figtree**: all body text, labels and buttons. 400/500/600/700.

| Role | Phone | Desktop | Notes |
| --- | --- | --- | --- |
| Display (H1) | Besley 700, 36/40 | 52/56 | letter-spacing −0.015em, `text-wrap: balance` |
| H2 | Besley 700, 28/32 | 34/40 | |
| H3 | Besley 700, 22/28 | 24/30 | |
| Price | Besley 700, 20–32 | same | £749; pence only when needed |
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

## Components (as drawn in the preview)

Same set as revision 1, recoloured: announcement bar (wine with a thin gold rule), header (mark + wordmark, rose count badge now velvet), primary (velvet sheen), secondary (velvet outline), WhatsApp, on-wine (gold gradient), disabled; promise tiles (stone); how ordering works (gold-gradient numbers); shop by shape (top-view plans); product card; colour swatches (velvet ring); pinking-shear fabric swatches; size cards (velvet border on gold tint); segmented control (velvet); postcode check; delivery extras; measurements (gold dimension lines); will it fit; accordions; honest reviews empty state; sticky buy bar; basket sheet; offer strip (gold tint, gold heart); footer (wine, gold logo).

## Icons

Line icons, 24 px grid, 1.75 px stroke, rounded caps and joins, in velvet on light grounds and pale gold on wine. Build: **Phosphor Icons (regular)**. Shape tiles use custom top-view plan drawings.

## Photography

- Main product photos: the real product with an AI-generated **bright, elegant British living room**: soft white painted wall panelling, light oak floorboards, a brass floor lamp, soft morning daylight. Made with Cloudinary generative background replace, prompt `bright elegant British living room with soft white painted wall panelling and light oak floorboards and a brass floor lamp and soft morning daylight`, seed fixed per batch (seed 21 for the samples).
- Only the room changes; anything distorted is regenerated or rejected; every photo approved by a person (admin Photos page).
- The samples sit a little small in frame. Phase 6 adds a tighter crop (`g_auto` fill) so the sofa fills more of a square, and tightens wall colour consistency (one sample came out greige).
- Square for product pages and catalogue ads, 4:5 for Instagram.

## Motion

Only in answer to the customer: basket sheet slides up (260 ms); accordions and selections 150–200 ms. Nothing animates on its own. `prefers-reduced-motion` turns slides off.

## Voice

Plain and specific, honest even when it costs us, British and warm, never pushy. Sentence case. Buttons say exactly what happens.

## Accessibility

WCAG 2.2 AA: contrast as above, visible focus ring (`0 0 0 3px white, 0 0 0 5px velvet`), real buttons and labels, 44 px targets, errors in words, no meaning by colour alone, reduced-motion support, alt text naming the product and colour. Gold gradients never sit behind small text.
