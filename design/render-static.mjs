// Renders the .dc.html design boards to plain HTML (their default state), so
// they can be screenshotted or opened in any browser without the canvas runtime.
// Usage: node design/render-static.mjs   (writes design/static/*.html)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const BLOBS = {
  '28b59cd7da19b980563e5c8b95f31d23': '../preview-photos/white-lily-high-back-5-seater-corner-grey.jpg',
  '886eaf8ca434f44ce94ec18f70b99528': '../preview-photos/white-lily-high-back-5-seater-corner-navy-blue.jpg',
  '0428f75cd87b7df17b3d7582383e431f': '../preview-photos/white-lily-high-back-5-seater-corner-black.jpg',
  '70e63e224052d3ca8a5bba73482cf1fb': '../preview-photos/white-lily-high-back-5-seater-corner-beige.jpg',
  '037d06704b915b81248a3f985fdc197c': '../preview-photos/white-malibu-high-back-5-seater-corner-oatmeal.jpg',
  'fc2acbe5ebd8132cda6ad8437012341b': '../preview-photos/white-ashton-high-back-3and2-seater-grey.jpg',
  '985eaacfcd32fe311def0bf716f13fca': '../preview-photos/white-roma-recliner-manual-3-and-2-black.jpg',
  '79032c46fc22409c3dfc51056bf44885': '../logo/hw-logo.svg',
  '3cbd1050b2e6dc7a51c7bdfcc7864956': '../logo/hw-logo-reversed.svg',
  '24ba8ed14e952000205ea0124178e2c2': '../logo/hw-mark.svg',
  'bf76a52477ed141082a7f1a5bd9f14f7': '../logo/hw-mark-reversed.svg',
  '12018461235151766f2270a648128ff6': '../logo/hw-wordmark.svg',
  '907c5177a27cba384cb1b9660caacd91': '../logo/hw-wordmark-reversed.svg',
}

const get = (ctx, p) => p.trim().split('.').reduce((o, k) => (o == null ? undefined : o[k]), ctx)

/** Index of the closing tag that matches the element opened just before `from`. */
function findClose(s, from, tag) {
  let depth = 1
  let i = from
  const openRe = new RegExp('<' + tag + '[\\s>]', 'g')
  const closeRe = new RegExp('</' + tag + '>', 'g')
  while (depth > 0) {
    openRe.lastIndex = i
    closeRe.lastIndex = i
    const o = openRe.exec(s)
    const c = closeRe.exec(s)
    if (!c) throw new Error('unclosed ' + tag)
    if (o && o.index < c.index) {
      depth++
      i = o.index + 1
    } else {
      depth--
      i = c.index + c[0].length
      if (depth === 0) return c.index
    }
  }
  return -1
}

function render(tpl, ctx) {
  let out = ''
  for (;;) {
    const m = /<(sc-for|sc-if)\b([^>]*)>/.exec(tpl)
    if (!m) {
      out += tpl
      break
    }
    out += tpl.slice(0, m.index)
    const tag = m[1]
    const attrs = m[2]
    const innerStart = m.index + m[0].length
    const closeAt = findClose(tpl, innerStart, tag)
    const inner = tpl.slice(innerStart, closeAt)
    const attr = (n) => (new RegExp(n + '="\\{\\{([^}]*)\\}\\}"').exec(attrs) || [])[1]
    if (tag === 'sc-for') {
      const list = get(ctx, attr('list')) || []
      const as = /as="([^"]+)"/.exec(attrs)[1]
      list.forEach((item, idx) => {
        out += render(inner, { ...ctx, [as]: item, $index: idx })
      })
    } else if (get(ctx, attr('value'))) {
      out += render(inner, ctx)
    }
    tpl = tpl.slice(closeAt + ('</' + tag + '>').length)
  }
  return out
    .replace(/\s(on[A-Z]\w*)="\{\{[^}]*\}\}"/g, '')
    .replace(/\{\{([^}]+)\}\}/g, (_, p) => {
      const v = get(ctx, p)
      return v == null ? '' : String(v)
    })
}

class DCLogic {
  constructor(props) {
    this.props = props || {}
    this.state = {}
  }
  setState(s) {
    Object.assign(this.state, s)
  }
}

fs.mkdirSync(path.join(here, 'static'), { recursive: true })
for (const name of ['Main', 'Home', 'Product', 'StyleGuide']) {
  const src = fs.readFileSync(path.join(here, 'canvas/project', name + '.dc.html'), 'utf8')
  const body = src.slice(src.indexOf('<x-dc>') + 6, src.indexOf('</x-dc>'))
  const helmet = body.slice(body.indexOf('<helmet>') + 8, body.indexOf('</helmet>'))
  const tpl = body.slice(body.indexOf('</helmet>') + 9)
  const scriptStart = src.indexOf('>', src.indexOf('data-dc-script')) + 1
  const code = src.slice(scriptStart, src.lastIndexOf('</script>'))
  const Component = new Function('DCLogic', code + '; return Component;')(DCLogic)
  const vals = new Component({}).renderVals()
  let html = render(tpl, vals)
  for (const [id, file] of Object.entries(BLOBS)) html = html.split('/_blob/' + id).join(file)
  fs.writeFileSync(
    path.join(here, 'static', name + '.html'),
    '<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>Heartwell ' + name + '</title>' + helmet + '</head><body>' + html + '</body></html>',
  )
  console.log(name, 'ok')
}
