import { describe, expect, it } from 'vitest'
import { CLOSE_UPS } from '@/content/close-ups'
import { closeUpSources, cropUrl, pickCloseUps, type CloseUpPhoto } from '@/lib/product/close-ups'
import { gallerySlides } from '@/lib/product/gallery'

const CLOUD = 'https://res.cloudinary.com/demo/image/upload'
const photo = (name: string) => `${CLOUD}/v1/${name}.png`

// The source pieces' colourways, in their order on the site.
const PIECES: Record<string, CloseUpPhoto[]> = {
  'sims-high-back-3-2-seater': [
    { colour: 'Grey', material: 'Plush Velvet', src: photo('sims-grey') },
    { colour: 'Black', material: 'Plush Velvet', src: photo('sims-black') },
  ],
  'sims-scattered-back-3-2-seater': [{ colour: 'Grey', material: 'Plush Velvet', src: photo('sims-scatter-grey') }],
  'hannah-electric-3-2-seater': [
    { colour: 'Grey', material: 'Fabric', src: photo('hannah-grey') },
    { colour: 'Beige', material: 'Fabric', src: photo('hannah-beige') },
  ],
  'roma-recliner-manual-armchair': [
    { colour: 'Grey', material: 'Leather Aire', src: photo('roma-grey-la') },
    { colour: 'Black', material: 'Leather Aire', src: photo('roma-black-la') },
    { colour: 'Grey', material: 'Fabric', src: photo('roma-grey-fabric') },
  ],
}
const photosOf = (slug: string) => PIECES[slug] ?? []

describe('the close-ups list', () => {
  it('cuts every close-up from a piece of its own range, inside the 1,254 px photo, with a label', () => {
    for (const [range, list] of Object.entries(CLOSE_UPS)) {
      for (const c of list) {
        expect(c.photo.startsWith(range), `${range}: ${c.photo}`).toBe(true)
        expect(c.label.length).toBeGreaterThan(3)
        expect(c.x + c.s).toBeLessThanOrEqual(1254)
        expect(c.y + c.s).toBeLessThanOrEqual(1254)
        expect(c.s).toBeGreaterThanOrEqual(200)
      }
    }
  })
})

describe('close-ups on the product page', () => {
  it('leaves out a detail of the other back style', () => {
    const high = closeUpSources('sims', 'sims-high-back-u-shape', photosOf).map((c) => c.label)
    const scattered = closeUpSources('sims', 'sims-scattered-back-5-seater-corner', photosOf).map((c) => c.label)
    expect(high).toEqual(['Channel-stitched arms', 'Plush velvet'])
    expect(scattered).toContain('Loose scatter cushions')
    expect(closeUpSources(null, 'oxford-electric-corner', photosOf)).toEqual([])
  })

  it('cuts the square from the colour on show when it was checked there, else from the first colour', () => {
    const sims = closeUpSources('sims', 'sims-high-back-u-shape', photosOf)
    const black = pickCloseUps(sims, { colour: 'Black', material: 'Plush Velvet' }, false)
    expect(black[0]).toMatchObject({ label: 'Channel-stitched arms', colour: 'Black', src: `${CLOUD}/c_crop,x_30,y_570,w_300,h_300/v1/sims-black.png` })

    // Hannah's beige photo sits differently, so beige sees the grey close-ups.
    const hannah = closeUpSources('hannah-electric', 'hannah-electric-corner', photosOf)
    expect(hannah.every((c) => c.photos.length === 1 && c.photos[0]!.colour === 'Grey')).toBe(true)
    expect(pickCloseUps(hannah, { colour: 'Beige', material: 'Fabric' }, false).map((c) => c.colour)).toEqual(['Grey', 'Grey', 'Grey'])
  })

  it('shows a close-up that names a cover only on that cover, and never once another fabric is chosen', () => {
    const roma = closeUpSources('roma-recliner', 'roma-recliner-manual-3-seater', photosOf)
    expect(pickCloseUps(roma, { colour: 'Grey', material: 'Fabric' }, false).map((c) => c.label)).toEqual(['Pull the lever to recline', 'Padded arms'])
    expect(pickCloseUps(roma, { colour: 'Black', material: 'Leather Aire' }, false).map((c) => c.label)).toEqual([
      'Pull the lever to recline',
      'Padded arms',
      'Leather Aire, soft and leather-look',
    ])
    // The corner isn't a manual recliner: no lever.
    expect(closeUpSources('roma-recliner', 'roma-recliner-corner', photosOf).map((c) => c.label)).not.toContain('Pull the lever to recline')
    const sims = closeUpSources('sims', 'sims-high-back-u-shape', photosOf)
    expect(pickCloseUps(sims, { colour: 'Grey', material: 'Plush Velvet' }, true).map((c) => c.label)).toEqual(['Channel-stitched arms'])
  })

  it('only cuts plain Cloudinary photos', () => {
    expect(cropUrl('/brand/sofa.png', { x: 1, y: 2, s: 300 })).toBeNull()
    expect(cropUrl(`${CLOUD}/e_trim/v1/a.png`, { x: 1, y: 2, s: 300 })).toBeNull()
  })
})

describe('the product page’s photos', () => {
  const base = {
    title: 'Sims High Back U-Shape',
    rangeName: 'Sims',
    variant: { colourName: 'Grey', materialLabel: 'Plush Velvet', image: photo('u-grey') },
    gallery: [photo('u-grey'), photo('u-room')],
    fabric: null,
    closeUps: closeUpSources('sims', 'sims-high-back-u-shape', photosOf),
    topView: { layout: { kind: 'u' as const, back: 300, left: 200, right: 200, d: 95 }, height: 88 },
  }

  it('goes photo, other photos, close-ups, then the top view, each with its own label', () => {
    const slides = gallerySlides(base)
    expect(slides.map((s) => s.caption)).toEqual(['Grey Plush Velvet', 'Grey Plush Velvet', 'Channel-stitched arms', 'Plush velvet', 'Top view, to scale'])
    expect(slides[2]).toMatchObject({ kind: 'photo', alt: 'Close-up of the Sims: channel-stitched arms' })
    expect(slides.at(-1)).toMatchObject({ kind: 'plan', note: '88 cm high' })
  })

  it('puts the chosen fabric’s own photo second, and names another colour on a close-up', () => {
    const slides = gallerySlides({
      ...base,
      variant: { colourName: 'Navy Blue', materialLabel: 'Plush Velvet', image: photo('u-navy') },
      fabric: { name: 'Mink', collection: 'Plush Soft Velvet', image: photo('pl-mink') },
    })
    expect(slides[1]).toMatchObject({ kind: 'photo', src: photo('pl-mink'), caption: 'Your fabric: Mink', alt: 'Mink Plush Soft Velvet fabric, close up' })
    // No navy photo of the 3+2 here: the grey close-up says so. The velvet close-up goes (another fabric is chosen).
    const details = slides.filter((s) => s.caption?.startsWith('Channel') || s.caption?.startsWith('Plush'))
    expect(details.map((s) => s.caption)).toEqual(['Channel-stitched arms, in grey'])
  })

  it('says the cover when only the cover differs', () => {
    const roma = gallerySlides({
      ...base,
      title: 'Roma Recliner Cream 3 Seater',
      rangeName: 'Roma',
      variant: { colourName: 'Cream', materialLabel: 'Leather Aire', image: photo('roma-cream') },
      gallery: [],
      closeUps: closeUpSources('roma-recliner', 'roma-recliner-manual-3-seater', photosOf),
      topView: null,
    })
    expect(roma.map((s) => s.caption)).toEqual(['Cream Leather Aire', 'Pull the lever to recline, in grey', 'Padded arms, in grey', 'Leather Aire, soft and leather-look, in grey'])
    const fabric = gallerySlides({ ...base, rangeName: 'Roma', variant: { colourName: 'Grey', materialLabel: 'Fabric', image: photo('x') }, closeUps: closeUpSources('roma-recliner', 'roma-recliner-manual-3-seater', photosOf), gallery: [], topView: null })
    expect(fabric.map((s) => s.caption)).toEqual(['Grey Fabric', 'Pull the lever to recline', 'Padded arms'])
  })
})
