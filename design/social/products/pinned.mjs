// Three posts to pin at the top of Instagram (owner, 28 October 2026): how
// Heartwell works, every range in one place, and how to reach us. One in each
// look (velvet, bold, editorial), like the range posts.
//
//   node design/social/products/pinned.mjs            3:4 slides + post.txt (posting by hand)
//   node design/social/products/pinned.mjs --social   4:5 JPEGs + manifest.json (publishing API)
//
// Every fact comes from the shop: delivery areas and charges, extras and the
// sample limit from the database; phone, address and hours from
// src/config/contact.ts; the samples fee from src/config/samples.ts; prices and
// photos from the live catalogue. Output: design/social/products/out/pinned/.

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { tmpdir } from 'node:os'
import { createRequire } from 'node:module'
import { COPY } from './copy.mjs'
import { STYLES, nb } from './styles.mjs'
import {
  ROOT, W, SITE, PHONE, LOGO_ON_DARK, LOGO_ON_LIGHT, page, esc, money, sentence, full, band, icon, swatches, swatchFill,
  STEPS, setFrame, frameHeight,
} from './lib.mjs'

const OUT = join(ROOT, 'design/social/products/out/pinned')
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const SOCIAL = process.argv.includes('--social')
const sharp = createRequire(join(ROOT, 'package.json'))('sharp')
/** The owner's room photo from the home page's hero. */
const ROOM = 'https://res.cloudinary.com/iv3tp2iq/image/upload/v1792009391/Main-Hero-Background-Image.jpg'

// ---------------------------------------------------------------- facts

const read = (f) => readFileSync(join(ROOT, f), 'utf8')
const contact = read('src/config/contact.ts')
const EMAIL = /SUPPORT_EMAIL\s*=\s*process\.env\.NEXT_PUBLIC_SUPPORT_EMAIL\s*\|\|\s*'([^']+)'/.exec(read('src/config/site.ts'))[1]
const STREET = /street:\s*'([^']+)'/.exec(contact)[1]
const TOWN = /locality:\s*'([^']+)'/.exec(contact)[1]
const POSTCODE = /postcode:\s*'([^']+)'/.exec(contact)[1]
const HOURS = /hours:\s*'([^']+)'/.exec(contact)[1]
const SAMPLE_FEE = /fee:\s*'([^']+)'/.exec(read('src/config/samples.ts'))[1]
const outline = read('src/components/home/britain-outline.ts')
const MAP = {
  viewBox: /viewBox:\s*'([^']+)'/.exec(outline)[1],
  path: /path:\s*'([^']+)'/.exec(outline)[1],
  burnley: (([, x, y]) => ({ x: Number(x), y: Number(y) }))(/burnley:\s*\{\s*x:\s*([\d.]+),\s*y:\s*([\d.]+)/.exec(outline)),
}

function env() {
  const vars = {}
  for (const line of read('.env.local').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line)
    if (m) vars[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return { url: vars.NEXT_PUBLIC_SUPABASE_URL, key: vars.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY }
}
async function api(path) {
  const { url, key } = env()
  const res = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key } })
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`)
  return res.json()
}

async function facts() {
  const [settings] = await api('shop_settings?select=assembly_fee,sample_limit,no_delivery_days,removal_per_seat,upstairs_first_floor,upstairs_per_extra_floor,delivery_min_working_days,delivery_max_working_days')
  const areas = await api('delivery_areas?select=name,charge,min_working_days,max_working_days,sort&order=sort')
  const ranges = await api('ranges?select=slug,name,products(slug,axis1_value,base_price,made_to_order,is_active,variants:product_variants(colour_name,material_label,image_url,price_adjustment,is_active,sort))&products.is_active=eq.true')
  const collections = await api('material_collections?select=name,kind,surcharge,sort,materials(code,name,hex,image_url,sort,is_active)&kind=eq.fabric&order=sort')
  const fabricCount = (await api('materials?select=id&is_active=eq.true')).length
  // Each range: its cover photo (from copy.mjs), its lowest price and its sizes.
  const list = Object.entries(COPY).map(([slug, c]) => {
    const r = ranges.find((x) => x.slug === slug)
    const pieces = r.products.map((p) => ({ ...p, variants: p.variants.filter((v) => v.is_active && v.image_url).sort((a, b) => a.sort - b.sort) })).filter((p) => p.variants.length)
    const cover = pieces.find((p) => p.slug === c.cover) ?? pieces[0]
    const coverVariant = (c.coverColour && cover.variants.find((v) => v.colour_name.toLowerCase() === c.coverColour.toLowerCase())) || cover.variants[0]
    const prices = pieces.map((p) => Number(p.base_price) + Number(p.variants[0].price_adjustment ?? 0))
    const sizes = [...new Set(pieces.map((p) => p.axis1_value))]
    return { slug, name: c.short ?? r.name, fullName: r.name, image: coverVariant.image_url, from: Math.min(...prices), sizes, madeToOrder: pieces.some((p) => p.made_to_order) }
  })
  return { settings, areas, list, collections, fabricCount }
}

// ---------------------------------------------------------------- shared bits

const extraIcons = {
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5.5" width="18" height="13" rx="1.8"/><path d="m3.8 6.5 8.2 6.3 8.2-6.3"/></svg>',
  globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 5 6v5.5c0 4.4 3 7.9 7 9.5 4-1.6 7-5.1 7-9.5V6z"/><path d="m9 12 2.2 2.2L15.5 10"/></svg>',
  undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 7 4.5 11.5 9 16"/><path d="M5 11.5h9.5a5 5 0 0 1 0 10H11"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  stairs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20h5v-5h5v-5h5V5h3"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/></svg>',
}
const HEART = 'M0 -2.6C-1.6 -6.4 -7.6 -6.2 -7.6 -1.4C-7.6 2.6 -2.4 5.6 0 7.6C2.4 5.6 7.6 2.6 7.6 -1.4C7.6 -6.2 1.6 -6.4 0 -2.6Z'
const [, , MW, MH] = MAP.viewBox.split(' ').map(Number)

/** Mainland Britain (the delivery area) with the Burnley showroom marked by a gold heart. */
function britain(width, { fill, stroke, label, labelBg, labelInk }) {
  const h = Math.round((width * MH) / MW)
  const x = (MAP.burnley.x / MW) * width
  const y = (MAP.burnley.y / MH) * h
  return `<div style="position:relative;width:${width}px;height:${h}px">
    <svg viewBox="${MAP.viewBox}" width="${width}" height="${h}" style="display:block;overflow:visible">
      <defs><linearGradient id="hg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#94701F"/><stop offset=".4" stop-color="#F2DC9C"/><stop offset=".7" stop-color="#B58A2F"/><stop offset="1" stop-color="#F6E3A8"/></linearGradient></defs>
      <path d="${MAP.path}" fill="${fill}" stroke="${stroke}" stroke-width="1.6" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
      <g transform="translate(${MAP.burnley.x} ${MAP.burnley.y}) scale(1.5)"><circle r="9" fill="${stroke}" opacity=".18"/><path d="${HEART}" fill="url(#hg)" stroke="#4A0D17" stroke-width=".8" vector-effect="non-scaling-stroke"/></g>
    </svg>
    ${label ? `<span style="position:absolute;left:${x + 22}px;top:${y}px;transform:translateY(-50%);white-space:nowrap;padding:8px 16px;border-radius:999px;background:${labelBg};color:${labelInk};font:600 24px/1 Figtree,sans-serif;box-shadow:0 4px 12px rgb(0 0 0 / .15)">${esc(label)}</span>` : ''}
  </div>`
}

// ---------------------------------------------------------------- 1 · velvet: start here

function startHere(f) {
  const { settings: s, areas } = f
  const days = `${s.delivery_min_working_days}–${s.delivery_max_working_days} working days`
  const slowDays = `${Math.min(...areas.map((a) => a.min_working_days))}–${Math.max(...areas.map((a) => a.max_working_days))} working days`
  const K = `.k{position:absolute;left:70px;top:76px;font:600 28px/1 Figtree,sans-serif;color:#E9CC7B;letter-spacing:.04em}
    h2{position:absolute;left:66px;top:116px;font-size:88px;line-height:1.02;letter-spacing:-.01em;max-width:940px;filter:drop-shadow(0 3px 10px rgb(0 0 0 / .4))}`
  const cover = page(
    `.logo{position:absolute;left:50%;top:56px;width:170px;transform:translateX(-50%)}
    .pre{position:absolute;left:0;right:0;top:190px;text-align:center;font-size:64px;line-height:1}
    h1{position:absolute;left:0;right:0;top:252px;text-align:center;font-size:176px;line-height:1;letter-spacing:-.015em;filter:drop-shadow(0 4px 14px rgb(0 0 0 / .45))}
    .tag{position:absolute;left:0;right:0;top:452px;text-align:center;font:500 30px/1 Figtree,sans-serif;color:#F2DCC8;letter-spacing:.05em}
    .frame{position:absolute;left:100px;top:510px;width:880px;height:740px;padding:9px;border-radius:440px 440px 34px 34px;box-shadow:0 30px 60px rgb(0 0 0 / .45)}
    .frame::after{content:"";position:absolute;inset:20px;border-radius:420px 420px 22px 22px;border:2px solid rgb(246 227 168 / .7)}
    .frame img{display:block;width:100%;height:100%;object-fit:cover;object-position:50% 55%;border-radius:431px 431px 26px 26px}
    .medal{position:absolute;left:760px;top:1000px;width:260px;height:260px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#4A0D17;box-shadow:0 14px 30px rgb(0 0 0 / .45),inset 0 0 0 10px rgb(255 255 255 / .18),inset 0 0 0 13px rgb(122 88 22 / .55)}
    .medal b{font:700 24px/1.15 Figtree,sans-serif;letter-spacing:.06em}
    .medal span{font:400 120px/1 Gloock,serif}
    .chips{position:absolute;left:0;right:0;top:1300px;display:flex;justify-content:center;gap:40px}
    .chips svg{color:#E9CC7B}
    .swipe{position:absolute;right:-34px;top:820px;width:96px;height:96px;border-radius:50%;display:grid;place-items:center;color:#4A0D17;box-shadow:0 8px 20px rgb(0 0 0 / .4)}
    .swipe svg{width:40px;height:40px;margin-right:30px}`,
    `<img class="logo" src="${LOGO_ON_DARK}" alt="">
    <p class="pre serif foil">Welcome to</p>
    <h1 class="serif foil">Heartwell</h1>
    <p class="tag">Sofas made to order in the UK</p>
    <div class="frame goldbg"><img src="${tx(ROOM, 'c_fill,w_900,h_760,g_auto,q_95,f_jpg')}" alt=""></div>
    <div class="medal goldbg"><b>TO PAY<br>TODAY</b><span>£0</span></div>
    <div class="chips"><span class="chip">${icon.truck}Free delivery</span><span class="chip">${icon.pound}Pay on delivery</span><span class="chip">${icon.swatch}${f.fabricCount} fabrics</span></div>
    <div class="swipe goldbg">${icon.arrow}</div>`,
    'velvet',
  )
  const how = page(
    `${K}
    .steps{position:absolute;left:70px;right:70px;top:370px;list-style:none;padding:0;display:flex;flex-direction:column;gap:62px}
    .steps::before{content:"";position:absolute;left:39px;top:40px;bottom:40px;width:3px;background:linear-gradient(180deg,#94701F,#F2DC9C 50%,#94701F)}
    .steps li{position:relative;display:flex;align-items:center;gap:34px;font:500 40px/1.35 Figtree,sans-serif}
    .num{flex:none;width:80px;height:80px;border-radius:50%;display:grid;place-items:center;font-size:42px;color:#4A0D17;box-shadow:0 6px 16px rgb(0 0 0 / .35)}
    .note{position:absolute;left:70px;right:70px;top:1150px;padding:26px 30px;border-radius:24px;border:2px solid rgb(233 204 123 / .45);background:rgb(255 255 255 / .05);font:500 30px/1.4 Figtree,sans-serif}
    .note b{color:#F6E3A8;font-weight:600}`,
    `<p class="k">Start here</p>
    <h2 class="serif foil">How it works</h2>
    <ol class="steps">${STEPS.map((t, i) => `<li><span class="num serif goldbg">${i + 1}</span><span>${nb(t)}</span></li>`).join('')}</ol>
    <p class="note"><b>No card, no deposit.</b> After you order we send you a link to confirm it; nothing happens until you do, and you owe nothing until your sofa is in your room.</p>`,
    'velvet',
  )
  const delivery = page(
    `${K}
    .map{position:absolute;left:56px;top:330px}
    .col{position:absolute;left:520px;right:66px;top:340px}
    .big{font:400 54px/1.05 Gloock,serif;text-wrap:balance}
    .p{margin-top:16px;font:500 28px/1.4 Figtree,sans-serif;color:#EBDADD}
    .areas{margin-top:34px;list-style:none;padding:0;border-top:2px solid rgb(233 204 123 / .35)}
    .areas li{display:flex;justify-content:space-between;gap:12px;padding:15px 0;border-bottom:1px solid rgb(233 204 123 / .25);font:500 27px/1.2 Figtree,sans-serif}
    .areas b{font:400 34px/1 Gloock,serif;color:#F6E3A8}
    .small{margin-top:14px;font:500 24px/1.35 Figtree,sans-serif;color:#E9CC7B}
    .foot{position:absolute;left:66px;right:66px;top:1296px;display:flex;justify-content:space-between}
    .foot svg{color:#E9CC7B}`,
    `<p class="k">Delivery</p>
    <h2 class="serif foil">Free to most of mainland Britain</h2>
    <div class="map">${britain(400, { fill: 'rgba(233,204,123,.10)', stroke: '#E9CC7B', label: TOWN, labelBg: '#F6E3A8', labelInk: '#4A0D17' })}</div>
    <div class="col">
      <p class="big foil">Usually ${esc(days)}</p>
      <p class="p">Brought to the ground floor or a ground-floor room of your choice.</p>
      <ul class="areas">${areas.map((a) => `<li><span>${esc(a.name)}</span><b>${money(Number(a.charge))}</b></li>`).join('')}</ul>
      <p class="small">These areas take ${esc(slowDays)}.</p>
    </div>
    <div class="foot"><span class="chip">${extraIcons.clock}No deliveries on Mondays</span><span class="chip">${icon.chat}Islands and NI: ask us</span></div>`,
    'velvet',
  )
  const cards = [
    [icon.pound, 'Pay on delivery', 'Cash or bank transfer to the driver. We never ask for card details.'],
    [extraIcons.eye, 'Check before you pay', 'If anything is wrong, show the driver and we’ll put it right.'],
    [extraIcons.shield, '1-year guarantee', 'On the frame and springs, on top of your legal rights.'],
    [extraIcons.undo, '14 days to change your mind', 'On ready-made pieces, from the day they’re delivered.'],
    [icon.swatch, 'Made to order in the UK', `Our fabric sofas, in the colour shown or any of our ${f.fabricCount} fabrics.`],
    [extraIcons.stairs, 'Extras at checkout', `Upstairs from ${money(Number(s.upstairs_first_floor))}, assembly ${money(Number(s.assembly_fee))}, old sofa taken away ${money(Number(s.removal_per_seat))} a seat.`],
  ]
  const good = page(
    `${K}
    .grid{position:absolute;left:60px;right:60px;top:300px;display:grid;grid-template-columns:1fr 1fr;gap:26px}
    .c{height:318px;padding:28px 28px 24px;border-radius:24px;background:rgb(255 255 255 / .06);border:2px solid rgb(233 204 123 / .42)}
    .c svg{width:52px;height:52px;color:#E9CC7B}
    .c b{display:block;margin-top:16px;font:400 38px/1.08 Gloock,serif;color:#F6E3A8}
    .c p{margin-top:12px;font:500 26px/1.38 Figtree,sans-serif;color:#EBDADD}`,
    `<p class="k">Start here</p>
    <h2 class="serif foil">Good to know</h2>
    <div class="grid">${cards.map(([ic, t, p]) => `<div class="c">${ic}<b>${esc(t)}</b><p>${esc(p)}</p></div>`).join('')}</div>`,
    'velvet',
  )
  const find = page(
    `.wrap{position:absolute;inset:90px 72px 80px;display:flex;flex-direction:column;align-items:center;text-align:center}
    .logo{width:280px}
    h2{margin-top:44px;font-size:104px;line-height:1;letter-spacing:-.015em;filter:drop-shadow(0 3px 10px rgb(0 0 0 / .4))}
    .site{margin-top:34px;font:400 64px/1 Gloock,serif}
    .p{margin-top:20px;font:500 32px/1.4 Figtree,sans-serif;color:#EBDADD}
    .shot{margin-top:40px;width:100%;height:360px;padding:7px;border-radius:30px;box-shadow:0 20px 44px rgb(0 0 0 / .4)}
    .shot img{display:block;width:100%;height:100%;object-fit:cover;border-radius:24px}
    .rows{margin-top:auto;width:100%;display:flex;flex-direction:column;gap:22px}
    .r{display:flex;align-items:center;gap:22px;padding:26px 30px;border-radius:24px;background:rgb(255 255 255 / .06);border:2px solid rgb(233 204 123 / .42);text-align:left;font:500 30px/1.3 Figtree,sans-serif}
    .r svg{width:46px;height:46px;flex:none;color:#E9CC7B}
    .r b{display:block;font:600 36px/1.15 Figtree,sans-serif;color:#F6E3A8}`,
    `<div class="wrap">
      <img class="logo" src="${LOGO_ON_DARK}" alt="">
      <h2 class="serif foil">Find your sofa</h2>
      <p class="site foil">${SITE}</p>
      <p class="p">Every size, every fabric and every price, any time of day.</p>
      <div class="shot goldbg"><img src="${band(f.list.find((r) => r.slug === 'salone').image, 922, 346, 0.55)}" alt=""></div>
      <div class="rows">
        <div class="r">${icon.chat}<span><b>WhatsApp or ring ${esc(PHONE)}</b>Ask us anything, or order with us</span></div>
        <div class="r">${icon.pin}<span><b>${esc(TOWN)} showroom</b>${esc(STREET)}, ${esc(POSTCODE)}, by appointment</span></div>
      </div>
    </div>`,
    'velvet',
  )
  return {
    slug: 'start-here',
    name: 'Start here',
    style: 'velvet',
    slides: [
      { name: 'cover', html: cover, alt: `Welcome to Heartwell: sofas made to order in the UK, with nothing to pay today. Free delivery, pay on delivery, ${f.fabricCount} fabrics.` },
      { name: 'how-it-works', html: how, alt: `How it works: ${STEPS.join(' ')} No card and no deposit: we send a link to confirm your order, and you owe nothing until your sofa is in your room.` },
      { name: 'delivery', html: delivery, alt: `Map of mainland Britain with our ${TOWN} showroom marked. Free delivery to most of mainland Britain, usually in ${days}, to the ground floor or a ground-floor room of your choice. A charge for ${areas.map((a) => `${a.name} ${money(Number(a.charge))}`).join(', ')}; these take ${slowDays}. No deliveries on Mondays. Islands and Northern Ireland: ask us.` },
      { name: 'good-to-know', html: good, alt: `Good to know. ${cards.map(([, t, p]) => `${t}: ${p[0].toLowerCase()}${p.slice(1)}`).join(' ')}` },
      { name: 'find-your-sofa', html: find, alt: `Find your sofa at ${SITE}. WhatsApp or ring ${PHONE}. ${TOWN} showroom at ${STREET}, ${TOWN} ${POSTCODE}, by appointment.` },
    ],
    instagram: [
      'New here? Start with this: how Heartwell works, in five slides.',
      '',
      `Choose your sofa, confirm your order, and pay nothing until it’s in your room: cash or bank transfer to the driver. Delivery is free to most of mainland Britain, usually in ${days}.`,
      '',
      'Swipe for how it works, where we deliver, and what every order comes with.',
      '',
      `Questions? Message us on WhatsApp: ${PHONE}, or see every sofa through the link in our bio.`,
      '',
      '#heartwellsofa #sofa #payondelivery #madeintheuk #livingroomideas',
    ].join('\n'),
    facebook: [
      'New to Heartwell? Here’s how it works.',
      '',
      `Choose your sofa, confirm your order, and pay nothing until it’s in your room: cash or bank transfer to the driver. Delivery is free to most of mainland Britain, usually in ${days}. Every sofa has a 1-year guarantee on the frame and springs.`,
      '',
      `See every sofa: https://${SITE}/?utm_source=facebook&utm_medium=social&utm_campaign=pinned-start-here`,
      `Or message us on WhatsApp: ${PHONE}`,
    ].join('\n'),
  }
}

// ---------------------------------------------------------------- 2 · bold: all our sofas

function allSofas(f) {
  const groups = [
    { key: 'sizes', title: 'In every size', sub: 'From a 2 seater or an armchair to a U-shape. Prices from:', slugs: ['ashton', 'verona', 'salone', 'sims', 'malibu', 'lily', 'rio-chesterfield'] },
    { key: 'corners', title: '5 seater corners', sub: 'Room for everyone, made to order in the UK.', slugs: ['harrison', 'oakland', 'olympia', 'ruby', 'shannon', 'tango', 'windsor'] },
    { key: 'recliners', title: 'Recliners', sub: 'Electric or by hand, ready made.', slugs: ['roma-recliner', 'nova-electric-recliner', 'michigan-electric-recliner', 'hannah-electric'] },
  ]
  const by = Object.fromEntries(f.list.map((r) => [r.slug, r]))
  const from = Math.min(...f.list.map((r) => r.from))
  const STICK = `.sticker{position:absolute;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:50%;color:#fff;transform:rotate(-9deg);background:radial-gradient(circle at 35% 30%,#C0304A,#8E1B2E 60%,#6A1222);box-shadow:0 14px 30px rgb(0 0 0 / .35)}
    .sticker::before{content:"";position:absolute;inset:12px;border-radius:50%;border:3px dashed rgb(255 255 255 / .6)}`
  const four = ['ashton', 'verona', 'michigan-electric-recliner', 'salone'].map((s) => by[s])
  const cover = page(
    `.q{position:absolute;width:537px;height:537px;object-fit:cover}
    .fade{position:absolute;left:0;right:0;top:760px;height:320px;background:linear-gradient(180deg,rgba(74,13,23,0),rgba(74,13,23,.8) 60%,#4A0D17)}
    ${STICK}
    .sticker b{font:700 24px/1 Figtree,sans-serif;letter-spacing:.06em}
    .sticker span{font:400 92px/1 Gloock,serif}
    .sticker i{font:600 24px/1 Figtree,sans-serif;font-style:normal}
    .name{position:absolute;left:28px;bottom:-0px;padding:10px 18px;border-radius:999px;background:rgb(255 255 255 / .92);color:#22171A;font:600 24px/1 Figtree,sans-serif}
    h1{position:absolute;left:60px;top:1000px;font-size:170px;line-height:1;letter-spacing:-.015em}
    .meta{position:absolute;left:64px;top:1190px;font:600 32px/1.3 Figtree,sans-serif;color:#F2E4E6}
    .row{position:absolute;left:64px;right:64px;top:1288px;display:flex;justify-content:space-between;align-items:center;padding-top:26px;border-top:2px solid rgb(233 204 123 / .35)}
    .row svg{color:#E9CC7B}
    .go{position:absolute;right:64px;top:1080px;display:flex;align-items:center;gap:12px;padding:20px 30px;border-radius:999px;color:#4A0D17;font:700 30px/1 Figtree,sans-serif}
    .go svg{width:34px;height:34px}`,
    `${four.map((r, i) => `<img class="q" style="left:${(i % 2) * 543}px;top:${Math.floor(i / 2) * 543}px" src="${tx(r.image, 'c_fill,w_537,h_537,g_auto,q_95,f_jpg')}" alt="">`).join('')}
    <div class="fade"></div>
    <div class="sticker" style="right:56px;top:70px;width:270px;height:270px"><b>${f.list.length} RANGES</b><i>from</i><span>${money(from)}</span></div>
    <h1 class="serif foil">Our sofas</h1>
    <p class="meta">Corners, U-shapes, 3+2 sets and recliners</p>
    <span class="go goldbg">Swipe ${icon.arrow}</span>
    <div class="row"><span class="chip">${icon.truck}Free delivery</span><span class="chip">${icon.pound}Pay on delivery</span><span class="chip">${icon.swatch}${f.fabricCount} fabrics</span></div>`,
    'wine',
  )
  const directory = (g) => {
    const items = g.slugs.map((s) => by[s])
    const big = items.length <= 4
    const cols = 2
    const rows = Math.ceil((items.length + (big ? 0 : items.length % 2)) / cols)
    const top = 330
    const tileH = Math.floor((1372 - top - (rows - 1) * 22) / rows)
    const photoH = tileH - (big ? 128 : 96)
    const tiles = items.map((r) => {
      const one = r.sizes.length === 1
      return `<div class="t"><img src="${band(r.image, 470, photoH, 0.52)}" alt=""><div class="tx"><b class="serif">${esc(r.name)}</b><span>${one ? esc(sentence(r.sizes[0])) : `${r.sizes.length} sizes`}</span><p class="serif">${one ? '' : '<small>from</small> '}${money(r.from)}</p></div></div>`
    })
    if (items.length % 2) tiles.push(`<div class="t note">${icon.heart}<p>Every range has its own post: scroll our grid for close-ups, sizes and prices.</p></div>`)
    return page(
      `h2{position:absolute;left:60px;top:76px;font-size:96px;line-height:1;letter-spacing:-.015em}
      .sub{position:absolute;left:64px;top:196px;font:500 30px/1.35 Figtree,sans-serif;color:#EBDADD;max-width:950px}
      .grid{position:absolute;left:56px;right:56px;top:${top}px;display:grid;grid-template-columns:1fr 1fr;gap:22px 24px}
      .t{position:relative;height:${tileH}px;border-radius:22px;overflow:hidden;background:#fff;box-shadow:0 12px 28px rgb(0 0 0 / .3)}
      .t img{display:block;width:100%;height:${photoH}px;object-fit:cover}
      .tx{display:grid;grid-template-columns:1fr auto;grid-template-areas:"n p" "s p";align-items:center;column-gap:10px;padding:${big ? 18 : 12}px 20px 0}
      .tx b{grid-area:n;font-size:${big ? 46 : 38}px;line-height:1;color:#22171A}
      .tx span{grid-area:s;margin-top:6px;font:500 ${big ? 24 : 21}px/1.2 Figtree,sans-serif;color:#5E4F52}
      .tx p{grid-area:p;font-size:${big ? 52 : 42}px;line-height:1;color:#8E1B2E;text-align:right}
      .tx small{display:block;font:500 18px/1 Figtree,sans-serif;color:#5E4F52;margin-bottom:4px}
      .note{display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;gap:14px;padding:24px 30px;background:rgb(255 255 255 / .06);border:2px solid rgb(233 204 123 / .45);box-shadow:none;color:#F2E4E6}
      .note svg{width:46px;height:46px;color:#E9CC7B}
      .note p{font:500 27px/1.35 Figtree,sans-serif}`,
      `<h2 class="serif foil">${esc(g.title)}</h2>
      <p class="sub">${esc(g.sub)}</p>
      <div class="grid">${tiles.join('')}</div>`,
      'wine',
    )
  }
  const order = STYLES.bold.order({ coverImage: by.verona.image })
  return {
    slug: 'all-our-sofas',
    name: 'All our sofas',
    style: 'bold',
    slides: [
      { name: 'cover', html: cover, alt: `Our sofas: ${f.list.length} ranges from ${money(from)}, corners, U-shapes, 3+2 sets and recliners. Photos of the ${four.map((r) => r.name).join(', ')}. Free delivery and pay on delivery.` },
      ...groups.map((g) => ({
        name: g.key,
        html: directory(g),
        alt: `${g.title}: ${g.slugs.map((s) => by[s]).map((r) => `${r.fullName}, ${r.sizes.length === 1 ? `${sentence(r.sizes[0]).toLowerCase()}, ${money(r.from)}` : `${r.sizes.length} sizes from ${money(r.from)}`}`).join('; ')}.`,
      })),
      { name: 'how-to-order', html: order, alt: `How ordering works at Heartwell: choose your sofa at ${SITE} or on WhatsApp, confirm your order with nothing to pay, free delivery to most of mainland Britain in 2 to 4 working days, then pay the driver in cash or by bank transfer. WhatsApp ${PHONE}.` },
    ],
    instagram: [
      `Every Heartwell sofa in one place: ${f.list.length} ranges, from ${money(from)}.`,
      '',
      'Ranges in every size, from a 2 seater to a U-shape; 5 seater corners; and recliners, electric or by hand. Swipe for each range and the price it starts from, then find its own post on our grid for the close-ups and every size.',
      '',
      `Made to order in the UK in any of our ${f.fabricCount} fabrics, free delivery to most of mainland Britain, and nothing to pay until it’s in your room.`,
      '',
      `Order through the link in our bio, or message us on WhatsApp: ${PHONE}.`,
      '',
      '#sofas #cornersofa #ushapesofa #reclinersofa #madeintheuk',
    ].join('\n'),
    facebook: [
      `Every Heartwell sofa in one place: ${f.list.length} ranges, from ${money(from)}.`,
      '',
      'Ranges in every size, from a 2 seater to a U-shape; 5 seater corners; and recliners, electric or by hand.',
      '',
      `Free delivery to most of mainland Britain, and nothing to pay until it’s in your room.`,
      '',
      `See them all: https://${SITE}/ranges?utm_source=facebook&utm_medium=social&utm_campaign=pinned-all-sofas`,
      `Or message us on WhatsApp: ${PHONE}`,
    ].join('\n'),
  }
}

// ---------------------------------------------------------------- 3 · editorial: talk to us

function talkToUs(f) {
  const { settings: s } = f
  const H = `.k{position:absolute;left:70px;top:76px;font:600 28px/1 Figtree,sans-serif;color:#8E1B2E;letter-spacing:.03em}
    h2{position:absolute;left:66px;top:118px;font-size:88px;line-height:1.02;letter-spacing:-.015em;max-width:940px}`
  const cover = page(
    `.logo{position:absolute;right:66px;top:66px;width:150px}
    h1{position:absolute;left:66px;top:64px;font-size:168px;line-height:1;letter-spacing:-.02em}
    .sub{position:absolute;left:70px;top:246px;font:500 30px/1.3 Figtree,sans-serif;color:#5E4F52}
    .big{position:absolute;left:70px;top:318px;width:940px;height:520px}
    .big::before{content:"";position:absolute;left:18px;top:18px;right:-18px;bottom:-18px;border-radius:470px 470px 26px 26px;border:3px solid #B58A2F}
    .big img{position:relative;display:block;width:100%;height:100%;object-fit:cover;border-radius:470px 470px 26px 26px}
    .card{position:absolute;left:70px;right:70px;top:880px;padding:26px 34px;border-radius:26px;background:#fff;box-shadow:0 14px 34px rgb(34 23 26 / .1);display:flex;flex-direction:column;gap:18px}
    .r{display:flex;align-items:center;gap:20px;font:500 28px/1.25 Figtree,sans-serif;color:#3E2F32}
    .r svg{width:42px;height:42px;flex:none;color:#8E1B2E}
    .r b{font:400 50px/1 Gloock,serif;color:#8E1B2E}`,
    `<img class="logo" src="${LOGO_ON_LIGHT}" alt="">
    <h1 class="serif">Talk to us</h1>
    <p class="sub">WhatsApp, phone, email, or a visit to ${esc(TOWN)}</p>
    <div class="big"><img src="${tx(ROOM, 'c_fill,w_940,h_520,g_auto,q_95,f_jpg')}" alt=""></div>
    <div class="card">
      <div class="r">${icon.chat}<span><b>${esc(PHONE)}</b><br>WhatsApp or ring</span></div>
      <div class="r">${extraIcons.mail}<span>${esc(EMAIL)}</span></div>
      <div class="r">${extraIcons.globe}<span>${SITE} · order any time</span></div>
      <div class="r">${icon.pin}<span>${esc(STREET)}, ${esc(TOWN)} ${esc(POSTCODE)}</span></div>
    </div>`,
    'stone',
  )
  const visit = page(
    `${H}
    .map{position:absolute;left:60px;top:330px}
    .col{position:absolute;left:500px;right:70px;top:350px}
    .addr{font:400 50px/1.1 Gloock,serif}
    .p{margin-top:22px;display:flex;gap:16px;align-items:flex-start;font:500 30px/1.4 Figtree,sans-serif;color:#3E2F32}
    .p svg{width:40px;height:40px;flex:none;color:#8E1B2E;margin-top:2px}
    .cta{margin-top:40px;padding:26px 30px;border-radius:24px;background:#8E1B2E;color:#fff;font:600 32px/1.3 Figtree,sans-serif}
    .cta small{display:block;margin-top:6px;font:500 24px/1.3 Figtree,sans-serif;color:#F4E7C6}
    .foot{position:absolute;left:70px;right:70px;top:1322px;display:flex;justify-content:space-between}
    .foot svg{color:#8E1B2E}`,
    `<p class="k">Visit us</p>
    <h2 class="serif">Come and see us in ${esc(TOWN)}</h2>
    <div class="map">${britain(400, { fill: '#fff', stroke: '#8E1B2E', label: TOWN, labelBg: '#fff', labelInk: '#8E1B2E' })}</div>
    <div class="col">
      <p class="addr serif">${esc(STREET)}<br>${esc(TOWN)} ${esc(POSTCODE)}</p>
      <p class="p">${extraIcons.clock}<span>Monday to Friday, ${esc(HOURS)}</span></p>
      <p class="p">${icon.heart}<span>By appointment: book at least a day ahead, and tell us which sofas you’d like to see.</span></p>
      <p class="cta">Book on WhatsApp<br>${esc(PHONE)}<small>Or ring the same number</small></p>
    </div>
    <div class="foot"><span class="chip">${extraIcons.globe}Order online any time</span><span class="chip">${icon.truck}We deliver every day but Monday</span></div>`,
    'stone',
  )
  const picks = swatches(f.collections, 12)
  const fabrics = page(
    `.panel{position:absolute;inset:84px 66px;display:flex;flex-direction:column;align-items:center;text-align:center}
    h2{font-size:80px;line-height:1.04;letter-spacing:-.015em;max-width:900px;text-wrap:balance}
    .lead{margin-top:24px;font:400 34px/1.4 Figtree,sans-serif;color:#5E4F52;max-width:900px;text-wrap:balance}
    .grid{list-style:none;margin:auto 0;padding:0;display:grid;grid-template-columns:repeat(4,216px);gap:34px 32px}
    .grid li{display:flex;flex-direction:column;align-items:center;gap:14px}
    .grid i{display:block;width:216px;height:216px}
    .grid span{font:500 28px/1.2 Figtree,sans-serif;color:#3E2F32}
    .more{font:600 30px/1.3 Figtree,sans-serif;color:#8E1B2E}`,
    `<div class="panel">
      <h2 class="serif">See the fabrics at home</h2>
      <p class="lead">Order up to ${s.sample_limit} samples for ${esc(SAMPLE_FEE)}, and the ${esc(SAMPLE_FEE)} comes off your sofa if you buy.</p>
      <ul class="grid">${picks.map((x) => `<li><i class="pinked" style="${swatchFill(x, 216)}"></i><span>${esc(x.name)}</span></li>`).join('')}</ul>
      <p class="more">${SITE}/fabric-samples or WhatsApp ${esc(PHONE)}</p>
    </div>`,
    'stone',
  )
  const qa = [
    ['How do I pay?', 'Cash or bank transfer to the driver when your sofa arrives. Nothing upfront, and we never ask for card details.'],
    ['When will it arrive?', `Usually ${s.delivery_min_working_days}–${s.delivery_max_working_days} working days; Devon, Cornwall and the north of Scotland 5–7. We ring you to book the day.`],
    ['Will it fit through my door?', 'Measure the narrowest door or turn on the way in and compare it with the sofa’s depth or height. Corners and U-shapes come in sections.'],
    ['Can I change my mind?', 'Ready-made pieces: 14 days from delivery. Made-to-order pieces can be changed or cancelled within 2 working days of ordering.'],
    ['Can you carry it upstairs?', `Yes: ${money(Number(s.upstairs_first_floor))} for the first floor, ${money(Number(s.upstairs_per_extra_floor))} for each floor above without a lift.`],
  ]
  const faq = page(
    `${H}
    .list{position:absolute;left:70px;right:70px;top:330px;display:flex;flex-direction:column;gap:20px}
    .q{padding:22px 28px;border-radius:22px;background:#fff;box-shadow:0 8px 22px rgb(34 23 26 / .07)}
    .q b{display:flex;align-items:center;gap:14px;font:400 40px/1.1 Gloock,serif;color:#8E1B2E}
    .q b::before{content:"";flex:none;width:12px;height:12px;border-radius:50%;background:#B58A2F}
    .q p{margin-top:10px;font:500 27px/1.4 Figtree,sans-serif;color:#3E2F32}`,
    `<p class="k">Talk to us</p>
    <h2 class="serif">Questions people ask</h2>
    <div class="list">${qa.map(([q, a]) => `<div class="q"><b>${esc(q)}</b><p>${nb(a)}</p></div>`).join('')}</div>`,
    'stone',
  )
  return {
    slug: 'talk-to-us',
    name: 'Talk to us',
    style: 'editorial',
    slides: [
      { name: 'cover', html: cover, alt: `Talk to us: WhatsApp or ring ${PHONE}, email ${EMAIL}, order any time at ${SITE}, or visit ${STREET}, ${TOWN} ${POSTCODE}.` },
      { name: 'visit', html: visit, alt: `Map of mainland Britain with our ${TOWN} showroom marked. ${STREET}, ${TOWN} ${POSTCODE}. Monday to Friday, ${HOURS}, by appointment: book at least a day ahead. Book on WhatsApp or ring ${PHONE}.` },
      { name: 'fabric-samples', html: fabrics, alt: `See the fabrics at home: up to ${s.sample_limit} samples for ${SAMPLE_FEE}, taken off your sofa if you buy. Swatches: ${picks.map((x) => x.name.toLowerCase()).join(', ')}.` },
      { name: 'questions', html: faq, alt: `Questions people ask. ${qa.map(([q, a]) => `${q} ${a}`).join(' ')}` },
    ],
    instagram: [
      'Questions about a sofa? Talk to us.',
      '',
      `WhatsApp or ring: ${PHONE}`,
      `Email: ${EMAIL}`,
      `Order any time: ${SITE} (link in our bio)`,
      `Showroom: ${STREET}, ${TOWN} ${POSTCODE}. Monday to Friday, ${HOURS}, by appointment: book a day ahead.`,
      '',
      `Want to see the fabrics first? Up to ${s.sample_limit} samples for ${SAMPLE_FEE}, and the ${SAMPLE_FEE} comes off your sofa if you buy.`,
      '',
      '#heartwellsofa #burnley #sofashop #madeintheuk #sofa',
    ].join('\n'),
    facebook: [
      'Questions about a sofa? Talk to us.',
      '',
      `WhatsApp or ring: ${PHONE}`,
      `Email: ${EMAIL}`,
      `Showroom: ${STREET}, ${TOWN} ${POSTCODE}. Monday to Friday, ${HOURS}, by appointment: book a day ahead.`,
      '',
      `Want to see the fabrics first? Up to ${s.sample_limit} samples for ${SAMPLE_FEE}, and the ${SAMPLE_FEE} comes off your sofa if you buy.`,
      '',
      `Order any time: https://${SITE}/contact?utm_source=facebook&utm_medium=social&utm_campaign=pinned-talk-to-us`,
    ].join('\n'),
  }
}

// ---------------------------------------------------------------- render

const tx = (url, t) => url.replace('/image/upload/', `/image/upload/${t}/`)

function render(htmlFile, pngFile) {
  const r = spawnSync(
    CHROME,
    ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', `--window-size=${W},${frameHeight()}`, '--virtual-time-budget=15000', `--user-data-dir=${join(tmpdir(), 'hw-social-chrome')}`, `--screenshot=${pngFile}`, pathToFileURL(htmlFile).href],
    { stdio: 'pipe', timeout: 90_000 },
  )
  if (r.status !== 0 || !existsSync(pngFile)) throw new Error(`Chrome failed on ${htmlFile}: ${r.stderr?.toString() ?? r.error}`)
}

if (SOCIAL) setFrame('social')
const f = await facts()
const posts = [startHere(f), allSofas(f), talkToUs(f)]
for (const [i, p] of posts.entries()) {
  const n = i + 1
  const dir = join(OUT, `${n}-${p.slug}`, SOCIAL ? 'social' : '')
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(join(dir, 'html'), { recursive: true })
  const urls = [...new Set(p.slides.flatMap((s) => s.html.match(/https:\/\/res\.cloudinary\.com\/[^"')\s]+/g) ?? []))]
  await Promise.all(urls.map((u) => fetch(u).then((r) => r.arrayBuffer()).catch(() => null)))
  const files = []
  for (const [j, s] of p.slides.entries()) {
    const base = SOCIAL ? `pinned-${n}-${p.slug}-${String(j + 1).padStart(2, '0')}-${s.name}` : `${String(j + 1).padStart(2, '0')}-${s.name}`
    const html = join(dir, 'html', `${base}.html`)
    const png = SOCIAL ? join(dir, 'html', `${base}.png`) : join(dir, `${base}.png`)
    writeFileSync(html, s.html)
    render(html, png)
    if (SOCIAL) await sharp(png).jpeg({ quality: 90, mozjpeg: true }).toFile(join(dir, `${base}.jpg`))
    files.push({ file: `${base}.${SOCIAL ? 'jpg' : 'png'}`, alt: s.alt })
  }
  if (SOCIAL) {
    writeFileSync(join(dir, 'manifest.json'), JSON.stringify({ number: `pinned-${n}`, slug: p.slug, name: p.name, style: p.style, made: new Date().toISOString(), instagram: { caption: p.instagram, slides: files }, facebook: { caption: p.facebook, slides: files } }, null, 2))
  } else {
    writeFileSync(
      join(dir, 'post.txt'),
      [`Pinned post ${n}: ${p.name} (${p.style} style), made ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, '', '== Instagram caption ==', p.instagram, '', '== Facebook caption ==', p.facebook, '', '== Alt text, one per slide ==', files.map((x) => `${x.file}\n${x.alt}`).join('\n\n'), ''].join('\n'),
    )
  }
  console.log(`${n} ${p.name} (${p.style}): ${files.length} slides in ${dir}`)
}
