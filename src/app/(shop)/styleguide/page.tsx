import type { Metadata } from 'next'
import { Accordion } from '@/components/ui/Accordion'
import { Badge } from '@/components/ui/Badge'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Field, Select, TextArea, TextInput } from '@/components/ui/Field'
import { Price } from '@/components/ui/Price'
import { LogoLockup, LogoStacked } from '@/components/brand/Logo'
import { formatLongDate, formatShortDate } from '@/lib/format'

// A living reference for the design tokens and UI kit, so later phases build
// from the same parts. Never indexed and not linked from the site.
export const metadata: Metadata = { title: 'Style guide', robots: { index: false, follow: false } }

const colours = [
  { name: 'velvet', hex: '#8E1B2E', className: 'bg-velvet', dark: true },
  { name: 'velvet sheen', hex: 'gradient', className: 'bg-velvet-sheen', dark: true },
  { name: 'wine', hex: '#4A0D17', className: 'bg-wine', dark: true },
  { name: 'gold sheen', hex: 'gradient', className: 'bg-gold-sheen', dark: false },
  { name: 'gold', hex: '#B58A2F', className: 'bg-gold', dark: false },
  { name: 'gold pale', hex: '#E9CC7B', className: 'bg-gold-pale', dark: false },
  { name: 'gold tint', hex: '#F4E7C6', className: 'bg-gold-tint', dark: false },
  { name: 'stone', hex: '#F5F1EF', className: 'bg-stone', dark: false },
  { name: 'ink', hex: '#22171A', className: 'bg-ink', dark: true },
  { name: 'slate', hex: '#5E4F52', className: 'bg-slate', dark: true },
  { name: 'line', hex: '#E5DADB', className: 'bg-line', dark: false },
  { name: 'error', hex: '#B42318', className: 'bg-error', dark: true },
]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-line pt-6">
      <h2 className="text-2xl">{title}</h2>
      {children}
    </section>
  )
}

export default function StyleGuidePage() {
  const sample = new Date('2026-10-06T12:00:00Z')
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-4 py-8 lg:px-6">
      <h1 className="text-[36px] leading-tight">Style guide</h1>

      <Section title="Logo">
        <div className="flex flex-wrap items-center gap-8">
          <LogoLockup />
          <LogoStacked width={160} />
          <div className="rounded-2xl bg-wine p-6">
            <LogoStacked reversed width={160} />
          </div>
        </div>
      </Section>

      <Section title="Colours">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {colours.map((c) => (
            <li key={c.name} className="overflow-hidden rounded-2xl border border-line">
              <div className={`${c.className} flex h-20 items-end p-2 text-xs font-semibold ${c.dark ? 'text-white' : 'text-wine'}`}>{c.hex}</div>
              <div className="px-2 py-1.5 text-sm">{c.name}</div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Type">
        <p className="text-[36px] leading-tight font-display">Besley for headings</p>
        <p className="text-[28px] leading-tight font-display">Malibu corner sofa</p>
        <p className="text-[17px]">Figtree for reading: 17px body on phones, never smaller than 15px for anything a customer must read.</p>
        <p className="text-[15px] text-slate">Secondary text in slate. {formatLongDate(sample)}, {formatShortDate(sample)}.</p>
        <p className="text-gold-sheen font-display text-[28px] font-bold">Gold text, large sizes only</p>
      </Section>

      <Section title="Prices">
        <div className="flex flex-wrap items-baseline gap-6">
          <Price amount={749} className="text-[28px]" />
          <Price amount={1249} className="text-xl" />
          <Price amount={12.5} />
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="gold">Gold</Button>
          <Button disabled>Disabled</Button>
          <ButtonLink href="/" size="sm" variant="secondary">
            Small link
          </ButtonLink>
        </div>
        <div className="flex flex-col gap-3 rounded-2xl bg-wine p-5 sm:flex-row">
          <Button variant="onWine">On wine</Button>
          <Button variant="onWineOutline">On wine outline</Button>
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap gap-2">
          <Badge>Made to order</Badge>
          <Badge tone="white">White</Badge>
          <Badge tone="outline">Outline</Badge>
          <Badge tone="offer">Save £100</Badge>
        </div>
      </Section>

      <Section title="Form fields">
        <div className="grid max-w-xl gap-5">
          <Field label="Full name">{({ id, describedBy }) => <TextInput id={id} aria-describedby={describedBy} autoComplete="name" />}</Field>
          <Field label="Postcode" help="We check it’s on UK Mainland" error="Enter a full UK postcode, like M1 1AE">
            {({ id, describedBy, invalid }) => (
              <TextInput id={id} aria-describedby={describedBy} aria-invalid={invalid} defaultValue="M1" autoComplete="postal-code" />
            )}
          </Field>
          <Field label="Seat firmness">
            {({ id, describedBy }) => (
              <Select id={id} aria-describedby={describedBy} defaultValue="medium">
                <option value="soft">Soft</option>
                <option value="medium">Medium</option>
                <option value="firm">Firm</option>
              </Select>
            )}
          </Field>
          <Field label="Delivery notes" help="Optional">
            {({ id, describedBy }) => <TextArea id={id} aria-describedby={describedBy} />}
          </Field>
        </div>
      </Section>

      <Section title="Accordion">
        <div className="max-w-xl">
          <Accordion
            name="styleguide"
            items={[
              { title: 'Delivery', content: <p>Free to UK Mainland addresses.</p>, open: true },
              { title: 'Paying', content: <p>Cash or bank transfer when it arrives.</p> },
              { title: 'Guarantee', content: <p>1 year on the frame and springs.</p> },
            ]}
          />
        </div>
      </Section>
    </div>
  )
}
