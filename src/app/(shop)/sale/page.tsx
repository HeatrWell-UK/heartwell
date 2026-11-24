import type { Metadata } from 'next'
import { SeasonLanding } from '@/components/season/SeasonLanding'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Christmas and New Year sofa event: £50 off each sofa and chair',
  description:
    '£50 off each sofa and chair for 14 days from your first visit, until 31 January. No code needed, one offer per piece. Paid for in full on delivery. Free delivery to most of mainland Britain.',
  alternates: { canonical: '/sale' },
}

// Every piece the season covers (Run 3: all sofas and chairs, imported
// included; the Sims Footstool left out), at today's real price.
export default function SalePage() {
  return <SeasonLanding variant="sale" />
}
