// Shared parts for the range posts: words and numbers, Cloudinary photo
// crops, top-view plans drawn to scale, icons and the page frame.

import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
export const W = 1080
export const H = 1440
export const SITE = 'heartwellsofa.co.uk'
/** The shop's phone and WhatsApp number, from src/config/contact.ts (the one place the site keeps it). */
export const PHONE = /phoneDisplay:\s*'([^']+)'/.exec(readFileSync(join(ROOT, 'src/config/contact.ts'), 'utf8'))?.[1] ?? ''
export const LOGO_ON_DARK = pathToFileURL(join(ROOT, 'design/logo/hw-logo-reversed.svg')).href
export const LOGO_ON_LIGHT = pathToFileURL(join(ROOT, 'design/logo/hw-logo.svg')).href

// ---------------------------------------------------------------- words and numbers

export const money = (n) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: n % 1 ? 2 : 0 }).format(n)
export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** "5 Seater Corner" → "5 seater corner", "U-Shape" → "U-shape" (the site's sentence case). */
export function sentence(s) {
  const t = String(s ?? '').toLowerCase().replace(/\bu-shape/g, 'U-shape')
  return t.charAt(0).toUpperCase() + t.slice(1)
}

const cm = (n) => `${Number.isInteger(Number(n)) ? Number(n) : Number(n).toFixed(1)} cm`

/** The piece's top view, in centimetres, for plans and the headline measurement. */
export function layoutOf(p, pieces) {
  const size = p.axis1_value.toLowerCase()
  const d = Number(p.depth_cm) || 95
  if (size.includes('+')) {
    const two = pieces.find((x) => /^2 seater$/i.test(x.axis1_value) && x.axis2_value === p.axis2_value) ?? pieces.find((x) => /^2 seater$/i.test(x.axis1_value))
    return { kind: 'set', ws: [Number(p.width_cm), two ? Number(two.width_cm) : null], d }
  }
  if (size.includes('u-shape') && p.side_a_cm) return { kind: 'u', W: Number(p.width_cm), L: Number(p.side_a_cm), R: Number(p.side_b_cm ?? p.side_a_cm), d }
  if (p.side_a_cm && p.side_b_cm) return { kind: 'corner', a: Number(p.side_a_cm), b: Number(p.side_b_cm), d }
  const seats = Number(/(\d)\s*seater/.exec(size)?.[1] ?? (/chair|stool/.test(size) ? 1 : 3))
  return { kind: 'straight', w: Number(p.width_cm), d, seats: Math.max(1, Math.min(seats, 4)) }
}

/** The measurement people compare first (the site's planSummary): "198 cm wide", "240 cm each way". */
export function headline(l) {
  if (l.kind === 'straight') return `${cm(l.w)} wide`
  if (l.kind === 'set') return l.ws[1] ? `${cm(l.ws[0])} and ${cm(l.ws[1])} wide` : `3 seater ${cm(l.ws[0])} wide`
  if (l.kind === 'corner') return l.a === l.b ? `${cm(l.a)} each way` : `${l.a} × ${cm(l.b)}`
  return `${cm(l.W)} wide, sides ${l.L === l.R ? cm(l.L) : `${l.L} and ${cm(l.R)}`}`
}

/** Every measurement in one line, for alt text. */
export function measurements(p, pieces) {
  return [headline(layoutOf(p, pieces)), p.depth_cm ? `${cm(p.depth_cm)} deep` : null, p.height_cm ? `${cm(p.height_cm)} high` : null].filter(Boolean).join(', ')
}

// ---------------------------------------------------------------- photos

const tx = (url, t) => url.replace('/image/upload/', `/image/upload/${t}/`)
/** The whole square photo at w px. */
export const full = (url, w = W) => tx(url, `c_scale,w_${w},q_95,f_jpg`)
/** A wide band of the square photo around the sofa (centred 53% down), at w x h. */
export function band(url, w, h, centre = 0.53) {
  const S = 1254
  const ch = Math.min(S, Math.round(S * (h / w)))
  const y = Math.max(0, Math.min(S - ch, Math.round(S * centre - ch / 2)))
  return tx(url, `c_crop,x_0,y_${y},w_${S},h_${ch}/c_scale,w_${w},q_95,f_jpg`)
}
/** A close-up: a square {x, y, s} of the original (1254 px) photo, at w px. */
export const closeUp = (url, { x, y, s }, w) => tx(url, `c_crop,x_${x},y_${y},w_${s},h_${s}/c_scale,w_${w},q_95,f_jpg`)

// ---------------------------------------------------------------- plans

/** The plan's extent in cm. */
export function extent(l) {
  if (l.kind === 'straight') return [l.w, l.d]
  if (l.kind === 'set') return [l.ws[0] + (l.ws[1] ?? 0) + (l.ws[1] ? 30 : 0), l.d]
  if (l.kind === 'corner') return [l.a, l.b]
  return [l.W, Math.max(l.L, l.R)]
}

/** The scale (px per cm) that fits every layout into a w x h box (with room for the labels unless they're off). */
export function sharedScale(layouts, w, h, font, labels = true) {
  const pad = labels ? font * 1.9 : 6
  return Math.min(...layouts.map((l) => Math.min((w - pad) / extent(l)[0], (h - pad) / extent(l)[1])))
}

/** A top view drawn to scale: back cushions, arms and seats, with the headline measurements unless labels is false. */
export function plan(l, { w, h, line, fill, text, font = 24, scale, labels = true }) {
  const pad = labels ? font * 1.9 : 6
  const [ew, eh] = extent(l)
  const s = scale ?? Math.min((w - pad) / ew, (h - pad) / eh)
  const ox = pad + (w - pad - ew * s) / 2
  const oy = pad + (h - pad - eh * s) / 2
  const X = (v) => ox + v * s
  const Y = (v) => oy + v * s
  const bd = 20
  const arm = 18
  const R = (x, y, ww, hh, extra = '') => `<rect x="${X(x)}" y="${Y(y)}" width="${ww * s}" height="${hh * s}" rx="2.5" ${extra}/>`
  let g = ''
  const straight = (x0, ww, d, seats) => {
    g += R(x0, 0, ww, d, `fill="${fill}"`) + R(x0, 0, ww, bd) + R(x0, 0, arm, d) + R(x0 + ww - arm, 0, arm, d)
    for (let i = 1; i < seats; i++) {
      const x = x0 + arm + ((ww - 2 * arm) / seats) * i
      g += `<line x1="${X(x)}" y1="${Y(bd)}" x2="${X(x)}" y2="${Y(d)}"/>`
    }
  }
  if (l.kind === 'straight') straight(0, l.w, l.d, l.seats)
  if (l.kind === 'set') {
    straight(0, l.ws[0], l.d, 3)
    if (l.ws[1]) straight(l.ws[0] + 30, l.ws[1], l.d, 2)
  }
  if (l.kind === 'corner') {
    g += `<path fill="${fill}" d="M${X(0)} ${Y(0)}H${X(l.a)}V${Y(l.d)}H${X(l.d)}V${Y(l.b)}H${X(0)}Z"/>`
    g += R(0, 0, l.a, bd) + R(0, 0, bd, l.b) + R(l.a - arm, 0, arm, l.d) + R(0, l.b - arm, l.d, arm)
    g += `<line x1="${X(l.d)}" y1="${Y(l.d)}" x2="${X(l.d)}" y2="${Y(bd)}"/><line x1="${X(l.d)}" y1="${Y(l.d)}" x2="${X(bd)}" y2="${Y(l.d)}"/>`
  }
  if (l.kind === 'u') {
    g += `<path fill="${fill}" d="M${X(0)} ${Y(0)}H${X(l.W)}V${Y(l.R)}H${X(l.W - l.d)}V${Y(l.d)}H${X(l.d)}V${Y(l.L)}H${X(0)}Z"/>`
    g += R(0, 0, l.W, bd) + R(0, 0, bd, l.L) + R(l.W - bd, 0, bd, l.R) + R(0, l.L - arm, l.d, arm) + R(l.W - l.d, l.R - arm, l.d, arm)
  }
  const top = Y(0) - font * 0.8
  const tick = 6
  const across = (x1, x2, y, label) =>
    `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"/><line x1="${x1}" y1="${y - tick}" x2="${x1}" y2="${y + tick}"/><line x1="${x2}" y1="${y - tick}" x2="${x2}" y2="${y + tick}"/><text x="${(x1 + x2) / 2}" y="${y - 9}" text-anchor="middle" stroke="none">${label}</text>`
  const down = (y1, y2, x, label) =>
    `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}"/><line x1="${x - tick}" y1="${y1}" x2="${x + tick}" y2="${y1}"/><line x1="${x - tick}" y1="${y2}" x2="${x + tick}" y2="${y2}"/><text transform="translate(${x - 10} ${(y1 + y2) / 2}) rotate(-90)" text-anchor="middle" stroke="none">${label}</text>`
  let dims = ''
  if (!labels) return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="overflow:visible;display:block"><g fill="none" stroke="${line}" stroke-width="2.2" stroke-linejoin="round">${g}</g></svg>`
  if (l.kind === 'straight') dims = across(X(0), X(l.w), top, `${l.w} cm`)
  if (l.kind === 'set') dims = across(X(0), X(l.ws[0]), top, `${l.ws[0]} cm`) + (l.ws[1] ? across(X(l.ws[0] + 30), X(l.ws[0] + 30 + l.ws[1]), top, `${l.ws[1]} cm`) : '')
  if (l.kind === 'corner') dims = across(X(0), X(l.a), top, `${l.a} cm`) + down(Y(0), Y(l.b), X(0) - font * 0.8, `${l.b} cm`)
  if (l.kind === 'u') dims = across(X(0), X(l.W), top, `${l.W} cm`) + down(Y(0), Y(l.L), X(0) - font * 0.8, `${l.L} cm`)
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="overflow:visible;display:block"><g fill="none" stroke="${line}" stroke-width="2.2" stroke-linejoin="round">${g}</g><g stroke="${text}" fill="${text}" stroke-width="1.6" style="font:600 ${font}px Figtree,sans-serif">${dims}</g></svg>`
}

// ---------------------------------------------------------------- fabrics

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
export function swatches(collections, count) {
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
      pool.push({ name: f.name, hex, image: f.image_url })
    }
  }
  pool.sort((a, b) => (hsl(b.hex)?.l ?? 0) - (hsl(a.hex)?.l ?? 0))
  if (pool.length <= count) return pool
  const step = (pool.length - 1) / (count - 1)
  return Array.from({ length: count }, (_, i) => pool[Math.round(i * step)])
}
export const swatchFill = (f, px) => `background:${f.hex}${f.image ? ` url('${tx(f.image, `c_fill,w_${px},h_${px},q_90,f_jpg`)}') center/cover` : ''}`

export const PINKED =
  'polygon(0% 0%,8.33% 5%,16.67% 0%,25% 5%,33.33% 0%,41.67% 5%,50% 0%,58.33% 5%,66.67% 0%,75% 5%,83.33% 0%,91.67% 5%,100% 0%,95% 8.33%,100% 16.67%,95% 25%,100% 33.33%,95% 41.67%,100% 50%,95% 58.33%,100% 66.67%,95% 75%,100% 83.33%,95% 91.67%,100% 100%,91.67% 95%,83.33% 100%,75% 95%,66.67% 100%,58.33% 95%,50% 100%,41.67% 95%,33.33% 100%,25% 95%,16.67% 100%,8.33% 95%,0% 100%,5% 91.67%,0% 83.33%,5% 75%,0% 66.67%,5% 58.33%,0% 50%,5% 41.67%,0% 33.33%,5% 25%,0% 16.67%,5% 8.33%)'

// ---------------------------------------------------------------- icons (24 px grid, line)

const svg = (d, sw = 1.6) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`
export const icon = {
  truck: svg('<path d="M2 6.5h11.5v9.5H2z"/><path d="M13.5 9.5h4.2l3.3 3.4V16h-7.5"/><circle cx="6" cy="17.3" r="1.9"/><circle cx="17.3" cy="17.3" r="1.9"/>'),
  pound: svg('<circle cx="12" cy="12" r="9.2"/><path d="M14.8 8.3a2.6 2.6 0 0 0-4.9 1.3V16M8.4 12.4h4.6M8.4 16h7"/>'),
  swatch: svg('<rect x="3" y="7" width="9" height="13" rx="1.5" transform="rotate(-12 7.5 13.5)"/><rect x="8" y="5" width="9" height="13" rx="1.5"/><rect x="12" y="4" width="9" height="13" rx="1.5" transform="rotate(12 16.5 10.5)"/>'),
  heart: svg('<path d="M12 20s-7.5-4.6-7.5-10.2A4.1 4.1 0 0 1 12 7.4a4.1 4.1 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20z"/>'),
  ruler: svg('<rect x="2" y="8" width="20" height="8" rx="1.2"/><path d="M6 8v3M10 8v4M14 8v3M18 8v4"/>'),
  chat: svg('<path d="M20 11.5a8 8 0 0 1-11.6 7.1L4 20l1.4-4.2A8 8 0 1 1 20 11.5z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5"/>'),
  pin: svg('<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>'),
  arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>', 2),
}

/** The three facts every cover repeats: delivery, payment, and fabrics (made to order) or sizes. */
export function promiseChips(ctx) {
  return [
    `<span class="chip">${icon.truck}Free delivery</span>`,
    `<span class="chip">${icon.pound}Pay on delivery</span>`,
    ctx.madeToOrder && ctx.fabrics.count ? `<span class="chip">${icon.swatch}${ctx.fabrics.count} fabrics</span>` : `<span class="chip">${icon.ruler}${ctx.groups.length} ${ctx.groups.length === 1 ? 'size' : 'sizes'}</span>`,
  ].join('')
}

/** The ordering steps, in the site's words (src/config/promises.ts). */
export const STEPS = [
  `Choose your sofa at ${SITE}, or ask us on WhatsApp.`,
  'Confirm your order. There’s nothing to pay today.',
  'Free delivery to most of mainland Britain, usually in 2–4 working days.',
  'Pay the driver in cash or by bank transfer, once it’s in your room.',
]

// ---------------------------------------------------------------- the page

const NOISE = `url("data:image/svg+xml,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .09 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>")}")`

/**
 * One slide. Facebook trims tall photos to 4:5 in the feed, so words stay
 * between 45 px and 1395 px from the top.
 */
export const page = (css, body, bodyClass = '') => `<!doctype html><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Gloock&family=Figtree:wght@400;500;600;700&display=block" rel="stylesheet">
<style>
html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;-webkit-font-smoothing:antialiased}
*{box-sizing:border-box} p,h1,h2,h3,ol,ul{margin:0}
body{position:relative;font-family:Figtree,sans-serif;color:#22171A;background:#fff}
.serif{font-family:Gloock,serif;font-weight:400}
.foil{background-image:linear-gradient(100deg,#B8892E 0%,#F6E3A8 20%,#D9B45E 38%,#FFF3CC 52%,#C99B3F 70%,#F2DC9C 88%,#B8892E 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.goldbg{background:linear-gradient(135deg,#94701F 0%,#E9CC7B 30%,#B58A2F 52%,#F6E3A8 78%,#9E7626 100%)}
.velvet{background:radial-gradient(90% 55% at 50% 0%,rgba(176,38,62,.85),rgba(176,38,62,0) 70%),radial-gradient(70% 50% at 0% 100%,rgba(20,2,6,.7),rgba(20,2,6,0) 70%),radial-gradient(70% 50% at 100% 70%,rgba(130,24,44,.5),rgba(130,24,44,0) 70%),linear-gradient(170deg,#5C1322,#3A0911);color:#F2E4E6}
.velvet::before{content:"";position:absolute;inset:0;background-image:${NOISE};pointer-events:none}
.wine{background:#4A0D17;color:#F2E4E6}
.stone{background:#F5F1EF}
.stone::before{content:"";position:absolute;left:24px;top:24px;right:24px;bottom:24px;border:2px solid #E2D6D3;border-radius:6px;pointer-events:none}
.chip{display:inline-flex;align-items:center;gap:14px;font:600 28px/1 Figtree,sans-serif;white-space:nowrap}
.chip svg{width:38px;height:38px;flex:none}
.pinked{clip-path:${PINKED}}
${css}
</style>
<body class="${bodyClass}">
${body}
</body>`
