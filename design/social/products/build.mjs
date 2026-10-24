// Instagram and Facebook carousel posts, one per range, 1080 x 1440 (3:4).
//
//   node design/social/products/build.mjs ashton        one range
//   node design/social/products/build.mjs all           every range that has words in copy.mjs
//
// Sizes, prices, measurements, photos and fabrics come from the live shop (the
// public API, the same columns visitors can read), so the slides always match
// the site on the day they're made. Re-run after a price change. Words that
// aren't data (the cover line, captions) live in copy.mjs.
//
// Slides: the cover (the range's name lit in the photo's alcove), one slide per
// piece (photo, size, measurements, price), the fabrics (made-to-order ranges)
// and how ordering works. Facebook trims tall photos to 4:5 in the feed, so all
// words stay inside the middle 1080 x 1350 (45 px clear at top and bottom).
// Was-prices are never shown: a post stays up long after a deal ends.
//
// Output (git-ignored): design/social/products/out/<range>/NN-*.png and post.txt
// (captions and alt text). Rendered with headless Chrome, like design/social/*.html.

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { tmpdir } from 'node:os'
import { COPY } from './copy.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../..')
const OUT = join(HERE, 'out')
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const SITE = 'heartwellsofa.co.uk'
const W = 1080
const H = 1440

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
    'products(slug,title,axis1_value,axis2_value,base_price,width_cm,depth_cm,height_cm,side_a_cm,side_b_cm,made_to_order,origin,sort,is_active,',
    'type:product_types(material_kinds),',
    'variants:product_variants(sku,colour_name,material_label,image_url,price_adjustment,is_active,sort))',
  ].join('')
  const rows = await api(`ranges?slug=eq.${encodeURIComponent(slug)}&select=${select}&products.is_active=eq.true&products.order=sort`)
  const range = rows[0]
  if (!range) throw new Error(`No range "${slug}"`)
  const pieces = range.products
    .map((p) => {
      const v = p.variants.filter((x) => x.is_active && x.image_url).sort((a, b) => a.sort - b.sort)[0]
      return v ? { ...p, variant: v, price: Number(p.base_price) + Number(v.price_adjustment ?? 0) } : null
    })
    .filter(Boolean)
  if (pieces.length === 0) throw new Error(`"${slug}" has no photographed pieces on sale`)

  const kinds = [...new Set(pieces.filter((p) => p.made_to_order).flatMap((p) => p.type?.material_kinds ?? []))]
  const collections = kinds.length
    ? await api(`material_collections?select=name,kind,surcharge,sort,materials(code,name,hex,image_url,sort,is_active)&kind=in.(${kinds.join(',')})&order=sort`)
    : []
  return { ...range, pieces, collections }
}

// ---------------------------------------------------------------- words and numbers

const money = (n) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: n % 1 ? 2 : 0 }).format(n)
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** "5 Seater Corner" → "5 seater corner", "U-Shape" → "U-shape" (the site's sentence case). */
function sentence(s) {
  const t = s.toLowerCase().replace(/\bu-shape/g, 'U-shape')
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/** "3+2 seater, high back": the size said once, as on the site's tiles. */
const sizeLabel = (p) => [sentence(p.axis1_value), p.axis2_value?.toLowerCase()].filter(Boolean).join(', ')

/** For alt text: "2 seater sofa, high back", "3+2 seater set, scattered back", "Armchair". */
function altName(p) {
  const size = sentence(p.axis1_value)
  const noun = /chair|stool/i.test(size) ? '' : size.includes('+') ? ' set' : ' sofa'
  return `${size}${noun}${p.axis2_value ? `, ${p.axis2_value.toLowerCase()},` : ''}`
}

/** The measurement people compare first, then depth and height (the site's planSummary). */
function measurements(p, range) {
  const cm = (n) => `${Number.isInteger(Number(n)) ? Number(n) : Number(n).toFixed(1)} cm`
  const size = p.axis1_value.toLowerCase()
  const parts = []
  if (size.includes('+')) {
    const two = range.pieces.find((x) => /^2 seater$/i.test(x.axis1_value) && x.axis2_value === p.axis2_value)
    parts.push(two ? `${cm(p.width_cm)} and ${cm(two.width_cm)} wide` : `3 seater ${cm(p.width_cm)} wide`)
  } else if (size.includes('u-shape') && p.side_a_cm) {
    parts.push(`${cm(p.width_cm)} wide, sides ${p.side_a_cm === p.side_b_cm ? cm(p.side_a_cm) : `${p.side_a_cm} and ${cm(p.side_b_cm)}`}`)
  } else if (p.side_a_cm && p.side_b_cm) {
    parts.push(p.side_a_cm === p.side_b_cm ? `${cm(p.side_a_cm)} each way` : `${p.side_a_cm} × ${cm(p.side_b_cm)}`)
  } else if (p.width_cm) {
    parts.push(`${cm(p.width_cm)} wide`)
  }
  if (p.depth_cm) parts.push(`${cm(p.depth_cm)} deep`)
  if (p.height_cm) parts.push(`${cm(p.height_cm)} high`)
  return parts.join(' · ')
}

/** Sizes in the catalogue's order, each with its lowest price. */
function sizes(range) {
  const out = []
  for (const p of range.pieces) {
    const s = out.find((x) => x.size === p.axis1_value)
    if (s) s.from = Math.min(s.from, p.price)
    else out.push({ size: p.axis1_value, label: sentence(p.axis1_value), from: p.price })
  }
  return out
}

// The home page's swatch rule (src/lib/home/picks.ts): never green, pink or
// orange on the shop's own pages; distinct colours, light to dark.
function hsl(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex?.trim() ?? '')
  if (!m) return null
  const n = parseInt(m[1], 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = d / (1 - Math.abs(2 * l - 1))
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return { h: h * 60, s, l }
}
function isShowcaseColour(hex) {
  const c = hsl(hex)
  if (!c) return false
  const { h, s, l } = c
  if (s < 0.12) return true
  if (h >= 60 && h < 200) return false
  if ((h >= 290 || h < 12) && l > 0.55) return false
  if (h >= 12 && h < 50 && s > 0.55) return false
  return true
}
function swatches(collections, count) {
  const dist = (a, b) => {
    const p = (x) => [1, 3, 5].map((i) => parseInt(x.slice(i, i + 2), 16))
    const [x, y] = [p(a), p(b)]
    return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2])
  }
  const pool = []
  for (const c of collections) {
    for (const f of c.materials.filter((m) => m.is_active !== false).sort((a, b) => a.sort - b.sort)) {
      const hex = f.hex?.toUpperCase()
      if (!hex || !/^#[0-9A-F]{6}$/.test(hex) || !isShowcaseColour(hex)) continue
      if (pool.some((p) => p.name === f.name || dist(p.hex, hex) < 18)) continue
      pool.push({ name: f.name, hex, image: f.image_url, collection: c.name })
    }
  }
  pool.sort((a, b) => (hsl(b.hex)?.l ?? 0) - (hsl(a.hex)?.l ?? 0))
  if (pool.length <= count) return pool
  const step = (pool.length - 1) / (count - 1)
  return Array.from({ length: count }, (_, i) => pool[Math.round(i * step)])
}

/** A Cloudinary photo at exactly the size it's shown. */
const photo = (url, w = W, h = W) => url.replace('/image/upload/', `/image/upload/c_fill,w_${w},h_${h},q_95,f_jpg/`)

// ---------------------------------------------------------------- slides

const LOGO = pathToFileURL(join(ROOT, 'design/logo/hw-logo-reversed.svg')).href
const PINKED =
  'polygon(0% 0%,8.33% 5%,16.67% 0%,25% 5%,33.33% 0%,41.67% 5%,50% 0%,58.33% 5%,66.67% 0%,75% 5%,83.33% 0%,91.67% 5%,100% 0%,95% 8.33%,100% 16.67%,95% 25%,100% 33.33%,95% 41.67%,100% 50%,95% 58.33%,100% 66.67%,95% 75%,100% 83.33%,95% 91.67%,100% 100%,91.67% 95%,83.33% 100%,75% 95%,66.67% 100%,58.33% 95%,50% 100%,41.67% 95%,33.33% 100%,25% 95%,16.67% 100%,8.33% 95%,0% 100%,5% 91.67%,0% 83.33%,5% 75%,0% 66.67%,5% 58.33%,0% 50%,5% 41.67%,0% 33.33%,5% 25%,0% 16.67%,5% 8.33%)'

const page = (body, extraCss = '') => `<!doctype html><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Gloock&family=Figtree:wght@400;500;600&display=block" rel="stylesheet">
<style>
  html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:#fff;-webkit-font-smoothing:antialiased}
  body{position:relative;font-family:Figtree,sans-serif;color:#22171A}
  p,h1,h2{margin:0}
  .serif{font-family:Gloock,serif;font-weight:400}
  .gold{background-image:linear-gradient(100deg,#D6B260 0%,#F6E3A8 42%,#DDB968 68%,#F2DC9C 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
  .photo{position:absolute;left:0;top:0;width:${W}px;height:${W}px;display:block}
  .rule{position:absolute;left:0;right:0;top:${W}px;height:5px;background:linear-gradient(90deg,#94701F,#F2DC9C 50%,#94701F)}
  .band{position:absolute;left:0;right:0;top:${W + 5}px;bottom:0;box-sizing:border-box;padding:24px 60px 64px}
  ${extraCss}
</style>
${body}`

function coverSlide(range, copy) {
  const cover = range.pieces.find((p) => p.slug === copy.cover) ?? range.pieces[0]
  const s = sizes(range)
  const backs = new Set(range.pieces.map((p) => p.axis2_value).filter(Boolean)).size
  const from = Math.min(...range.pieces.map((p) => p.price))
  const what = [`${s.length} ${s.length === 1 ? 'size' : 'sizes'}`, backs > 1 ? `${backs} back styles` : null].filter(Boolean).join(', ')
  return page(
    `<img class="photo" src="${photo(cover.variant.image_url)}" alt="">
<h1 class="name serif gold">${esc(range.name)}</h1>
<p class="tagline">${esc(copy.tagline)}</p>
<div class="rule"></div>
<div class="band wine">
  <p class="what">${esc(what)}, from</p>
  <p class="from serif gold">${money(from)}</p>
  <p class="promise">Free delivery to most postcodes. Pay nothing until it arrives.</p>
  <p class="swipe">Swipe for every size and price&nbsp;&nbsp;&rarr;</p>
</div>`,
    `.name{position:absolute;left:0;right:0;top:${copy.alcove.nameY}px;transform:translateY(-50%);text-align:center;font-size:${copy.alcove.nameSize ?? 150}px;line-height:1.05;letter-spacing:-.01em;filter:drop-shadow(0 2px 10px rgb(30 4 8 / .55))}
  .tagline{position:absolute;left:0;right:0;top:${copy.alcove.taglineY}px;transform:translateY(-50%);text-align:center;font:500 34px/1.2 Figtree,sans-serif;color:#F2E4E6;letter-spacing:.01em;text-shadow:0 1px 8px rgb(30 4 8 / .6)}
  .wine{background:#4A0D17;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding-top:20px;padding-bottom:60px}
  .what{font:600 34px/1.2 Figtree,sans-serif;color:#F2E4E6}
  .from{font-size:104px;line-height:1;margin-top:4px}
  .promise{margin-top:14px;font:400 28px/1.3 Figtree,sans-serif;color:#EBDADD}
  .swipe{margin-top:12px;font:600 28px/1.3 Figtree,sans-serif;color:#E9CC7B}`,
  )
}

function pieceSlide(range, p, copy) {
  const set = p.axis1_value.includes('+')
  const madeIn = [p.made_to_order ? 'Made to order' : 'Ready made', p.origin === 'uk' ? 'in the UK' : null].filter(Boolean).join(' ')
  // Something in the photo that doesn't come with the piece (a prop footstool), said on the photo itself.
  const photoNote = copy.photoNotes?.[p.slug]
  return page(
    `<img class="photo" src="${photo(p.variant.image_url)}" alt="">
${photoNote ? `<p class="photo-note">${esc(photoNote)}</p>` : ''}
<div class="rule"></div>
<div class="band">
  <div class="info">
    <h2 class="range serif">${esc(range.name)}</h2>
    <p class="size">${esc(sizeLabel(p))}</p>
    <div class="buy">
      <p class="price serif">${money(p.price)}</p>
      <p class="note">${set ? 'Both sofas' : 'Free delivery'}</p>
    </div>
    <p class="dims">${esc(measurements(p, range))}</p>
  </div>
  <div class="foot"><span>${esc(madeIn)} · ${esc(p.variant.colour_name)} ${esc(p.variant.material_label?.toLowerCase() ?? '')}</span><span>${SITE}</span></div>
</div>`,
    `.info{display:grid;grid-template-columns:1fr auto;grid-template-areas:"range buy" "size buy" "dims dims";column-gap:32px;align-items:end}
  .range{grid-area:range;font-size:60px;line-height:1;letter-spacing:-.01em}
  .size{grid-area:size;margin-top:12px;font:600 40px/1.15 Figtree,sans-serif}
  .dims{grid-area:dims;margin-top:12px;font:400 30px/1.3 Figtree,sans-serif;color:#5E4F52;white-space:nowrap}
  .buy{grid-area:buy;text-align:right}
  .price{font-size:108px;line-height:.9;color:#8E1B2E}
  .note{margin-top:10px;font:500 28px/1.2 Figtree,sans-serif;color:#5E4F52}
  .foot{display:flex;justify-content:space-between;margin-top:20px;padding-top:16px;border-top:2px solid #E5DADB;font:500 26px/1.2 Figtree,sans-serif;color:#5E4F52}
  .photo-note{position:absolute;right:28px;top:${W - 28}px;transform:translateY(-100%);padding:10px 22px;border-radius:999px;background:rgb(34 23 26 / .72);color:#fff;font:500 26px/1.2 Figtree,sans-serif}`,
  )
}

function fabricSlide(range) {
  const fabrics = range.collections.flatMap((c) => c.materials.filter((m) => m.is_active !== false))
  const samePrice = range.collections.every((c) => Number(c.surcharge) === 0)
  const shown = range.pieces.find((p) => p.made_to_order)?.variant
  const picks = swatches(range.collections, 12)
  return page(
    `<div class="panel">
  <h2 class="serif">Your ${esc(range.name)}, in your fabric</h2>
  <p class="lead">Shown in ${esc(shown.colour_name.toLowerCase())} ${esc(shown.material_label?.toLowerCase() ?? '')}. Made to order in the UK in any of our ${fabrics.length} fabrics${samePrice ? ', all at the same price' : ''}.</p>
  <ul class="grid">${picks
    .map((f) => `<li><span class="swatch" style="background:${f.hex}${f.image ? ` url('${photo(f.image, 360, 360)}') center/cover` : ''}"></span><span class="fname">${esc(f.name)}</span></li>`)
    .join('')}</ul>
  <p class="more">See every fabric at ${SITE}/fabrics</p>
</div>`,
    `body{background:#F5F1EF}
  .panel{position:absolute;inset:80px 60px;display:flex;flex-direction:column;align-items:center;text-align:center}
  h2{font-size:76px;line-height:1.06;letter-spacing:-.01em;max-width:900px;text-wrap:balance}
  .lead{margin-top:24px;font:400 34px/1.4 Figtree,sans-serif;color:#5E4F52;max-width:900px;text-wrap:balance}
  .grid{list-style:none;margin:auto 0;padding:0;display:grid;grid-template-columns:repeat(4,216px);gap:34px 32px}
  .grid li{display:flex;flex-direction:column;align-items:center;gap:14px}
  .swatch{display:block;width:216px;height:216px;clip-path:${PINKED}}
  .fname{font:500 28px/1.2 Figtree,sans-serif;color:#3E2F32}
  .more{font:600 30px/1.3 Figtree,sans-serif;color:#8E1B2E}`,
  )
}

function orderSlide() {
  const steps = [
    `Choose your sofa at ${SITE}, or ask us on WhatsApp.`,
    'Confirm your order. There’s nothing to pay today.',
    'Free delivery to most of mainland Britain, usually in 2–4 working days.',
    'Pay the driver in cash or by bank transfer, once it’s in your room.',
  ]
  return page(
    `<div class="wrap">
  <img class="logo" src="${LOGO}" alt="">
  <h2 class="serif gold">Nothing to pay until it’s in your room</h2>
  <ol class="steps">${steps.map((s, i) => `<li><span class="num serif">${i + 1}</span><span>${esc(s)}</span></li>`).join('')}</ol>
  <div class="contact">
    <p class="wa">WhatsApp 07460 669864</p>
    <p class="visit">Showroom in Burnley, by appointment · ${SITE}</p>
  </div>
</div>`,
    `body{background:#4A0D17;color:#F2E4E6}
  .wrap{position:absolute;inset:80px 72px;display:flex;flex-direction:column;align-items:center}
  .logo{width:280px;height:auto}
  h2{margin-top:36px;font-size:72px;line-height:1.08;text-align:center;letter-spacing:-.01em;max-width:860px;text-wrap:balance}
  .steps{list-style:none;margin:auto 0;padding:0;display:flex;flex-direction:column;gap:48px;position:relative;width:100%}
  .steps::before{content:"";position:absolute;left:39px;top:40px;bottom:40px;width:3px;background:linear-gradient(180deg,#94701F,#F2DC9C 50%,#94701F)}
  .steps li{display:flex;align-items:center;gap:34px;font:500 36px/1.35 Figtree,sans-serif}
  .num{position:relative;flex:none;width:80px;height:80px;border-radius:50%;display:grid;place-items:center;font-size:42px;color:#4A0D17;background:linear-gradient(135deg,#94701F 0%,#E9CC7B 35%,#B58A2F 60%,#F2DC9C 85%,#9E7626 100%)}
  .contact{text-align:center}
  .wa{font:600 38px/1.2 Figtree,sans-serif;color:#E9CC7B}
  .visit{margin-top:12px;font:400 28px/1.3 Figtree,sans-serif;color:#EBDADD}`,
  )
}

// ---------------------------------------------------------------- captions and alt text

function postText(range, copy, files) {
  const s = sizes(range)
  const from = Math.min(...range.pieces.map((p) => p.price))
  const fabrics = range.collections.flatMap((c) => c.materials.filter((m) => m.is_active !== false)).length
  const samePrice = range.collections.every((c) => Number(c.surcharge) === 0)
  const data = { range, sizes: s, money, from: money(from), fabrics, samePrice, link: `https://${SITE}/ranges/${range.slug}?utm_source=facebook&utm_medium=social&utm_campaign=range-${range.slug}` }
  const alt = files.map((f) => `${f.file}\n${f.alt}`).join('\n\n')
  return [
    `${range.name}: post kit, made ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
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
    alt,
    '',
  ].join('\n')
}

// ---------------------------------------------------------------- render

function render(htmlFile, pngFile) {
  const profile = join(tmpdir(), 'hw-social-chrome')
  const r = spawnSync(
    CHROME,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--window-size=${W},${H}`,
      '--virtual-time-budget=15000',
      `--user-data-dir=${profile}`,
      `--screenshot=${pngFile}`,
      pathToFileURL(htmlFile).href,
    ],
    { stdio: 'pipe', timeout: 90_000 },
  )
  if (r.status !== 0 || !existsSync(pngFile)) throw new Error(`Chrome failed on ${htmlFile}: ${r.stderr?.toString() ?? r.error}`)
}

async function build(slug) {
  const copy = COPY[slug]
  if (!copy) throw new Error(`No words for "${slug}" in copy.mjs yet`)
  const range = await loadRange(slug)
  const dir = join(OUT, slug)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(join(dir, 'html'), { recursive: true })

  const detail = copy.altDetail ? ` ${copy.altDetail}` : ''
  const room = 'in a panelled room with a red velvet alcove'
  const slides = [
    {
      name: 'cover',
      html: coverSlide(range, copy),
      alt: `The ${range.name} range from Heartwell: ${sizes(range).length} sizes from ${money(Math.min(...range.pieces.map((p) => p.price)))}. Free delivery to most postcodes; pay nothing until it arrives.`,
    },
    ...range.pieces.map((p) => ({
      name: `${p.axis1_value}-${p.axis2_value ?? ''}`.toLowerCase().replace(/\+/g, '-').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      html: pieceSlide(range, p, copy),
      alt: `${range.name} ${altName(p)} in ${p.variant.colour_name.toLowerCase()} ${p.variant.material_label?.toLowerCase() ?? ''}${detail}, ${room}. ${measurements(p, range).replace(/ · /g, ', ')}. ${money(p.price)}${p.axis1_value.includes('+') ? ' for both sofas' : ''}.${copy.photoNotes?.[p.slug] ? ` ${copy.photoNotes[p.slug]}.` : ''}`,
    })),
  ]
  if (range.pieces.some((p) => p.made_to_order) && range.collections.length) {
    slides.push({
      name: 'fabrics',
      html: fabricSlide(range),
      alt: `${range.name} is made to order in the UK in any of our fabrics. Twelve fabric swatches, from light to dark: ${swatches(range.collections, 12).map((f) => f.name.toLowerCase()).join(', ')}.`,
    })
  }
  slides.push({
    name: 'how-to-order',
    html: orderSlide(),
    alt: `How ordering works at Heartwell: choose your sofa at ${SITE} or on WhatsApp, confirm your order with nothing to pay, free delivery to most of mainland Britain in 2 to 4 working days, then pay the driver in cash or by bank transfer. WhatsApp 07460 669864.`,
  })
  if (slides.length > 20) throw new Error(`${slug}: ${slides.length} slides, Instagram takes 20 at most`)

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
  writeFileSync(join(dir, 'post.txt'), postText(range, copy, files))
  console.log(`${range.name}: ${files.length} slides and post.txt in ${dir}`)
}

const arg = process.argv[2]
if (!arg) {
  console.error('Usage: node design/social/products/build.mjs <range-slug|all>')
  process.exit(1)
}
for (const slug of arg === 'all' ? Object.keys(COPY) : [arg]) await build(slug)
