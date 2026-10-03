# Heartwell — progress log

Newest entry first. Each entry records what was done, where things stand, anything waiting on the owner, and the next prompt. A new session reads this, `CLAUDE.md` and `docs/PLAN.md`, then carries on.

## Current status

| | |
| --- | --- |
| **Current phase** | Phase 2 (design): revision 2 (red velvet and gold, original logo) published, **waiting for the owner's approval or changes** |
| **Design preview** | https://claude.ai/artifact/EDNrBLMoJGDt8MR2NtuR5y · spec in `docs/DESIGN.md` · source in `design/` |
| **Next phase** | Phase 3: Foundations (after the design is approved) |
| **Next prompt** | After design approval: `Phase 3 — Foundations. Read CLAUDE.md, docs/PLAN.md, docs/DESIGN.md and docs/PROGRESS.md, then build Phase 3. GitHub organisation: <org>. The empty private repo <org>/heartwell exists. Staging password: <password>. I'm logged into hPanel on the hosting account and ready to follow your steps.` |
| **Staging link** | Not yet (created in Phase 3) |
| **Production** | Not yet (go-live is Phase 19) |
| **Open decisions** | D1–D11 in `docs/PLAN.md` section 10 |

## Known facts (so nobody has to ask again)

- Hosting account: Hostinger **Business Web Hosting**, 2 Node.js app slots free (the other 3 are used/in preview). Staging and production take both.
- Domains (heartwellfurniture.co.uk, heartwellsofa.co.uk) are on the owner's separate Hostinger account. heartwellsofa.co.uk email must keep working.
- Customer email: enquiries@heartwellsofa.co.uk (one setting).
- OrderFlow: the **same** OrderFlow as the sister shop, with its own key; Heartwell orders are tagged (HW- references).
- "Visit us": Heartwell has its **own address** (different from the sister's showroom); details to come in Phase 16.
- **Never mention the sister shop** on the Heartwell site (the owner chose to keep them separate).
- Heartwell's Cloudinary (connected via MCP): Free plan, 25 credits/month, empty as of 3 Oct 2026.
- The Supabase account connected via MCP had no projects as of 3 Oct 2026.
- Logo concept: `reference/Logo-Concept.jpeg` (brown/cream heart-shaped sofa, "Heartwell / SOFA").
- Sister repo cloned read-only at `../sister-uksofashop-readonly` (from a zip of master on 3 Oct 2026; no git history).

## Log

### 3 October 2026 — Phase 2: design revision 2 (red velvet and gold)
- Owner feedback on revision 1: good, but keep the **original logo** (only change its colour), use **red velvet and golden gradients**, **no green or pink**. Everything else unchanged.
- Logo: traced the original to vector in Cloudinary (`heartwell/brand/logo-concept-original`), recoloured with `design/logo-work/build.mjs`: red velvet sofa and wordmark, gold-gradient cushion/legs/"SOFA" on white; gold wordmark and frame on wine. Files in `design/logo/` (full logo, mark, wordmark, each with a reversed version). Cloudinary's simple colour-replace gave muddy results and wasn't used.
- Palette: velvet red #8E1B2E (buttons with a velvet sheen gradient), wine #4A0D17, metallic gold gradient, gold tint, white and stone grounds. No cream, no flat amber (sister shop).
- Photos regenerated with soft white panelled walls, oak floors and a brass lamp (seed 21), replacing the sage walls; about 1.6 more Cloudinary credits.
- Recoloured all four boards (same layouts) and republished. `docs/DESIGN.md` rewritten as revision 2. The artifact is now shared "anyone with the link" (owner's change).
- **Waiting on:** approval of revision 2.
- The owner couldn't see the canvas: it loads slowly on phones and opens zoomed out or off-screen. Fix: `design/render-static.mjs` renders every board to plain HTML in `design/static/`, and headless Chrome screenshots were sent to the owner as images. Also fixed: footers recoloured to wine (they had come out bright red), the product board shortened, and the "Heartwell" wordmark crop tightened (stray marks from the sofa legs). For future design rounds, send images as well as the canvas link.

### 3 October 2026 — Phase 2: design proposed
- The owner left every design and photo decision to me ("our customers are from the UK") and was happy for the logo to change completely.
- Direction **Daylight and Velvet**: velvet green #1E3A2F for actions, rose #C23B5E as the heart accent, sage-mist and chalk grounds (no cream, no amber), Besley headings and prices, Figtree body, CSS-only motion. Signature details: the heart-sofa logo, a heart-topped hero frame (home only), pinking-shear fabric swatches, top-view plan drawings for shop-by-shape.
- **New logo** drawn as vector: a sofa whose backrest is a heart (`design/logo/`). Tagline "Sofas and furniture" replaces "Sofa".
- **Photos tested on Heartwell's Cloudinary** (cloud `iv3tp2iq`): 8 originals copied to `heartwell/source/` (untouched). Background removal + backdrop failed (kept the original dark floor shadow). Generative background replace into a bright sage-panelled room with oak floor worked in 7 of 8 (Ashton came back with a white wall). Plan section 6.3, D3 and Phase 6 updated. About 2 credits used.
- Published the design canvas (brand, style guide, phone home page, interactive phone product page): https://claude.ai/artifact/EDNrBLMoJGDt8MR2NtuR5y. Spec saved to `docs/DESIGN.md`.
- **Waiting on:** the owner's approval or change requests. After approval: Phase 3 (needs GitHub org + empty private repo `heartwell`, hPanel access, a staging password).

### 3 October 2026 — Plan approved; Phase 2 started
- The owner approved `docs/PLAN.md` as written (no changes). Decisions D1–D11 are still open and are picked up in the phases that need them.
- Phase 2: asked the owner for design instructions and the logo idea.

### 3 October 2026 — Steps 1 and 2: study and plan
- Downloaded the sister repository (master) read-only to `../sister-uksofashop-readonly` and studied the README, docs, all source, 56 migrations, CI workflows, `reference/sister-schema.sql` and `reference/catalogue/`.
- Found that the sister shop has already moved from Vercel to Hostinger (its README is out of date), and that its server tracking switch depends on `VERCEL_ENV`.
- Asked the owner the four things the repository can't answer: hosting plan (Business, 2 slots free), OrderFlow (same, tagged), showroom (own address), sister link (keep separate).
- Checked current docs: Next.js 16.3.x is the current LTS line; Hostinger runs Node.js apps on Business and Cloud plans with GitHub auto-deploy and no preview deployments; Cloudinary background removal = 75 transformations per image and generative background replace = 230; the UK cookie exemptions for analytics took effect on 5 February 2026 (ICO guidance 29 April 2026).
- Wrote `docs/PLAN.md` (19 phases plus later phases, feature map, tracking, catalogue and photo plans, deployment, what's needed from the owner, decisions), `CLAUDE.md` and this log.
- **Waiting on:** the owner's approval of the plan.

## 3 October 2026 — Phase 3 Foundations (in progress, paused at usage limit)

Decisions:
- GitHub org **HeatrWell-UK**, private repo **heartwell**. No preview password: the owner wants the preview open to anyone (it stays noindex).
- **Hosting during the build: Vercel** (team "Heartwell", Hobby, region lhr1). Hobby is non-commercial only, so before real orders or ads we move to Hostinger Node.js (or Vercel Pro). Code stays portable: own `APP_ENV` gate, `externalOrigin`, pg_cron jobs, no Vercel-only features.

Done:
- Next.js 16 / React 19 / TS strict / Tailwind v4 scaffold, ESLint, Vitest, config files (env, site, brand, contact, promises, navigation).
- Design tokens in `globals.css`, brand assets script (icons, favicon, OG image), Cloudinary loader, security headers and noindex in `next.config.ts`.
- UI kit (Button, Field, Badge, Price, Accordion), Logo, AnnouncementBar, Header, swipe MenuDrawer, Footer.
- `layout.tsx`, home page (Hero, PromiseTiles, HowOrderingWorks), not-found, error, global-error, robots, manifest, `/api/health`.

Still to do in Phase 3:
1. `/styleguide` page (noindex).
2. `scripts/check-sister-leaks.mjs` (`--staged` / `--all`, obfuscated patterns, skip docs/ and CLAUDE.md), `.githooks/pre-commit`, `.github/workflows/ci.yml` (Node 24: leaks, lint, typecheck, test, build).
3. `.env.example`, `README.md`, tests (loader, format, leak scanner).
4. `npm run verify` and fix anything it finds (not yet run on the new pages).
5. `git init -b main`, `core.hooksPath .githooks`, first commit, `staging` branch, push both to HeatrWell-UK/heartwell (owner completes the GitHub sign-in popup).
6. Vercel project "heartwell" linked to the repo: lhr1, Node 24.x, env `NEXT_PUBLIC_APP_ENV` (preview=staging, production=production), `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPPORT_EMAIL`; no `SITE_INDEXABLE`. If Hobby refuses the private org repo, install the Vercel GitHub App on the org or deploy by CLI.
7. Update PLAN.md (section 8, Phase 3, Phase 19 plus a Hostinger rehearsal step) and CLAUDE.md (Vercel during the build, open preview).
8. Phone checklist, preview link, Phase 4 prompt.
