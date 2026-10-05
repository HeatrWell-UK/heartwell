import type { Metadata } from 'next'
import { TrackForm } from './TrackForm'

export const metadata: Metadata = {
  title: 'Track my order',
  description: 'See where your Heartwell order is, with your order reference and delivery postcode.',
  alternates: { canonical: '/track-order' },
}

export default function TrackOrderPage() {
  return (
    <div className="mx-auto flex max-w-[40rem] flex-col gap-5 px-4 pb-16 pt-6 lg:pt-10">
      <h1 className="text-[32px] leading-tight lg:text-[40px]">Track my order</h1>
      <p className="text-[17px] text-slate">Enter the reference from your order email and the postcode we’re delivering to.</p>
      <TrackForm />
    </div>
  )
}
