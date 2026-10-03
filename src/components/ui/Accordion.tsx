import type { ReactNode } from 'react'
import { CaretDownIcon } from '@phosphor-icons/react/ssr'

interface AccordionItem {
  title: string
  content: ReactNode
  open?: boolean
}

/**
 * Native <details> panels: keyboard and screen-reader friendly, searchable with
 * "Find in page", and indexed by search engines. A shared `name` makes them
 * exclusive (opening one closes the others) where the browser supports it.
 */
export function Accordion({ items, name }: { items: AccordionItem[]; name?: string }) {
  return (
    <div className="border-t border-line">
      {items.map((item) => (
        <details key={item.title} name={name} open={item.open} className="group border-b border-line">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 py-3.5 text-[17px] font-semibold text-ink [&::-webkit-details-marker]:hidden">
            {item.title}
            <CaretDownIcon aria-hidden="true" size={20} weight="bold" className="shrink-0 transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <div className="flex flex-col gap-2.5 pb-4 text-[15px] leading-relaxed text-body-dark">{item.content}</div>
        </details>
      ))}
    </div>
  )
}
