'use client'

// The cookie question, answered in one tap: "Reject all" and "Accept all" look
// exactly the same (equal weight, as the UK rules expect), with "Choose" for
// anyone who wants to pick. It sits at the bottom and never blocks the page.

import { useId, useState } from 'react'
import Link from 'next/link'
import { Sheet } from '@/components/ui/Sheet'
import { buttonClasses } from '@/components/ui/Button'
import { saveConsent } from '@/lib/tracking/browser'
import type { Consent } from '@/lib/tracking/consent'

const ALL = { marketing: true, analytics: true, statistics: true }
const NONE = { marketing: false, analytics: false, statistics: true }

export function ConsentBanner({ onChoose }: { onChoose: () => void }) {
  const id = useId()
  return (
    <section
      aria-labelledby={`${id}-title`}
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-line bg-white px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-4 shadow-[var(--shadow-overlay)] print:hidden"
    >
      <div className="mx-auto flex max-w-[1200px] flex-col gap-3 lg:flex-row lg:items-center lg:gap-8">
        <div className="flex flex-col gap-1">
          <h2 id={`${id}-title`} className="font-sans text-base font-semibold">
            Cookies
          </h2>
          <p className="text-[15px] leading-snug text-slate">
            May we use cookies to see how the site is used and to measure our Facebook and Instagram ads? Your basket works either way.{' '}
            <Link href="/cookies" className="font-semibold">
              More about cookies
            </Link>
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => saveConsent(NONE)} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
              Reject all
            </button>
            <button type="button" onClick={() => saveConsent(ALL)} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
              Accept all
            </button>
          </div>
          <button type="button" onClick={onChoose} className="min-h-11 text-[15px] font-semibold text-velvet underline underline-offset-2">
            Choose what to allow
          </button>
        </div>
      </div>
    </section>
  )
}

function Choice({ label, body, checked, onChange, disabled }: { label: string; body: string; checked: boolean; onChange?: (v: boolean) => void; disabled?: boolean }) {
  const id = useId()
  return (
    <div className="flex items-start gap-3 rounded-[var(--radius-field)] border border-line p-3">
      <input id={id} type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange?.(e.target.checked)} aria-describedby={`${id}-body`} className="mt-1 size-5 shrink-0 accent-velvet" />
      <label htmlFor={id} className="flex flex-col gap-0.5">
        <span className="font-semibold">{label}</span>
        <span id={`${id}-body`} className="text-sm text-slate">
          {body}
        </span>
      </label>
    </div>
  )
}

/** Every choice, one at a time; reopened from "Cookie settings" in the footer. */
export function ConsentSettings({ open, onClose, current }: { open: boolean; onClose: () => void; current: Consent }) {
  // The sheet only renders its contents while open, so these start from the saved choice each time.
  const [marketing, setMarketing] = useState(current.marketing)
  const [analytics, setAnalytics] = useState(current.analytics)
  const [statistics, setStatistics] = useState(current.statistics)
  const save = (c: { marketing: boolean; analytics: boolean; statistics: boolean }) => {
    saveConsent(c)
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title="Cookie settings">
      <div className="flex flex-col gap-3">
        <Choice label="Needed for the shop" body="Your basket, saved sofas and checkout. Always on." checked disabled />
        <Choice
          label="Our own visit statistics"
          body="A note of how you found us (for example, which ad), kept by us only, with no advertising cookies."
          checked={statistics}
          onChange={setStatistics}
        />
        <Choice label="Google Analytics" body="Cookies that help us see which pages work, in Google Analytics." checked={analytics} onChange={setAnalytics} />
        <Choice
          label="Facebook and Instagram ads"
          body="The Meta Pixel, so we can measure our ads and show them to people likely to want them. Meta may use it for its own purposes too."
          checked={marketing}
          onChange={setMarketing}
        />
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button type="button" onClick={() => save({ marketing, analytics, statistics })} className={buttonClasses({ variant: 'secondary' })}>
            Save my choices
          </button>
          <button type="button" onClick={() => save(ALL)} className={buttonClasses({ variant: 'secondary' })}>
            Accept all
          </button>
        </div>
      </div>
    </Sheet>
  )
}
