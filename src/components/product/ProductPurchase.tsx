'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Price } from '@/components/ui/Price'
import { buttonClasses } from '@/components/ui/Button'
import { WhatsAppGlyph } from '@/components/ui/WhatsAppGlyph'
import { whatsAppHref } from '@/config/contact'
import { SITE_URL } from '@/config/site'
import { cn } from '@/lib/cn'
import { formatPrice } from '@/lib/format'
import { useBasket } from '@/lib/basket/store'
import { unitPrice } from '@/lib/catalogue/pricing'
import { backOptions, optionLabel, productHref, sizeOptions } from '@/lib/product/helpers'
import type { ProductPageData } from '@/lib/product/types'
import { Gallery } from './Gallery'
import { SaveButton } from './SaveButton'
import { FabricSheet, FabricSwatch, type ChosenFabric } from './FabricSheet'
import { AddedSheet, type AddedItem } from './AddedSheet'
import { StickyBuyBar } from './StickyBuyBar'

export type PurchaseProduct = Pick<
  ProductPageData,
  'slug' | 'title' | 'typeName' | 'basePrice' | 'madeToOrder' | 'madeInUk' | 'variants' | 'siblings' | 'fabrics' | 'gallery' | 'range'
>

/**
 * Everything on the product page that changes with the customer's choices:
 * photos, colour or fabric, size and back style, price, and adding to the
 * basket. The details below the buttons are server-rendered and passed in.
 */
export function ProductPurchase({
  product: p,
  initialVariantId,
  initialFabric,
  children,
}: {
  product: PurchaseProduct
  initialVariantId: string | null
  initialFabric: ChosenFabric | null
  children: ReactNode
}) {
  const basket = useBasket()
  const [variantId, setVariantId] = useState(initialVariantId)
  const [fabric, setFabric] = useState<ChosenFabric | null>(initialFabric)
  const [fabricsOpen, setFabricsOpen] = useState(false)
  const [added, setAdded] = useState<AddedItem | null>(null)
  const addRef = useRef<HTMLButtonElement>(null)

  const variant = p.variants.find((v) => v.id === variantId) ?? p.variants[0] ?? null
  const price = unitPrice(p.basePrice, variant?.priceAdjustment ?? 0, fabric?.collection.surcharge ?? 0)
  const option = optionLabel(variant, fabric)
  const noun = p.typeName.toLowerCase()
  const fabricCount = p.fabrics.reduce((n, c) => n + c.fabrics.length, 0)

  // Once the customer changes colour or fabric, keep the address in step so a
  // shared link opens on their choice. Every other parameter (an ad's utm_ and
  // click IDs) is kept exactly as it arrived.
  const chosen = useRef(false)
  useEffect(() => {
    if (!chosen.current || !variant) return
    const url = new URL(window.location.href)
    url.searchParams.set('variant', variant.sku)
    if (fabric) url.searchParams.set('fabric', fabric.fabric.code)
    else url.searchParams.delete('fabric')
    if (url.href !== window.location.href) window.history.replaceState(null, '', url)
  }, [variant, fabric])

  const images = useMemo(() => {
    const alt = (colour: string | null) => (colour ? `${p.title} in ${colour.toLowerCase()}` : p.title)
    const list = [
      ...(variant?.image ? [{ src: variant.image, alt: alt(variant.colourName) }] : []),
      ...p.gallery.map((src) => ({ src, alt: alt(variant?.colourName ?? null) })),
    ]
    return list.filter((img, i) => list.findIndex((x) => x.src === img.src) === i)
  }, [p.title, p.gallery, variant])

  const colourName = fabric ? null : (variant?.colourName ?? null)
  const sizes = sizeOptions(p.siblings, p.slug, colourName, fabric?.fabric.code ?? null)
  const backs = backOptions(p.siblings, p.slug, colourName, fabric?.fabric.code ?? null)

  const addToBasket = () => {
    if (!variant) return
    const image = variant.image ?? p.gallery[0] ?? null
    basket.add({
      variantId: variant.id,
      materialId: fabric?.fabric.id ?? null,
      view: { slug: p.slug, sku: variant.sku, title: p.title, option, image, unitPrice: price, madeToOrder: p.madeToOrder },
    })
    setAdded({ title: p.title, option, image, price })
  }

  const wa = whatsAppHref(`Hi Heartwell, I have a question about the ${p.title} (${option}): ${SITE_URL}${productHref(p.slug, variant?.sku, fabric?.fabric.code)}`)

  return (
    <>
      <div className="mx-auto max-w-[1200px] lg:grid lg:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)] lg:gap-12 lg:px-6">
        <div className="lg:sticky lg:top-6 lg:self-start">
          <Gallery
            key={variant?.id ?? 'none'}
            images={images}
            priority
            caption={variant?.colourName ? [variant.colourName, variant.materialLabel].filter(Boolean).join(' ') : null}
            overlay={<SaveButton slug={p.slug} sku={variant?.sku ?? null} noun={noun} />}
          />
        </div>

        <div className="flex flex-col px-4 pt-4 lg:px-0 lg:pt-0">
          <div className="flex flex-col gap-2.5">
            {(p.madeToOrder || p.madeInUk) && (
              <div className="flex flex-wrap gap-2">
                {p.madeToOrder && <Badge>Made to order</Badge>}
                {p.madeInUk && <Badge>Made in the UK</Badge>}
              </div>
            )}
            <h1 className="text-[30px] leading-[1.12] lg:text-[40px]">{p.title}</h1>
            <p className="flex items-baseline gap-3">
              <Price amount={price} className="text-[32px] leading-none" />
              <span className="text-[15px] font-semibold text-velvet">Free delivery</span>
            </p>
            <p className="text-[15px] text-slate">Pay nothing today. Pay the driver when it arrives.</p>
          </div>

          {p.variants.length > 0 && (
            <fieldset className="flex flex-col gap-3 pt-6">
              <legend className="pb-3 text-[15px]">
                <span className="font-semibold">Colour: </span>
                <span className="text-slate">{fabric ? `${fabric.fabric.name}, ${fabric.collection.name}` : (variant?.colourName ?? 'As shown')}</span>
              </legend>
              <div className="flex flex-wrap gap-3">
                {p.variants.map((v) => (
                  <label
                    key={v.id}
                    title={v.colourName ?? undefined}
                    className={cn(
                      'flex size-12 cursor-pointer items-center justify-center rounded-full p-1 has-[:focus-visible]:shadow-[var(--shadow-focus)]',
                      !fabric && v.id === variant?.id ? 'ring-2 ring-velvet' : 'ring-1 ring-line',
                    )}
                  >
                    <input
                      type="radio"
                      name="colour"
                      className="sr-only"
                      checked={!fabric && v.id === variant?.id}
                      onChange={() => {
                        chosen.current = true
                        setVariantId(v.id)
                        setFabric(null)
                      }}
                    />
                    <span className="size-full rounded-full shadow-[inset_0_0_0_1px_rgba(34,23,26,.2)]" style={{ backgroundColor: v.colourHex ?? '#F5F1EF' }} />
                    <span className="sr-only">{v.colourName ?? v.sku}</span>
                  </label>
                ))}
              </div>

              {p.madeToOrder && fabricCount > 0 && (
                <div className="flex flex-col gap-3">
                  {fabric && (
                    <div className="flex items-center gap-3 rounded-2xl bg-gold-cream-tint p-3">
                      <FabricSwatch fabric={fabric.fabric} size={40} />
                      <p className="text-[15px] leading-snug">
                        <span className="font-semibold">Made in {option}.</span>{' '}
                        <span className="text-slate">The photo shows {variant?.colourName?.toLowerCase() ?? 'another colour'}.</span>
                      </p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setFabricsOpen(true)}
                    className="flex min-h-12 items-center gap-3 self-start rounded-full border border-line bg-white py-1.5 pl-2 pr-4 text-[15px] font-semibold text-velvet"
                  >
                    <span aria-hidden="true" className="flex">
                      {p.fabrics
                        .slice(0, 3)
                        .map((c) => c.fabrics[Math.floor(c.fabrics.length / 2)])
                        .filter((f) => f !== undefined)
                        .map((f, i) => (
                          <span key={f.id} className="pinked block size-[26px]" style={{ backgroundColor: f.hex ?? '#F5F1EF', marginLeft: i ? -8 : 0 }} />
                        ))}
                    </span>
                    {fabric ? 'Change fabric' : `Or choose from ${fabricCount} fabrics`}
                  </button>
                </div>
              )}
            </fieldset>
          )}

          {sizes.length > 0 && (
            <nav aria-label={p.range?.axis1Name ?? 'Size'} className="flex flex-col gap-3 pt-6">
              <span className="text-[15px] font-semibold">{p.range?.axis1Name ?? 'Size'}</span>
              <ul className="grid grid-cols-2 gap-2">
                {sizes.map((s) => (
                  <li key={s.label}>
                    <Link
                      href={s.href}
                      aria-current={s.current ? 'page' : undefined}
                      className={cn(
                        'flex min-h-[60px] flex-col justify-center rounded-2xl px-3 py-2 text-ink no-underline',
                        s.current ? 'border-2 border-velvet bg-gold-tint' : 'border border-line bg-white hover:border-velvet',
                      )}
                    >
                      <span className="text-[15px] font-semibold leading-tight">{s.label}</span>
                      {s.price !== undefined && <span className="text-sm leading-tight text-slate">{formatPrice(s.current ? price : s.price)}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {backs.length > 0 && (
            <nav aria-label={p.range?.axis2Name ?? 'Style'} className="flex flex-col gap-3 pt-5">
              <span className="text-[15px] font-semibold">{p.range?.axis2Name ?? 'Style'}</span>
              <ul className="flex gap-1 rounded-full bg-stone p-1">
                {backs.map((b) => (
                  <li key={b.label} className="flex-1">
                    <Link
                      href={b.href}
                      aria-current={b.current ? 'page' : undefined}
                      className={cn(
                        'flex min-h-11 items-center justify-center rounded-full px-3 text-center text-[15px] font-semibold no-underline',
                        b.current ? 'bg-velvet text-white hover:text-white' : 'text-velvet',
                      )}
                    >
                      {b.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <div className="flex flex-col gap-3 pt-6">
            <button
              ref={addRef}
              type="button"
              onClick={addToBasket}
              disabled={!variant}
              className={buttonClasses({ variant: 'primary', block: true })}
            >
              {variant ? 'Add to basket' : 'Not available to order online'}
            </button>
            {wa && (
              <a href={wa} className={buttonClasses({ variant: 'secondary', block: true })}>
                <WhatsAppGlyph />
                Ask about this {noun} on WhatsApp
              </a>
            )}
          </div>

          {children}
        </div>
      </div>

      {variant && <StickyBuyBar price={price} onAdd={addToBasket} watch={addRef} />}
      <AddedSheet item={added} onClose={() => setAdded(null)} />
      {p.madeToOrder && (
        <FabricSheet
          open={fabricsOpen}
          onClose={() => setFabricsOpen(false)}
          collections={p.fabrics}
          chosen={fabric}
          onChoose={(choice) => {
            chosen.current = true
            setFabric(choice)
            setFabricsOpen(false)
          }}
          rangeName={p.range?.name ?? p.title}
        />
      )}
    </>
  )
}
