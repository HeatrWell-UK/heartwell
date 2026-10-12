import type { Metadata } from 'next'
import Link from 'next/link'
import { ContentPage, Note } from '@/components/content/ContentPage'
import { CARE } from '@/config/care'
import { POLICIES } from '@/config/promises'

export const metadata: Metadata = {
  title: 'Care guide',
  description: 'How to keep a fabric, velvet or leather-look sofa looking good: everyday care, spills, sunlight, recliners and what’s normal.',
  alternates: { canonical: '/care-guide' },
}

const CONTENTS = [
  { id: 'everyday', label: 'Every sofa' },
  { id: 'fabric', label: 'Fabric and velvet' },
  { id: 'velvet', label: 'What’s normal for velvet' },
  { id: 'leather', label: 'Leather and leather-look' },
  { id: 'spills', label: 'Spills and stains' },
  { id: 'recliners', label: 'Recliners' },
]

export default function CareGuidePage() {
  return (
    <ContentPage
      title="Care guide"
      intro={<p>A few minutes a week keeps a sofa comfortable and looking new for years. Here’s what works, and what to avoid.</p>}
      updated="2026-10-12"
      contents={CONTENTS}
    >
      <h2 id="everyday">Every sofa</h2>
      <ul>
        <li>Plump and turn loose seat and back cushions every week, and swap them round now and then, so they wear evenly.</li>
        <li>Sit in different places: favourite spots flatten first.</li>
        <li>Don’t sit or stand on the arms or the back, and don’t let children jump on the seats: it strains the frame and springs.</li>
        <li>Keep it at least 30 cm from radiators and fires, and out of strong direct sunlight, which fades and dries every kind of cover.</li>
        <li>When you move it, lift it rather than dragging it by the arms or feet.</li>
      </ul>

      <h2 id="fabric">Fabric and velvet</h2>
      <ul>
        {CARE.fabric.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>

      <h2 id="velvet">What’s normal for velvet</h2>
      <p>
        Velvet has a soft pile that catches the light. Where it’s sat on or brushed the other way, it looks lighter or darker: this is called shading, and
        it’s part of how velvet looks, not a fault. Crushed velvet is made to look this way on purpose.
      </p>
      <p>
        To freshen pressure marks, brush the pile gently in one direction with a soft brush. A handheld steamer held a few centimetres away, never touching
        the fabric, lifts it too.
      </p>

      <h2 id="leather">Leather and leather-look</h2>
      <ul>
        {CARE.other.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>

      <h2 id="spills">Spills and stains</h2>
      <ol>
        <li>Act straight away: blot with a clean, dry, white cloth. Don’t rub, which pushes it in and roughens the fabric.</li>
        <li>Work from the outside of the mark inwards, so it doesn’t spread.</li>
        <li>If it needs more, use a little cold water on the cloth, not on the sofa, and blot dry.</li>
        <li>Try any cleaning product on a hidden area first. For anything stubborn, a professional upholstery cleaner is the safest choice.</li>
      </ol>
      <Note title="Not covered by the guarantee">
        The {POLICIES.guaranteeYears}-year guarantee covers the frame and springs. Marks, stains, normal wear and fading from sunlight aren’t covered, so a
        little care goes a long way. <Link href="/delivery-and-returns#faults">Faults and the guarantee</Link>.
      </Note>

      <h2 id="recliners">Recliners</h2>
      <ul>
        <li>Open and close the footrest with the handle or button only, never by pushing it with your feet.</li>
        <li>Don’t sit or stand on the open footrest, and keep children and pets clear of the mechanism.</li>
        <li>Leave space behind a reclining seat so the back can tilt without hitting the wall.</li>
        <li>Vacuum crumbs from around the mechanism now and then so it moves freely.</li>
      </ul>
      <p>
        Something not right? <Link href="/contact">Tell us</Link> and we’ll help.
      </p>
    </ContentPage>
  )
}
