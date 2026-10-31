// Which cached product route serves an address (audit A4), for src/proxy.ts.
// Pure, so it's tested.
//
// /products/<slug>?variant=<sku>&fabric=<code> is served by the colourway route
// /products/<slug>/<sku>/<code> (- for no colourway), so the page asked for is
// built ahead and cached while the address people see stays the same. Only
// well-formed SKUs and codes go there; anything else gets the plain page (which
// opens on the first colourway, as a wrong SKU always has). The inner address,
// opened directly, goes back to the real one, so it's never a second copy.

const PRODUCT = /^\/products\/([^/]+)\/?$/
const INNER = /^\/products\/([^/]+)\/([^/]+)(?:\/([^/]+))?\/?$/
const CODE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,47}$/
const NO_VARIANT = '-'

export function productRoute(pathname: string, params: URLSearchParams): { rewrite?: string; redirect?: string } | null {
  const plain = PRODUCT.exec(pathname)
  if (plain) {
    const variant = params.get('variant')?.trim() ?? ''
    const fabric = params.get('fabric')?.trim() ?? ''
    const sku = CODE.test(variant) ? variant : ''
    const code = CODE.test(fabric) ? fabric : ''
    if (!sku && !code) return null
    return { rewrite: `/products/${plain[1]}/${encodeURIComponent(sku || NO_VARIANT)}${code ? `/${encodeURIComponent(code)}` : ''}` }
  }
  const inner = INNER.exec(pathname)
  if (inner) {
    const [, slug, variant, fabric] = inner
    const query = new URLSearchParams(params)
    query.delete('variant')
    query.delete('fabric')
    if (variant && decodeURIComponent(variant) !== NO_VARIANT) query.set('variant', decodeURIComponent(variant))
    if (fabric) query.set('fabric', decodeURIComponent(fabric))
    const search = query.toString()
    return { redirect: `/products/${slug}${search ? `?${search}` : ''}` }
  }
  return null
}
