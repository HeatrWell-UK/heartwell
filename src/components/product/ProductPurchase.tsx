'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Price } from '@/components/ui/Price'
import { buttonClasses } from '@/components/ui/Button'
import { WhatsAppGlyph } from '@/components/ui/WhatsAppGlyph'
import { WhatsAppButton } from '@/components/ui/WhatsAppButton'
import { SITE_URL } from '@/config/site'
import { cn } from '@/lib/cn'
import { formatPrice } from '@/lib/format'
import { useBasket } from '@/lib/basket/store'
import { track } from '@/lib/tracking/browser'
import { unitPrice } from '@/lib/catalogue/pricing'
import { backOptions, optionLabel, productHref, sizeOptions } from '@/lib/product/helpers'
import type { ProductPageData } from '@/lib/product/types'
import { Gallery } from './Gallery'
import { SaveButton } from './SaveButton'
import { FabricSheet, FabricSwatch, type ChosenFabric } from './FabricSheet'
import { AddedSheet, type AddedItem } from './AddedSheet'
import { StickyBuyBar } from './StickyBuyBar'
import { OfferStrip, useOfferEnds } from '@/components/offer/OfferStrip'
import { useWelcome, WelcomePanel } from '@/components/offer/WelcomeOffer'
import { WhatsAppTopic } from '@/components/whatsapp/WhatsAppTopic'
import { ScalePlan } from '@/components/catalogue/ScalePlan'
import { planFrame, sizeLabel } from '@/lib/catalogue/range-sizes'
import { dealFor, dealLabel } from '@/lib/catalogue/deal'
import { homeSwatches } from '@/lib/home/picks'
import { bestOffer, welcomeOff, type ShopOffers } from '@/lib/offers/welcome'
import type { Layout } from '@/lib/product/measurements'
import { InfoIcon } from '@phosphor-icons/react'

export type PurchaseProduct = Pick<
  ProductPageData,
  | 'id'
  | 'slug'
  | 'title'
  | 'typeName'
  | 'basePrice'
  | 'wasPrice'
  | 'madeToOrder'
  | 'madeInUk'
  | 'variants'
  | 'siblings'
  | 'fabrics'
  | 'gallery'
  | 'range'
  | 'offerTier'
  | 'axis1Value'
  | 'axis2Value'
>

/** A size's top view and seats, keyed by the product's slug, for the size cards. */
export type SizePlans = Record<string, { plan: Layout | null; seats: number | null }>

/**
 * Everything on the product page that changes with the customer's choices:
 * photos, colour or fabric, size and back style, price, and adding to the
 * basket. The details below the buttons are server-rendered and passed in.
 */
export function ProductPurchase({
  product: p,
  initialVariantId,
  initialFabric,
  adAmount,
  offers,
  plans,
  crumbs,
  children,
}: {
  product: PurchaseProduct
  initialVariantId: string | null
  initialFabric: ChosenFabric | null
  plans: SizePlans
  /** Where the piece sits in the shop, shown at the top of the photos' velvet stage. */
  crumbs?: ReactNode
  /** What an ad visitor’s offer takes off this piece (its tier's amount). */
  adAmount: number
  /** The welcome offer, the minimum order, and the ad offer's code and amounts. */
  offers: ShopOffers
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

  // ViewContent for each colourway looked at (variant ID = the Meta catalogue item ID).
  const viewedId = variant?.id
  useEffect(() => {
    if (viewedId) track('ViewContent', { contentIds: [viewedId], contentName: p.title, value: price })
    // Price follows the colourway; only a new colourway is a new view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewedId])

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
  // Each size's top view, all to one scale (the same drawings as the range page).
  const frame = planFrame(sizes.map((s) => plans[s.slug]?.plan ?? null))

  // A was-price, with the same colourway or fabric difference as today's price.
  const deal = dealFor(price, p.wasPrice === null ? null : unitPrice(p.wasPrice, variant?.priceAdjustment ?? 0, fabric?.collection.surcharge ?? 0))

  // One offer comes off what's paid on delivery, while it's live: the welcome
  // offer or an ad visitor's, whichever takes more off (as the database decides).
  const welcome = useWelcome(offers.welcome.enabled)
  const adEnds = useOfferEnds()
  const adOff = adEnds ? Math.min(adAmount, price) : 0
  const welcomeAmount = welcomeOff(1, price, offers.welcome.amount)
  const showWelcome = welcome.kind !== 'none' && welcomeAmount > adOff
  const offer = bestOffer(welcome.kind === 'live' ? welcomeAmount : 0, adOff)
  const offerOff = offer.amount

  const sizeText = p.axis1Value ? [p.axis1Value, p.axis2Value].filter((v): v is string => Boolean(v)).map(sizeLabel) : []
  const heading =
    p.range && sizeText.length > 0
      ? { name: p.range.name, detail: sizeText.map((t, i) => (i ? t.charAt(0).toLowerCase() + t.slice(1) : t)).join(', ') }
      : { name: p.title, detail: null }

  const addToBasket = () => {
    if (!variant) return
    const image = variant.image ?? p.gallery[0] ?? null
    basket.add({
      variantId: variant.id,
      materialId: fabric?.fabric.id ?? null,
      view: { slug: p.slug, sku: variant.sku, title: p.title, option, image, unitPrice: price, madeToOrder: p.madeToOrder, offerTier: p.offerTier },
    })
    setAdded({ title: p.title, option, image, price })
    track('AddToCart', { contents: [{ id: variant.id, quantity: 1, item_price: price }], contentName: p.title, value: price })
  }

  const waMessage = `Hi Heartwell, I have a question about the ${p.title} (${option}): ${SITE_URL}${productHref(p.slug, variant?.sku, fabric?.fabric.code)}`

  return (
    <>
      <div className="mx-auto max-w-[1200px] lg:grid lg:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)] lg:gap-12 lg:px-6 lg:pt-4">
        {/* The photos on a velvet stage, in their lit alcove: a band across phones, a panel beside the buy box on desktops. */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="hw-velvet hw-gold-edge overflow-hidden px-4 pb-8 lg:rounded-[var(--radius-panel)] lg:border-b-0 lg:px-8 lg:pb-9">
            {crumbs}
            <div className={crumbs ? 'pt-1' : 'pt-5'}>
              <Gallery
                key={variant?.id ?? 'none'}
                images={images}
                priority
                caption={variant?.colourName ? [variant.colourName, variant.materialLabel].filter(Boolean).join(' ') : null}
                overlay={<SaveButton slug={p.slug} sku={variant?.sku ?? null} noun={noun} className="right-1 top-1 size-11" />}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col px-4 pt-5 lg:px-0 lg:pt-2">
          <div className="flex flex-col gap-3">
            {(p.madeToOrder || p.madeInUk) && (
              <div className="flex flex-wrap gap-2">
                {p.madeToOrder && <Badge>Made to order</Badge>}
                {p.madeInUk && <Badge>Made in the UK</Badge>}
              </div>
            )}
            {/* "Salone" over "5 seater corner": the same name and size the tiles use; the full title is still the heading's text. */}
            <h1 className="flex flex-col gap-1.5">
              <span className="text-[40px] leading-none lg:text-[52px]">{heading.name}</span>
              {heading.detail && <span className="font-sans text-[17px] leading-snug tracking-normal text-slate">{heading.detail}</span>}
            </h1>
            <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5 pt-1">
              {deal && <span className="sr-only">Now </span>}
              <Price amount={price} className="text-[34px] leading-none" />
              {deal && (
                <>
                  <s className="font-display text-[21px] leading-none text-slate decoration-[1.5px]">
                    <span className="sr-only">, was </span>
                    {formatPrice(deal.was)}
                  </s>
                  <span className="self-center rounded-full bg-gold-pale px-2.5 py-1 text-[13px] font-semibold leading-none text-wine">{dealLabel(deal, formatPrice)}</span>
                </>
              )}
              <span className="text-[15px] font-semibold text-velvet">Free delivery for most postcodes</span>
            </p>
            {showWelcome && <WelcomePanel state={welcome} amount={welcomeAmount} hours={offers.welcome.hours} noun={noun} />}
            {/* What's paid when: the shop's whole promise, in two lines. */}
            <dl className="flex flex-col rounded-[14px] border border-line px-3.5 text-[15px]">
              <div className="flex items-baseline justify-between gap-3 border-b border-line-soft py-2.5">
                <dt>To pay today</dt>
                <dd className="font-display text-[20px] leading-none text-velvet">£0</dd>
              </div>
              {/* One term with two descriptions (the amount and how it's paid), so the list stays valid for screen readers. */}
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2.5">
                <dt>To pay on delivery</dt>
                <dd className="font-display text-[20px] leading-none">{formatPrice(price - offerOff)}</dd>
                <dd className="basis-full text-[13px] leading-snug text-slate">
                  Cash or bank transfer to the driver, once it&rsquo;s in your room
                  {offerOff > 0 ? `, with your ${formatPrice(offerOff)} ${offer.kind === 'welcome' ? 'welcome offer' : 'offer'} taken off` : ''}.
                </dd>
              </div>
            </dl>
            {!showWelcome && <OfferStrip amount={Math.min(adAmount, price)} noun={noun} code={offers.code} />}
          </div>

          {p.variants.length > 0 && (
            <fieldset className="mt-6 flex flex-col gap-3">
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
                      {/* Light, middle and dark, never green, pink or orange (the owner's rule for the shop's own pages). */}
                      {homeSwatches(p.fabrics, 3).map((f, i) => (
                        <span key={f.code} className="pinked block size-[26px]" style={{ backgroundColor: f.hex, marginLeft: i ? -8 : 0 }} />
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
                {sizes.map((s) => {
                  const drawing = plans[s.slug]
                  return (
                    <li key={s.label}>
                      <Link
                        href={s.href}
                        aria-current={s.current ? 'page' : undefined}
                        className={cn(
                          'flex h-full min-h-[64px] items-center gap-3 rounded-2xl px-3 py-2 text-ink no-underline',
                          s.current ? 'border-2 border-velvet bg-gold-tint' : 'border border-line bg-white hover:border-velvet',
                        )}
                      >
                        {frame && (
                          <span className="flex w-12 shrink-0 items-end self-stretch py-1">
                            {drawing?.plan && <ScalePlan layout={drawing.plan} frame={frame} seats={drawing.seats} />}
                          </span>
                        )}
                        <span className="flex min-w-0 flex-col">
                          <span className="text-[15px] font-semibold leading-tight">{sizeLabel(s.label)}</span>
                          {s.price !== undefined && <span className="text-sm leading-tight text-slate">{formatPrice(s.current ? price : s.price)}</span>}
                        </span>
                      </Link>
                    </li>
                  )
                })}
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
                      {sizeLabel(b.label)}
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
            <WhatsAppButton
              message={waMessage}
              context="product"
              productId={p.id}
              variantId={variant?.id}
              productName={p.title}
              className={buttonClasses({ variant: 'secondary', block: true })}
            >
              <WhatsAppGlyph />
              Ask about this {noun} on WhatsApp
            </WhatsAppButton>
            {variant && price < offers.minOrder && (
              <p className="flex items-start gap-2 text-[14px] leading-snug text-slate">
                <InfoIcon aria-hidden="true" size={18} className="mt-px shrink-0 text-velvet" />
                Orders start at {formatPrice(offers.minOrder)}, so add this {noun} to an order with another piece.
              </p>
            )}
          </div>

          {children}
        </div>
      </div>

      {/* The floating WhatsApp button asks about this piece, in the colour or fabric chosen. */}
      <WhatsAppTopic message={waMessage} context="sticky-product" productId={p.id} variantId={variant?.id} productName={p.title} />
      {variant && <StickyBuyBar price={price} onAdd={addToBasket} watch={addRef} />}
      <AddedSheet item={added} offers={offers} onClose={() => setAdded(null)} />
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
