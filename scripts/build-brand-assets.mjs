// Builds every logo, icon and share image the site serves from the vector logo
// files in design/logo/. Run after the logo changes: `npm run brand:assets`.
//
// The vector logo is a detailed trace (about 65 KB per file), which is too heavy
// for the header of a page that has to load fast inside Facebook and Instagram.
// So the header uses small WebP renders, and the SVGs stay for large uses.

import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = path.resolve(import.meta.dirname, '..')
const logo = (name) => path.join(root, 'design/logo', name)
const out = (...p) => path.join(root, ...p)
const WINE = '#4A0D17'

async function render(svgFile, width) {
  return sharp(await fs.readFile(svgFile), { density: 600 }).resize({ width }).png().toBuffer()
}

async function webp(svgName, width, target) {
  const png = await render(logo(svgName), width)
  await sharp(png).webp({ quality: 82, alphaQuality: 90 }).toFile(target)
}

/** Reversed mark centred on a wine square: app icon, favicon, Apple touch icon. */
async function iconSquare(size, { radius = 0, padding = 0.16 } = {}) {
  const inner = Math.round(size * (1 - padding * 2))
  const mark = await render(logo('hw-mark-reversed.svg'), inner)
  const meta = await sharp(mark).metadata()
  const bg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="${WINE}"/></svg>`,
  )
  return sharp(bg)
    .composite([{ input: mark, left: Math.round((size - meta.width) / 2), top: Math.round((size - meta.height) / 2) }])
    .png()
    .toBuffer()
}

/** Minimal .ico writer: each entry is an embedded PNG (supported by every current browser). */
function ico(pngs) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(pngs.length, 4)
  const dir = Buffer.alloc(16 * pngs.length)
  let offset = 6 + dir.length
  pngs.forEach(({ size, data }, i) => {
    const e = i * 16
    dir.writeUInt8(size >= 256 ? 0 : size, e)
    dir.writeUInt8(size >= 256 ? 0 : size, e + 1)
    dir.writeUInt8(0, e + 2)
    dir.writeUInt8(0, e + 3)
    dir.writeUInt16LE(1, e + 4)
    dir.writeUInt16LE(32, e + 6)
    dir.writeUInt32LE(data.length, e + 8)
    dir.writeUInt32LE(offset, e + 12)
    offset += data.length
  })
  return Buffer.concat([header, dir, ...pngs.map((p) => p.data)])
}

await fs.mkdir(out('public/brand'), { recursive: true })
await fs.mkdir(out('public/icons'), { recursive: true })

// Vector originals, for large uses.
for (const f of ['hw-logo.svg', 'hw-logo-reversed.svg', 'hw-mark.svg', 'hw-mark-reversed.svg']) {
  await fs.copyFile(logo(f), out('public/brand', f))
}

// Small renders for the header, footer and cards (about 3x the header size; 2x for the footer logo).
await webp('hw-mark.svg', 160, out('public/brand/hw-mark.webp'))
await webp('hw-mark-reversed.svg', 160, out('public/brand/hw-mark-reversed.webp'))
await webp('hw-wordmark.svg', 420, out('public/brand/hw-wordmark.webp'))
await webp('hw-wordmark-reversed.svg', 420, out('public/brand/hw-wordmark-reversed.webp'))
await webp('hw-logo.svg', 600, out('public/brand/hw-logo.webp'))
await webp('hw-logo-reversed.svg', 600, out('public/brand/hw-logo-reversed.webp'))

// Icons. Next.js serves src/app/icon.png, apple-icon.png and favicon.ico itself.
await fs.writeFile(out('src/app/icon.png'), await iconSquare(512, { radius: 112 }))
await fs.writeFile(out('src/app/apple-icon.png'), await iconSquare(180))
await fs.writeFile(out('public/icons/icon-192.png'), await iconSquare(192, { radius: 42 }))
await fs.writeFile(out('public/icons/icon-512.png'), await iconSquare(512, { radius: 112 }))
await fs.writeFile(out('public/icons/maskable-512.png'), await iconSquare(512, { padding: 0.24 }))
await fs.writeFile(
  out('src/app/favicon.ico'),
  ico([
    { size: 16, data: await iconSquare(16, { radius: 3, padding: 0.06 }) },
    { size: 32, data: await iconSquare(32, { radius: 7, padding: 0.08 }) },
    { size: 48, data: await iconSquare(48, { radius: 10, padding: 0.1 }) },
  ]),
)

// Default share image for WhatsApp, Facebook and Instagram link previews.
const shareLogo = await render(logo('hw-logo-reversed.svg'), 620)
const shareMeta = await sharp(shareLogo).metadata()
const shareBg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><defs><radialGradient id="g" cx="50%" cy="0%" r="110%"><stop offset="0" stop-color="#6A1424"/><stop offset=".6" stop-color="${WINE}"/><stop offset="1" stop-color="#3A0A12"/></radialGradient></defs><rect width="1200" height="630" fill="url(#g)"/></svg>`,
)
await sharp(shareBg)
  .composite([{ input: shareLogo, left: Math.round((1200 - shareMeta.width) / 2), top: Math.round((630 - shareMeta.height) / 2) }])
  .jpeg({ quality: 86 })
  .toFile(out('src/app/opengraph-image.jpg'))

console.log('Brand assets built.')
