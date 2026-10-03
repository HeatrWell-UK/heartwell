import fs from 'node:fs'
import { recolor } from './recolor.mjs'
// Gradients live in the paths' own coordinate space (x 0-14480, y 0-10860, flipped).
const gold = (id) => `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="2500" y1="9800" x2="12500" y2="900"><stop offset="0" stop-color="#94701F"/><stop offset=".3" stop-color="#E9CC7B"/><stop offset=".52" stop-color="#B58A2F"/><stop offset=".74" stop-color="#F2DC9C"/><stop offset="1" stop-color="#9E7626"/></linearGradient>`
const velvet = (id, a, b) => `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="9500" x2="0" y2="5700"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`
const BG = '#fefdf9', GAP = '#faf3ec', CUSH = '#e6d1bc', SHADE = '#cfb297', GOLD = '#a26943', FRAME = '#4a291a'

const light = (vb, w, h) => recolor({ [GAP]: '#ffffff', [CUSH]: 'url(#vl)', [SHADE]: '#7E1627', [GOLD]: 'url(#gl)', [FRAME]: '#5E1020' },
  { drop: [BG], defs: `<defs>${gold('gl')}${velvet('vl', '#B8263F', '#8A1A2D')}</defs>`, viewBox: vb, w, h })
const dark = (bg, vb, w, h) => recolor({ [GAP]: bg, [CUSH]: 'url(#vd)', [SHADE]: '#8E1B2E', [GOLD]: '#F2DC9C', [FRAME]: 'url(#gd)' },
  { drop: [BG], defs: `<defs>${gold('gd')}${velvet('vd', '#C7334B', '#9A1F33')}</defs>`, viewBox: vb, w, h })

const FULL = ['150 120 1150 790', 1150, 790]        // whole stacked logo, trimmed
const MARK = ['390 130 670 475', 670, 475]          // the sofa only
const WORD = ['150 598 1150 215', 1150, 215]        // "Heartwell" lettering only (starts below the sofa legs)
const DARKBG = '#4A0D17'
const files = {
  'hw-logo.svg': light(...FULL), 'hw-logo-reversed.svg': dark(DARKBG, ...FULL),
  'hw-mark.svg': light(...MARK), 'hw-mark-reversed.svg': dark(DARKBG, ...MARK),
  'hw-wordmark.svg': light(...WORD), 'hw-wordmark-reversed.svg': dark(DARKBG, ...WORD),
}
for (const [n, s] of Object.entries(files)) fs.writeFileSync(n, s)
// preview page
const tile = (n, bg, w) => `<div style="background:${bg};padding:16px;border-radius:12px;display:flex;align-items:center;justify-content:center">${files[n].replace(/width="\d+" height="\d+"/, `width="${w}"`)}</div>`
fs.writeFileSync('view.html', `<!doctype html><meta charset=utf-8><body style="margin:0;padding:12px;background:#eee;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;font-family:sans-serif">
${tile('hw-logo.svg', '#fff', 240)}${tile('hw-logo-reversed.svg', DARKBG, 240)}${tile('hw-mark.svg', '#F5F2F1', 120)}
<div style="background:#fff;padding:14px;border-radius:12px;display:flex;align-items:center;gap:8px">${files['hw-mark.svg'].replace(/width="\d+" height="\d+"/, 'width="52"')}${files['hw-wordmark.svg'].replace(/width="\d+" height="\d+"/, 'width="150"')}</div>
<div style="background:${DARKBG};padding:14px;border-radius:12px;display:flex;align-items:center;gap:8px">${files['hw-mark-reversed.svg'].replace(/width="\d+" height="\d+"/, 'width="52"')}${files['hw-wordmark-reversed.svg'].replace(/width="\d+" height="\d+"/, 'width="150"')}</div>
<div style="background:${DARKBG};padding:14px;border-radius:12px;display:flex;align-items:center;justify-content:center;gap:14px">${files['hw-mark-reversed.svg'].replace(/width="\d+" height="\d+"/, 'width="32"')}${files['hw-mark.svg'].replace(/width="\d+" height="\d+"/, 'width="20"')}</div>
</body>`)
console.log(Object.keys(files).map(n => n + ' ' + fs.statSync(n).size).join('\n'))
