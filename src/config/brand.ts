// Brand strings and colours that something other than CSS needs (browser
// chrome, the web manifest, email). Keep in step with src/app/globals.css.

export const BRAND = {
  name: 'Heartwell',
  /** Used under the name in the stacked logo and in titles. */
  tagline: 'Sofas made to order, delivered free to most of Britain, paid for on delivery',
  shortDescription:
    'Sofas made to order, delivered free to most of mainland Britain, and paid for on the doorstep once they are in your room.',
  /** Other names people know the shop by (the social profiles, the domain), for search engines. */
  alternateNames: ['Heartwell Sofa', 'heartwellsofa.co.uk'],
} as const

/**
 * What every page's share card carries. A page that sets its own openGraph
 * replaces the layout's whole entry, so it spreads this in. No url here: a
 * page without its own og:url is shared as the address it was opened at,
 * where a shared one would turn every share into the home page on Facebook.
 */
export const OPEN_GRAPH_BASE = { type: 'website', locale: 'en_GB', siteName: BRAND.name } as const

export const BRAND_COLOURS = {
  velvet: '#8E1B2E',
  wine: '#4A0D17',
  gold: '#B58A2F',
  white: '#FFFFFF',
} as const
