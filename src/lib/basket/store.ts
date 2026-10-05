'use client'

// The basket and saved items, kept in localStorage and shared by every
// component that shows them (header count, product page, basket page). Other
// tabs stay in step through the storage event. Storage can be unavailable
// (private browsing, a full disk): everything still works for the visit, it
// just isn't remembered.

import { useSyncExternalStore } from 'react'
import {
  addLine,
  basketCount,
  basketSubtotal,
  parseBasket,
  parseSaved,
  refreshLines,
  removeLine,
  setQuantity,
  toggleSaved,
  type BasketLine,
  type BasketLineView,
  type NewLine,
  type SavedItem,
} from './model'

function createLocalStore<T>(key: string, parse: (raw: unknown) => T, empty: T) {
  let cache: T | undefined
  const listeners = new Set<() => void>()

  const read = (): T => {
    try {
      const raw = window.localStorage.getItem(key)
      return raw ? parse(JSON.parse(raw)) : empty
    } catch {
      return empty
    }
  }

  const notify = () => listeners.forEach((l) => l())

  const onStorage = (e: StorageEvent) => {
    if (e.key === key || e.key === null) {
      cache = undefined
      notify()
    }
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener)
      if (listeners.size === 1) window.addEventListener('storage', onStorage)
      return () => {
        listeners.delete(listener)
        if (listeners.size === 0) window.removeEventListener('storage', onStorage)
      }
    },
    get(): T {
      if (cache === undefined) cache = read()
      return cache
    },
    getServer: (): T => empty,
    set(next: T) {
      cache = next
      try {
        window.localStorage.setItem(key, JSON.stringify(next))
      } catch {
        // Not saved for next time, but the page carries on.
      }
      notify()
    },
  }
}

const EMPTY_LINES: BasketLine[] = []
const EMPTY_SAVED: SavedItem[] = []

export const basketStore = createLocalStore('hw-basket-v1', parseBasket, EMPTY_LINES)
export const savedStore = createLocalStore('hw-saved-v1', parseSaved, EMPTY_SAVED)

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  // Older in-app browsers: a random v4-shaped ID.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export function useBasket() {
  const lines = useSyncExternalStore(basketStore.subscribe, basketStore.get, basketStore.getServer)
  return {
    lines,
    count: basketCount(lines),
    subtotal: basketSubtotal(lines),
    add: (line: NewLine) => basketStore.set(addLine(basketStore.get(), line, newId(), Date.now())),
    setQuantity: (id: string, quantity: number) => basketStore.set(setQuantity(basketStore.get(), id, quantity)),
    remove: (id: string) => basketStore.set(removeLine(basketStore.get(), id)),
    refresh: (fresh: Record<string, BasketLineView | null>) => basketStore.set(refreshLines(basketStore.get(), fresh)),
    clear: () => basketStore.set([]),
  }
}

export function useSaved() {
  const items = useSyncExternalStore(savedStore.subscribe, savedStore.get, savedStore.getServer)
  return {
    items,
    isSaved: (slug: string) => items.some((i) => i.slug === slug),
    toggle: (slug: string, sku: string | null) => savedStore.set(toggleSaved(savedStore.get(), slug, sku, Date.now())),
  }
}

/** The last postcode the customer checked, for the product pages and checkout. */
export const POSTCODE_KEY = 'hw-postcode'

export function rememberPostcode(postcode: string) {
  try {
    window.localStorage.setItem(POSTCODE_KEY, postcode)
  } catch {
    // Not remembered; nothing else depends on it.
  }
}

export function recallPostcode(): string {
  try {
    return window.localStorage.getItem(POSTCODE_KEY) ?? ''
  } catch {
    return ''
  }
}

/**
 * IDs for this browser and this visit, so a basket reminder can be matched
 * to the order if the shopper goes on to buy. Phase 14 builds the full
 * attribution ledger on the same IDs. Null when storage isn't available.
 */
export function visitIds(): { visitorId: string; sessionId: string; arrivalId: string } | null {
  try {
    const get = (store: Storage, key: string) => {
      let v = store.getItem(key)
      if (!v || !/^[0-9a-f-]{36}$/i.test(v)) {
        v = newId()
        store.setItem(key, v)
      }
      return v
    }
    return { visitorId: get(window.localStorage, 'hw-visitor'), sessionId: get(window.sessionStorage, 'hw-session'), arrivalId: get(window.sessionStorage, 'hw-arrival') }
  } catch {
    return null
  }
}
