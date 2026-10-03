import fs from 'node:fs'
const src = fs.readFileSync('vec-v1.svg', 'utf8')
// Each colour layer is its own nested <svg ...><g fill="#xxxxxx" ...>...</g></svg>
function dropLayer(s, colour) {
  const g = s.indexOf(`<g fill="${colour}"`)
  if (g < 0) return s
  const start = s.lastIndexOf('<svg', g)
  const end = s.indexOf('</svg>', g) + '</svg>'.length
  return s.slice(0, start) + s.slice(end)
}
export function recolor(map, { drop = [], defs = '', viewBox = '0 0 1448 1086', w = 1448, h = 1086 } = {}) {
  let out = src
  for (const c of drop) out = dropLayer(out, c)
  for (const [from, to] of Object.entries(map)) out = out.split(`fill="${from}"`).join(`fill="${to}"`)
  out = out.replace(/^<svg([^>]*?)width="1448" height="1086">/, `<svg$1width="${w}" height="${h}" viewBox="${viewBox}">${defs}`)
  return out
}
