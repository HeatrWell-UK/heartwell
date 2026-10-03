import { describe, expect, it } from 'vitest'
import cloudinaryLoader from '@/lib/cloudinary-loader'

const BASE = 'https://res.cloudinary.com/demo/image/upload/'

describe('cloudinaryLoader', () => {
  it('adds size, format and quality to a plain versioned URL', () => {
    expect(cloudinaryLoader({ src: `${BASE}v123/heartwell/sofa.jpg`, width: 640 })).toBe(
      `${BASE}f_auto,c_limit,w_640,q_auto/v123/heartwell/sofa.jpg`,
    )
  })

  it('handles a plain URL without a version', () => {
    expect(cloudinaryLoader({ src: `${BASE}heartwell/sofa.jpg`, width: 320, quality: 70 })).toBe(
      `${BASE}f_auto,c_limit,w_320,q_70/heartwell/sofa.jpg`,
    )
  })

  it('leaves an already transformed URL alone, so generative effects are not re-run', () => {
    const src = `${BASE}e_gen_background_replace:prompt_room/v123/heartwell/sofa.jpg`
    expect(cloudinaryLoader({ src, width: 640 })).toBe(src)
  })

  it('leaves local files alone', () => {
    expect(cloudinaryLoader({ src: '/brand/hw-logo.webp', width: 640 })).toBe('/brand/hw-logo.webp')
  })
})
