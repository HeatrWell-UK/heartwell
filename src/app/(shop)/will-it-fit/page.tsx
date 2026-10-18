import type { Metadata } from 'next'
import Link from 'next/link'
import { ContentPage, Note } from '@/components/content/ContentPage'
import { FitChecker } from '@/components/content/FitChecker'
import { WhatsAppButton } from '@/components/ui/WhatsAppButton'
import { WhatsAppGlyph } from '@/components/ui/WhatsAppGlyph'
import { buttonClasses } from '@/components/ui/Button'

export const metadata: Metadata = {
  title: 'Will a sofa fit through my door? How to measure',
  description: 'How to measure your doors, hallway, stairs and room before ordering a sofa, with a quick door check and what to do if it’s tight.',
  alternates: { canonical: '/will-it-fit' },
}

const CONTENTS = [
  { id: 'rule', label: 'The one measurement that matters' },
  { id: 'way-in', label: 'Measuring the way in' },
  { id: 'check', label: 'Check a sofa against your door' },
  { id: 'sections', label: 'Corner and U-shaped sofas' },
  { id: 'room', label: 'Measuring the room' },
]

export default function WillItFitPage() {
  return (
    <ContentPage
      title="Will it fit?"
      intro={<p>Five minutes with a tape measure before you order saves a difficult delivery day. Here’s what to measure, and how.</p>}
      contents={CONTENTS}
    >
      <h2 id="rule">The one measurement that matters</h2>
      <p>
        A sofa goes through a doorway on its side or on its end, not the way it stands in your room. So what has to fit through is its <strong>depth</strong>{' '}
        (front to back) or its <strong>height</strong>, whichever is smaller, not its width. Every product page shows both under Measurements.
      </p>
      <p>Leave a few centimetres to spare for hands, door handles and the frame.</p>

      <h2 id="way-in">Measuring the way in</h2>
      <ol>
        <li>
          <strong>Front door.</strong> Open it fully and measure the narrowest gap: usually between the door stop on one side and the open door on the other,
          not the frame.
        </li>
        <li>
          <strong>Hallway.</strong> Measure its width at the narrowest point, including radiators, coat hooks and banisters.
        </li>
        <li>
          <strong>Turns.</strong> Where the hallway turns into a room, a long sofa has to swing round. Measure the doorway you turn into as well as the
          hallway, and the ceiling height if it has to be stood on end.
        </li>
        <li>
          <strong>Stairs.</strong> Measure the stair width, the height at the lowest point of the ceiling above them, and any landing turn.
        </li>
        <li>
          <strong>Room door.</strong> Measure it like the front door.
        </li>
      </ol>
      <p>The smallest of these is the number to check.</p>

      <div id="check" className="scroll-mt-6">
        <FitChecker />
      </div>

      <h2 id="sections">Corner and U-shaped sofas</h2>
      <p>
        Corner and U-shaped sofas, and sets, arrive in sections, so it’s each section that has to go through the door, not the whole sofa. Each section is
        no deeper than the sofa itself, so checking the sofa’s depth against your narrowest door is a safe guide.
      </p>

      <h2 id="room">Measuring the room</h2>
      <ul>
        <li>Mark the sofa’s width and depth on the floor with masking tape and live with it for a day. It’s the easiest way to see the size.</li>
        <li>Leave room to walk past: around 60 cm is comfortable for a walkway, more in front of a door.</li>
        <li>Leave around 40 to 50 cm between the sofa and a coffee table.</li>
        <li>Recliners need space behind or in front to recline: check the product page and leave room for the footrest.</li>
        <li>For a corner sofa, check which side the long part needs to be, and measure both walls.</li>
      </ul>
      <Note title="Still not sure?">
        Send us your measurements, and a photo of the way in if you can, and we’ll tell you honestly whether it will go.
      </Note>
      <WhatsAppButton
        message="Hi Heartwell, can you help me check a sofa will fit? My narrowest door or hallway is ___ cm."
        context="will-it-fit"
        className={buttonClasses({ variant: 'secondary', block: true, className: 'sm:w-auto' })}
      >
        <WhatsAppGlyph />
        Ask us on WhatsApp
      </WhatsAppButton>
      <p>
        Ready to choose? <Link href="/sofas">Browse sofas</Link>.
      </p>
    </ContentPage>
  )
}
