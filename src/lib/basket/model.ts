// The basket, as plain data and pure functions. It lives on the customer's
// device (localStorage), so it survives the Facebook or Instagram app being
// closed, and needs no account.
//
// A line is a colourway (variant) and, for made-to-order pieces, a fabric
// (material). Those identities and the quantity are all checkout sends; the
// `view` is the last-known title, photo and price for instant display, and the
// basket page refreshes it from the catalogue.

export interface BasketLineView {
  slug: string
  sku: string
  title: string
  /** "Grey" or "Blue, Plush Soft Velvet (PL09)". */
  option: string
  image: string | null
  unitPrice: number
  madeToOrder: boolean
}

export interface BasketLine {
  /** Stable line ID, sent to place_order as item_id. */
  id: string
  variantId: string
  materialId: string | null
  quantity: number
  addedAt: number
  view: BasketLineView
}

export const MAX_LINES = 30
export const MAX_QUANTITY = 10

export interface NewLine {
  variantId: string
  materialId: string | null
  quantity?: number
  view: BasketLineView
}

const clampQuantity = (n: number) => Math.min(MAX_QUANTITY, Math.max(1, Math.floor(n)))

/** Adds a line, or adds to the quantity of the same colourway and fabric. */
export function addLine(lines: BasketLine[], input: NewLine, id: string, now: number): BasketLine[] {
  const quantity = clampQuantity(input.quantity ?? 1)
  const existing = lines.find((l) => l.variantId === input.variantId && l.materialId === input.materialId)
  if (existing) {
    return lines.map((l) => (l === existing ? { ...l, quantity: clampQuantity(l.quantity + quantity), view: input.view } : l))
  }
  if (lines.length >= MAX_LINES) return lines
  return [...lines, { id, variantId: input.variantId, materialId: input.materialId, quantity, addedAt: now, view: input.view }]
}

export function setQuantity(lines: BasketLine[], id: string, quantity: number): BasketLine[] {
  return lines.map((l) => (l.id === id ? { ...l, quantity: clampQuantity(quantity) } : l))
}

export function removeLine(lines: BasketLine[], id: string): BasketLine[] {
  return lines.filter((l) => l.id !== id)
}

/** Replaces each line's display details with fresh ones; drops lines no longer on sale. */
export function refreshLines(lines: BasketLine[], fresh: Record<string, BasketLineView | null>): BasketLine[] {
  return lines.flatMap((l) => {
    if (!(l.id in fresh)) return [l]
    const view = fresh[l.id]
    return view ? [{ ...l, view }] : []
  })
}

export const basketCount = (lines: BasketLine[]) => lines.reduce((n, l) => n + l.quantity, 0)

export const basketSubtotal = (lines: BasketLine[]) =>
  Math.round(lines.reduce((sum, l) => sum + l.view.unitPrice * l.quantity, 0) * 100) / 100

const isText = (v: unknown, max = 300): v is string => typeof v === 'string' && v.length > 0 && v.length <= max
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Reads whatever is in storage, keeping only well-formed lines. Never throws. */
export function parseBasket(raw: unknown): BasketLine[] {
  if (!Array.isArray(raw)) return []
  const lines: BasketLine[] = []
  for (const item of raw.slice(0, MAX_LINES)) {
    if (!item || typeof item !== 'object') continue
    const l = item as Record<string, unknown>
    const v = (l.view ?? {}) as Record<string, unknown>
    if (!isText(l.id) || !isText(l.variantId) || !UUID.test(l.variantId)) continue
    if (l.materialId !== null && !(isText(l.materialId) && UUID.test(l.materialId))) continue
    if (typeof l.quantity !== 'number' || !Number.isFinite(l.quantity)) continue
    if (!isText(v.slug) || !isText(v.sku) || !isText(v.title) || typeof v.option !== 'string') continue
    if (typeof v.unitPrice !== 'number' || !Number.isFinite(v.unitPrice) || v.unitPrice < 0) continue
    lines.push({
      id: l.id,
      variantId: l.variantId,
      materialId: (l.materialId as string | null) ?? null,
      quantity: clampQuantity(l.quantity),
      addedAt: typeof l.addedAt === 'number' ? l.addedAt : 0,
      view: {
        slug: v.slug,
        sku: v.sku,
        title: v.title,
        option: v.option,
        image: isText(v.image, 2000) ? v.image : null,
        unitPrice: v.unitPrice,
        madeToOrder: v.madeToOrder === true,
      },
    })
  }
  return lines
}

// Saved items: one per product, remembering the colour the customer saved.

export interface SavedItem {
  slug: string
  sku: string | null
  savedAt: number
}

export const MAX_SAVED = 50

export function toggleSaved(items: SavedItem[], slug: string, sku: string | null, now: number): SavedItem[] {
  return items.some((i) => i.slug === slug)
    ? items.filter((i) => i.slug !== slug)
    : [{ slug, sku, savedAt: now }, ...items].slice(0, MAX_SAVED)
}

export function parseSaved(raw: unknown): SavedItem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((i): i is Record<string, unknown> => Boolean(i) && typeof i === 'object')
    .filter((i) => isText(i.slug, 200) && /^[a-z0-9-]+$/.test(i.slug as string))
    .slice(0, MAX_SAVED)
    .map((i) => ({ slug: i.slug as string, sku: isText(i.sku, 100) ? (i.sku as string) : null, savedAt: typeof i.savedAt === 'number' ? i.savedAt : 0 }))
}
