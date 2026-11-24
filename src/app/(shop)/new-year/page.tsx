import type { Metadata } from 'next'
import { SeasonLanding } from '@/components/season/SeasonLanding'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'New Year sofa event: £50 off each sofa and chair',
  description:
    'Heartwell’s New Year sofa event: £50 off each sofa and chair for 14 days from your first visit, until 31 January. Code NEWYEAR is applied for you. Paid for in full on delivery.',
  alternates: { canonical: '/new-year' },
}

export default function NewYearPage() {
  return <SeasonLanding variant="new-year" />
}
