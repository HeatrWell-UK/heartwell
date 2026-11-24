import type { Metadata } from 'next'
import { SeasonLanding } from '@/components/season/SeasonLanding'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Christmas sofa event: £50 off each sofa and chair',
  description:
    'Heartwell’s Christmas sofa event: £50 off each sofa and chair for 14 days from your first visit. Code CHRISTMAS is applied for you. Paid for in full on delivery.',
  alternates: { canonical: '/christmas' },
}

export default function ChristmasPage() {
  return <SeasonLanding variant="christmas" />
}
