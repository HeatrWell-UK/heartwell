// Brand strings and colours that something other than CSS needs (browser
// chrome, the web manifest, email). Keep in step with src/app/globals.css.

export const BRAND = {
  name: 'Heartwell',
  /** Used under the name in the stacked logo and in titles. */
  tagline: 'Sofas made to order, delivered free, paid for on delivery',
  shortDescription:
    'Sofas made to order, delivered free across UK Mainland, and paid for on the doorstep once they are in your room.',
} as const

export const BRAND_COLOURS = {
  velvet: '#8E1B2E',
  wine: '#4A0D17',
  gold: '#B58A2F',
  white: '#FFFFFF',
} as const
