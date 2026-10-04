// Pure helpers for the product page: what to call a choice, which page each
// size or back style links to, will it fit, and what the postcode check says.

import { classifyDeliveryPostcode, outwardCode, type PostcodeReason } from '@/lib/delivery/postcode'
import { unitPrice } from '@/lib/catalogue/pricing'
import type { FabricCollectionView, FabricView, SiblingView, VariantView } from './types'

/** "Blue, Plush Soft Velvet (PL09)": how a chosen fabric is named everywhere. */
export const fabricLabel = (name: string, collection: string, code: string) => `${name}, ${collection} (${code})`

/** "Grey", or the fabric's name for a made-to-order choice. */
export function optionLabel(variant: VariantView | null, fabric: { fabric: FabricView; collection: FabricCollectionView } | null): string {
  if (fabric) return fabricLabel(fabric.fabric.name, fabric.collection.name, fabric.fabric.code)
  return variant?.colourName ?? 'As shown'
}

/** The colourway an ad or a shared link asked for (by SKU or ID), else the first with a photo. */
export function pickVariant(variants: VariantView[], requested: string | undefined): VariantView | null {
  const wanted = requested?.trim().toLowerCase()
  if (wanted) {
    const match = variants.find((v) => v.sku.toLowerCase() === wanted || v.id.toLowerCase() === wanted)
    if (match) return match
  }
  return variants.find((v) => v.image) ?? variants[0] ?? null
}

export function pickFabric(collections: FabricCollectionView[], code: string | undefined) {
  const wanted = code?.trim().toUpperCase()
  if (!wanted) return null
  for (const collection of collections) {
    const fabric = collection.fabrics.find((f) => f.code.toUpperCase() === wanted)
    if (fabric) return { fabric, collection }
  }
  return null
}

/** Product page address, carrying the colour across when the other page has it. */
export function productHref(slug: string, sku?: string | null, fabricCode?: string | null): string {
  const params = new URLSearchParams()
  if (sku) params.set('variant', sku)
  if (fabricCode) params.set('fabric', fabricCode)
  const query = params.toString()
  return `/products/${slug}${query ? `?${query}` : ''}`
}

function hrefToSibling(s: SiblingView, colourName: string | null, fabricCode: string | null): string {
  const same = colourName ? s.variants.find((v) => v.colourName?.toLowerCase() === colourName.toLowerCase()) : undefined
  return productHref(s.slug, same?.sku, s.madeToOrder ? fabricCode : null)
}

function priceIn(s: SiblingView, colourName: string | null): number {
  const same = colourName ? s.variants.find((v) => v.colourName?.toLowerCase() === colourName.toLowerCase()) : undefined
  if (same) return unitPrice(s.basePrice, same.priceAdjustment)
  return unitPrice(s.basePrice, s.variants.length ? Math.min(...s.variants.map((v) => v.priceAdjustment)) : 0)
}

export interface OptionLink {
  label: string
  href: string
  current: boolean
  price?: number
}

/**
 * One card per size in the range. Each links to that size in the current back
 * style when it exists, otherwise to whichever back style it comes in.
 */
export function sizeOptions(siblings: SiblingView[], currentSlug: string, colourName: string | null, fabricCode: string | null): OptionLink[] {
  const current = siblings.find((s) => s.slug === currentSlug)
  if (!current || siblings.length < 2) return []
  const sizes = [...new Set(siblings.map((s) => s.axis1Value).filter((v): v is string => Boolean(v)))]
  if (sizes.length < 2) return []
  return sizes.map((size) => {
    const target =
      siblings.find((s) => s.axis1Value === size && s.axis2Value === current.axis2Value) ?? siblings.find((s) => s.axis1Value === size)!
    return {
      label: size,
      href: hrefToSibling(target, colourName, fabricCode),
      current: target.slug === currentSlug,
      price: priceIn(target, colourName),
    }
  })
}

/** The back styles this size comes in; empty when there's no choice to make. */
export function backOptions(siblings: SiblingView[], currentSlug: string, colourName: string | null, fabricCode: string | null): OptionLink[] {
  const current = siblings.find((s) => s.slug === currentSlug)
  if (!current?.axis2Value) return []
  const sameSize = siblings.filter((s) => s.axis1Value === current.axis1Value && s.axis2Value)
  if (sameSize.length < 2) return []
  return sameSize.map((s) => ({ label: s.axis2Value!, href: hrefToSibling(s, colourName, fabricCode), current: s.slug === currentSlug }))
}

// Will it fit through the door? -------------------------------------------------

export type FitOutcome =
  | { kind: 'invalid' }
  | { kind: 'unknown' }
  | { kind: 'fits' | 'tight' | 'no'; needed: number; door: number }

/**
 * Sofas go through a doorway on their side or end, so the smaller of depth and
 * height has to pass. Corners and U-shapes come in sections of the same depth.
 * 5 cm of room is comfortable; less is a squeeze worth talking about.
 */
export function checkFit(doorCm: number, dims: { depth_cm: number | null; height_cm: number | null }): FitOutcome {
  if (!Number.isFinite(doorCm) || doorCm < 40 || doorCm > 250) return { kind: 'invalid' }
  const sides = [dims.depth_cm, dims.height_cm].filter((n): n is number => typeof n === 'number' && n > 0)
  if (sides.length === 0) return { kind: 'unknown' }
  const needed = Math.min(...sides)
  const room = doorCm - needed
  return { kind: room >= 5 ? 'fits' : room >= 0 ? 'tight' : 'no', needed, door: doorCm }
}

// Postcode check -------------------------------------------------------------

const QUOTE_PLACES: Partial<Record<PostcodeReason | 'mixed_geography_unavailable', string>> = {
  northern_ireland: 'Northern Ireland',
  isle_of_man: 'the Isle of Man',
  channel_islands: 'the Channel Islands',
  isle_of_wight: 'the Isle of Wight',
  isles_of_scilly: 'the Isles of Scilly',
  scottish_island: 'the Scottish islands',
  mixed_geography_island: 'the Scottish islands',
}

export type PostcodeOutcome =
  | { kind: 'empty' }
  | { kind: 'invalid' }
  | { kind: 'free'; area: string; postcode: string }
  | { kind: 'depends'; area: string; postcode: string }
  | { kind: 'quote'; area: string; postcode: string; place: string | null }

export function postcodeOutcome(raw: string): PostcodeOutcome {
  if (!raw.trim()) return { kind: 'empty' }
  const result = classifyDeliveryPostcode(raw)
  if (result.kind === 'invalid') return { kind: 'invalid' }
  const area = outwardCode(result.postcode)
  if (result.kind === 'ambiguous') return { kind: 'depends', area, postcode: result.postcode }
  if (result.zone === 'MAINLAND_STANDARD') return { kind: 'free', area, postcode: result.postcode }
  return { kind: 'quote', area, postcode: result.postcode, place: QUOTE_PLACES[result.reason] ?? null }
}
