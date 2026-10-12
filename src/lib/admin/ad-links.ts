// Ready-made links for Meta ads and the shop's own profiles (Admin → Ad links).
// Pure, so the tags are tested and always match what the shop reads
// (src/lib/offers/paid.ts and the attribution capture).
//
// Every ad link carries utm_source=facebook and utm_medium=paid_social, which
// is what marks a visit as "from an ad" (and gives the ad-visitor offer), plus
// utm_campaign set to the range or product. The URL parameters below, pasted
// into each ad, add the campaign, ad set and ad names; when a tag appears
// twice the shop reads the last one, so the ad's names win.

import { META_AD_TAGS } from '@/lib/offers/paid'

/** For Ads Manager → the ad → Destination → URL parameters. Meta fills in the names. */
export const META_URL_PARAMETERS = `utm_source=${META_AD_TAGS.utm_source}&utm_medium=${META_AD_TAGS.utm_medium}&utm_campaign={{campaign.name}}&utm_term={{adset.name}}&utm_content={{ad.name}}`

/** A link for an ad: the page, its own query (e.g. ?variant=SKU), and the ad tags. */
export function adLink(siteUrl: string, path: string, campaign: string): string {
  const url = new URL(path, `${siteUrl}/`)
  url.searchParams.set('utm_source', META_AD_TAGS.utm_source)
  url.searchParams.set('utm_medium', META_AD_TAGS.utm_medium)
  url.searchParams.set('utm_campaign', campaign)
  return url.toString()
}

/** The same, ending in qa=1: opens like an ad (the offer appears) but never counts. For trying it out. */
export const testAdLink = (siteUrl: string, path: string) => {
  const url = new URL(adLink(siteUrl, path, 'test'))
  url.searchParams.set('qa', '1')
  return url.toString()
}

/** Links for the shop's own profiles. Not ads, so no offer; the admin still sees where visitors came from. */
export const PROFILE_LINKS = [
  { label: 'Instagram bio', source: 'instagram', campaign: 'bio' },
  { label: 'Facebook Page', source: 'facebook', campaign: 'page' },
  { label: 'WhatsApp messages and status', source: 'whatsapp', campaign: 'message' },
] as const

export function profileLink(siteUrl: string, source: string, campaign: string): string {
  const url = new URL(`${siteUrl}/`)
  url.searchParams.set('utm_source', source)
  url.searchParams.set('utm_medium', 'social')
  url.searchParams.set('utm_campaign', campaign)
  return url.toString()
}

/** What each custom label in the catalogue feed holds, for building product sets in Commerce Manager. */
export const FEED_LABELS = [
  { label: 'custom_label_0', holds: 'Range name', example: 'Roma Recliner' },
  { label: 'custom_label_1', holds: 'Made to order or ready made', example: 'made to order' },
  { label: 'custom_label_2', holds: 'Price band (£)', example: 'under 500, 500-749, 750-999, 1000 plus' },
  { label: 'custom_label_3', holds: 'Offer tier', example: 'offer high, offer mid, offer standard, no offer' },
  { label: 'custom_label_4', holds: 'Product type', example: 'sofa, armchair, footstool' },
] as const
