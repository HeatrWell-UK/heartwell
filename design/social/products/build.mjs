// Instagram and Facebook carousel posts, one per range, 1080 x 1440 (3:4).
//
//   node design/social/products/build.mjs ashton                one range, in its turn's style
//   node design/social/products/build.mjs ashton --style bold   one range, in a chosen style
//   node design/social/products/build.mjs all                   every range in copy.mjs
//
// Sizes, prices, measurements, photos and fabrics come from the live shop (the
// public API, the same columns visitors can read), so the slides always match
// the site on the day they're made. Re-run after a price change. Words that
// aren't data (cover lines, close-ups, captions) live in copy.mjs, in posting
// order: the first range is drawn in the velvet style, the second bold, the
// third editorial, then round again (styles.mjs), so the grid alternates.
//
// Slides: cover, close-ups (when copy.mjs has them), every size drawn to scale
// (ranges with more than one size), one slide per size (per piece in the bold
// style), fabrics (made-to-order ranges) and how ordering works. Was-prices are
// never shown: a post stays up long after a deal ends.
//
// Output (git-ignored): design/social/products/out/<range>/NN-*.png and post.txt
// (captions and alt text). Rendered with headless Chrome, like design/social/*.html.

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { tmpdir } from 'node:os'
import { COPY } from './copy.mjs'
import { STYLES, ROTATION } from './styles.mjs'
import { ROOT, W, H, SITE, PHONE, money, sentence, layoutOf, headline, measurements, swatches } from './lib.mjs'

const OUT = join(ROOT, 'design/social/products/out')
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const MAX_SLIDES = 20 // Instagram's limit

// ---------------------------------------------------------------- data

function env() {
  const vars = {}
  const file = join(ROOT, '.env.local')
  if (existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line)
      if (m) vars[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? vars.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? vars.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are needed (.env.local)')
  return { url, key }
}

async function api(path) {
  const { url, key } = env()
  const res = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key } })
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`)
  return res.json()
}

async function loadRange(slug) {
  const select = [
    'slug,name,description,',
    'products(slug,title,axis1_value,axis2_value,base_price,width_cm,depth_cm,height_cm,side_a_cm,side_b_cm,made_to_order,origin,highlights,sort,is_active,',
    'type:product_types(material_kinds),',
    'variants:product_variants(sku,colour_name,material_label,image_url,price_adjustment,is_active,sort))',
  ].join('')
  const rows = await api(`ranges?slug=eq.${encodeURIComponent(slug)}&select=${select}&products.is_active=eq.true&products.order=sort`)
  const range = rows[0]
  if (!range) throw new Error(`No range "${slug}"`)
  const pieces = range.products
    .map((p) => {
      const variants = p.variants.filter((x) => x.is_active && x.image_url).sort((a, b) => a.sort - b.sort)
      return variants.length ? { ...p, variants, variant: variants[0], price: Number(p.base_price) + Number(variants[0].price_adjustment ?? 0) } : null
    })
    .filter(Boolean)
  if (pieces.length === 0) throw new Error(`"${slug}" has no photographed pieces on sale`)
  const kinds = [...new Set(pieces.filter((p) => p.made_to_order).flatMap((p) => p.type?.material_kinds ?? []))]
  const collections = kinds.length
    ? await api(`material_collections?select=name,kind,surcharge,sort,materials(code,name,hex,image_url,sort,is_active)&kind=in.(${kinds.join(',')})&order=sort`)
    : []
  return { ...range, pieces, collections }
}

// ---------------------------------------------------------------- what every style draws from

const lower = (s) => String(s ?? '').toLowerCase()

function context(range, copy) {
  const pieces = range.pieces
  const photoOf = (slug) => (pieces.find((p) => p.slug === slug) ?? pieces[0]).variant.image_url
  const option = (p, v, label) => {
    const l = layoutOf(p, pieces)
    return {
      label,
      slug: p.slug,
      piece: p,
      image: v.image_url,
      colour: v.colour_name,
      material: v.material_label,
      price: Number(p.base_price) + Number(v.price_adjustment ?? 0),
      note: copy.photoNotes?.[p.slug],
      set: p.axis1_value.includes('+'),
      depth: p.depth_cm,
      height: p.height_cm,
      dims: [headline(l), p.depth_cm ? `${p.depth_cm} cm deep` : null, p.height_cm ? `${p.height_cm} cm high` : null].filter(Boolean),
    }
  }

  const sizesInOrder = [...new Set(pieces.map((p) => p.axis1_value))]
  const groups = sizesInOrder.map((size) => {
    const ps = pieces.filter((p) => p.axis1_value === size)
    const first = ps[0]
    const options =
      ps.length > 1
        ? ps.map((p) => option(p, p.variant, sentence(p.axis2_value ?? p.variant.colour_name)))
        : first.variants.length > 1
          ? first.variants.slice(0, 2).map((v) => option(first, v, v.colour_name))
          : [option(first, first.variant, first.axis2_value ? sentence(first.axis2_value) : first.variant.colour_name)]
    const same = (k) => options.every((o) => o[k] === options[0][k])
    for (const o of options) o.sub = [same('depth') || !o.depth ? null : `${o.depth} cm deep`, o.set ? 'both sofas' : null].filter(Boolean).join(' · ')
    const layout = layoutOf(first, pieces)
    return {
      size,
      label: sentence(size),
      layout,
      headline: headline(layout),
      common: [headline(layout), same('depth') && first.depth_cm ? `${first.depth_cm} cm deep` : null, same('height') && first.height_cm ? `${first.height_cm} cm high` : null].filter(Boolean).join(' · '),
      from: Math.min(...ps.map((p) => p.price)),
      options,
    }
  })

  const fabricList = range.collections.flatMap((c) => c.materials.filter((m) => m.is_active !== false))
  const mto = pieces.find((p) => p.made_to_order)
  const cover = pieces.find((p) => p.slug === copy.cover) ?? pieces[0]
  const coverGroup = groups.findIndex((g) => g.size === cover.axis1_value)
  // The editorial cover's second photo: a size away from the cover's, never one with a note (a prop in shot).
  const tileGroup = groups.length > 1 ? groups[(coverGroup + Math.ceil(groups.length / 2)) % groups.length] : null
  const tilePiece = copy.coverTile
    ? pieces.find((p) => p.slug === copy.coverTile.photo)
    : tileGroup
      ? (tileGroup.options.find((o) => !o.note) ?? groups.flatMap((g) => g.options).find((o) => !o.note && o.piece !== cover) ?? tileGroup.options[0]).piece
      : null
  const highlights = (pieces[0].highlights ?? []).filter(Boolean)
  const backs = new Set(pieces.map((p) => p.axis2_value).filter(Boolean)).size
  const madeIn = mto && mto.origin === 'uk' ? 'made to order in the UK' : pieces.some((p) => p.origin === 'uk') ? 'made in the UK' : null
  return {
    range,
    copy,
    pieces,
    groups,
    photoOf,
    cover,
    from: Math.min(...pieces.map((p) => p.price)),
    backs,
    madeToOrder: Boolean(mto),
    highlights,
    detailsLine: copy.detailsLine ?? highlights.slice(-2).join('. ') + '.',
    metaLine: [`${groups.length} ${groups.length === 1 ? 'size' : 'sizes'}`, backs > 1 ? 'high or scattered back' : null, madeIn].filter(Boolean).join(' · '),
    coverTile: tilePiece ? { image: tilePiece.variant.image_url, label: copy.coverTile?.label ?? (groups.length > 1 ? `${groups[0].label} to ${groups.at(-1).label}` : sentence(tilePiece.axis1_value)) } : null,
    fabrics: {
      count: fabricList.length,
      samePrice: range.collections.length > 0 && range.collections.every((c) => Number(c.surcharge) === 0),
      shown: mto ? `${lower(mto.variant.colour_name)} ${lower(mto.variant.material_label)}`.trim() : '',
      picks: (k) => swatches(range.collections, k),
    },
  }
}

// ---------------------------------------------------------------- slides and their alt text

function slidesFor(ctx, style) {
  const { range, copy, groups } = ctx
  const room = 'in a panelled room with a red velvet alcove'
  const detail = copy.altDetail ? ` ${copy.altDetail}` : ''
  const slides = [
    {
      name: 'cover',
      html: style.cover(ctx),
      alt: `${range.name} from Heartwell: ${groups.length} ${groups.length === 1 ? 'size' : 'sizes'} from ${money(ctx.from)}. ${copy.tagline.replace(/ · /g, ', ')}. Free delivery to most postcodes; pay nothing until it arrives.`,
    },
  ]
  if (copy.details?.length) {
    slides.push({ name: 'details', html: style.details(ctx), alt: `Close-ups of the ${range.name}: ${copy.details.map((d) => lower(d.label)).join(', ')}.` })
  }
  if (groups.length > 1) {
    slides.push({
      name: 'sizes',
      html: style.sizes(ctx),
      alt: `Every ${range.name} size drawn to the same scale: ${groups.map((g) => `${lower(g.label)}, ${g.headline}, from ${money(g.from)}`).join('; ')}.`,
    })
  }
  const optionAlt = (g, o) =>
    `${range.name} ${lower(g.label)}${g.options.length > 1 ? `, ${lower(o.label)}` : ''}, in ${lower(o.colour)} ${lower(o.material)}${detail}, ${room}. ${measurements(o.piece, ctx.pieces)}. ${money(o.price)}${o.set ? ' for both sofas' : ''}.${o.note ? ` ${o.note}.` : ''}`
  const slug = (s) => lower(s).replace(/\+/g, '-').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  if (style.perPiece) {
    for (const g of groups) for (const o of g.options) slides.push({ name: slug(`${g.size} ${g.options.length > 1 ? o.label : ''}`), html: style.piece(ctx, g, o), alt: optionAlt(g, o) })
  } else {
    groups.forEach((g, i) => slides.push({ name: slug(g.size), html: style.size(ctx, g, i + 1), alt: g.options.map((o) => optionAlt(g, o)).join(' ') }))
  }
  if (ctx.madeToOrder && ctx.fabrics.count) {
    slides.push({
      name: 'fabrics',
      html: style.fabrics(ctx),
      alt: `${range.name} is made to order in the UK in any of our ${ctx.fabrics.count} fabrics. Fabric swatches, from light to dark: ${ctx.fabrics.picks(12).map((f) => lower(f.name)).join(', ')}.`,
    })
  }
  slides.push({
    name: 'how-to-order',
    html: style.order(ctx),
    alt: `How ordering works at Heartwell: choose your sofa at ${SITE} or on WhatsApp, confirm your order with nothing to pay, free delivery to most of mainland Britain in 2 to 4 working days, then pay the driver in cash or by bank transfer. WhatsApp ${PHONE}.`,
  })
  // Over Instagram's limit: the overview slides go first.
  for (const name of ['sizes', 'details']) {
    if (slides.length > MAX_SLIDES) slides.splice(slides.findIndex((s) => s.name === name), 1)
  }
  if (slides.length > MAX_SLIDES) throw new Error(`${range.slug}: ${slides.length} slides, Instagram takes ${MAX_SLIDES} at most`)
  return slides
}

// ---------------------------------------------------------------- captions

function postText(ctx, styleName, files) {
  const { range, copy } = ctx
  const data = {
    range,
    sizes: ctx.groups.map((g) => ({ size: g.size, label: g.label, from: g.from })),
    money,
    from: money(ctx.from),
    fabrics: ctx.fabrics.count,
    samePrice: ctx.fabrics.samePrice,
    link: `https://${SITE}/ranges/${range.slug}?utm_source=facebook&utm_medium=social&utm_campaign=range-${range.slug}`,
  }
  return [
    `${range.name}: post kit (${styleName} style), made ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    `Prices are the shop's prices on that day. Re-make the slides after a price change.`,
    '',
    '== Instagram caption (recommended) ==',
    copy.instagram(data),
    '',
    '== Instagram caption (other option) ==',
    copy.instagramAlt(data),
    '',
    '== Facebook caption ==',
    copy.facebook(data),
    '',
    '== Alt text, one per slide (Instagram: Advanced settings, Accessibility; Facebook: Edit on each photo, Alternative text) ==',
    files.map((f) => `${f.file}\n${f.alt}`).join('\n\n'),
    '',
  ].join('\n')
}

// ---------------------------------------------------------------- render

function render(htmlFile, pngFile) {
  const r = spawnSync(
    CHROME,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--window-size=${W},${H}`,
      '--virtual-time-budget=15000',
      `--user-data-dir=${join(tmpdir(), 'hw-social-chrome')}`,
      `--screenshot=${pngFile}`,
      pathToFileURL(htmlFile).href,
    ],
    { stdio: 'pipe', timeout: 90_000 },
  )
  if (r.status !== 0 || !existsSync(pngFile)) throw new Error(`Chrome failed on ${htmlFile}: ${r.stderr?.toString() ?? r.error}`)
}

async function build(slug, styleName, preview) {
  const copy = COPY[slug]
  if (!copy) throw new Error(`No words for "${slug}" in copy.mjs yet`)
  const style = STYLES[styleName]
  if (!style) throw new Error(`No style "${styleName}" (${Object.keys(STYLES).join(', ')})`)
  const ctx = context(await loadRange(slug), copy)
  const slides = slidesFor(ctx, style)
  // A range in another style than its turn goes to its own folder, so it never replaces the post.
  const dir = join(OUT, preview ? `${slug}-${styleName}` : slug)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(join(dir, 'html'), { recursive: true })
  // Cloudinary makes each new crop on its first request, which can outlast Chrome's wait: ask for them all first.
  const urls = [...new Set(slides.flatMap((s) => s.html.match(/https:\/\/res\.cloudinary\.com\/[^"')\s]+/g) ?? []))]
  await Promise.all(urls.map((u) => fetch(u).then((r) => r.arrayBuffer()).catch(() => null)))
  const files = []
  for (const [i, s] of slides.entries()) {
    const base = `${String(i + 1).padStart(2, '0')}-${s.name}`
    const html = join(dir, 'html', `${base}.html`)
    const png = join(dir, `${base}.png`)
    writeFileSync(html, s.html)
    render(html, png)
    files.push({ file: `${base}.png`, alt: s.alt })
    process.stdout.write(`  ${base}.png\n`)
  }
  writeFileSync(join(dir, 'post.txt'), postText(ctx, styleName, files))
  console.log(`${ctx.range.name} (${styleName}): ${files.length} slides and post.txt in ${dir}`)
}

const [arg, flag, value] = process.argv.slice(2)
if (!arg) {
  console.error('Usage: node design/social/products/build.mjs <range-slug|all> [--style velvet|bold|editorial]')
  process.exit(1)
}
const order = Object.keys(COPY)
for (const slug of arg === 'all' ? order : [arg]) {
  const turn = COPY[slug]?.style ?? ROTATION[order.indexOf(slug) % ROTATION.length]
  const chosen = flag === '--style' ? value : turn
  await build(slug, chosen, chosen !== turn)
}
