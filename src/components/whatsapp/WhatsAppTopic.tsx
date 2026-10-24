'use client'

// Lets a page tell the floating WhatsApp button what it's about: a product
// with the colour chosen, a range, a category, an order. Renders nothing. The
// latest topic for the current address wins; it goes when the page does.

import { useEffect, useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'
import type { WhatsAppTopic as Topic } from '@/lib/whatsapp/page-message'

type Entry = { id: number; path: string; topic: Topic }

let entries: Entry[] = []
let nextId = 1
const listeners = new Set<() => void>()
const changed = () => listeners.forEach((l) => l())

const store = {
  subscribe(onChange: () => void) {
    listeners.add(onChange)
    return () => listeners.delete(onChange)
  },
  getSnapshot: () => entries,
  getServerSnapshot: () => [] as Entry[],
}

/** The topic a page has set for this address, or null. */
export function usePageTopic(pathname: string): Topic | null {
  const all = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot)
  for (let i = all.length - 1; i >= 0; i--) if (all[i]!.path === pathname) return all[i]!.topic
  return null
}

export function WhatsAppTopic({ message, context, productId, variantId, productName, enquiry }: Topic) {
  const pathname = usePathname()
  useEffect(() => {
    const entry: Entry = { id: nextId++, path: pathname, topic: { message, context, productId, variantId, productName, enquiry } }
    entries = [...entries, entry]
    changed()
    return () => {
      entries = entries.filter((e) => e.id !== entry.id)
      changed()
    }
  }, [pathname, message, context, productId, variantId, productName, enquiry])
  return null
}
