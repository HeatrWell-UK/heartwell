// What the product page's photos show, in order (audit A2): the colourway's
// photo, the fabric the customer chose, the product's other photos, the
// range's close-ups and the top view drawn to scale. Pure, so it's tested.

import { pickCloseUps, type CloseUpSource } from './close-ups'
import type { Layout } from './measurements'

export type GallerySlide =
  | {
      kind: 'photo'
      src: string
      alt: string
      /** On the plate under the photo. */
      caption: string | null
    }
  | {
      kind: 'plan'
      layout: Layout
      /** "88 cm high": the one measurement a top view can't show. */
      note: string | null
      caption: string
    }

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)
const named = (colour: string | null, material: string | null) => [colour, material].filter(Boolean).join(' ')

export function gallerySlides({
  title,
  rangeName,
  variant,
  gallery,
  fabric,
  closeUps,
  topView,
}: {
  title: string
  rangeName: string
  variant: { colourName: string | null; materialLabel: string | null; image: string | null } | null
  gallery: string[]
  /** The fabric the customer chose (made-to-order pieces), with its own photo. */
  fabric: { name: string; collection: string; image: string | null } | null
  closeUps: CloseUpSource[]
  topView: { layout: Layout; height: number | null } | null
}): GallerySlide[] {
  const colour = variant?.colourName ?? null
  const shown = variant ? named(variant.colourName, variant.materialLabel) : ''
  const caption = colour ? shown : null
  const alt = colour ? `${title} in ${colour.toLowerCase()}` : title

  const photos = [...(variant?.image ? [variant.image] : []), ...gallery]
    .filter((src, i, all) => all.indexOf(src) === i)
    .map((src): GallerySlide => ({ kind: 'photo', src, alt, caption }))

  const swatch: GallerySlide[] = fabric?.image
    ? [{ kind: 'photo', src: fabric.image, alt: `${fabric.name} ${fabric.collection} fabric, close up`, caption: `Your fabric: ${fabric.name}` }]
    : []

  const details = pickCloseUps(closeUps, variant ? { colour: variant.colourName, material: variant.materialLabel } : null, Boolean(fabric)).map(
    (c): GallerySlide => {
      // Cut from another colourway's photo: say so on the photo ("in black", or "in grey leather aire" beside grey fabric).
      const other = named(c.colour, c.material)
      const sameColour = (c.colour ?? '').toLowerCase() === (colour ?? '').toLowerCase()
      const elsewhere = other && other.toLowerCase() !== shown.toLowerCase() ? `, in ${(sameColour ? other : (c.colour ?? other)).toLowerCase()}` : ''
      return { kind: 'photo', src: c.src, alt: `Close-up of the ${rangeName}: ${lowerFirst(c.label)}${elsewhere}`, caption: `${c.label}${elsewhere}` }
    },
  )

  const plan: GallerySlide[] = topView
    ? [{ kind: 'plan', layout: topView.layout, note: topView.height ? `${topView.height} cm high` : null, caption: 'Top view, to scale' }]
    : []

  return [...photos.slice(0, 1), ...swatch, ...photos.slice(1), ...details, ...plan]
}
