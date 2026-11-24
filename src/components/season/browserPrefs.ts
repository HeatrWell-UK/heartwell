'use client'

// Small browser stores for the season's pieces: reduced motion and the
// per-tab / per-browser "seen" flags. Every storage access is guarded (private
// windows and blocked storage throw); without storage the page still works.

import { useSyncExternalStore } from 'react'

const REDUCE = '(prefers-reduced-motion: reduce)'

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(REDUCE)
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    () => window.matchMedia(REDUCE).matches,
    () => true,
  )
}

const CHANGED = 'heartwell:pref-change'

function read(kind: 'local' | 'session', key: string): string | null {
  try {
    return (kind === 'local' ? window.localStorage : window.sessionStorage).getItem(key)
  } catch {
    return null
  }
}

export function writePref(kind: 'local' | 'session', key: string, value: string) {
  try {
    ;(kind === 'local' ? window.localStorage : window.sessionStorage).setItem(key, value)
  } catch {
    // Storage blocked: the choice lasts until the page reloads.
  }
  window.dispatchEvent(new Event(CHANGED))
}

/** A stored value, or null; '' on the server so nothing seasonal flashes before the browser knows. */
export function usePref(kind: 'local' | 'session', key: string): string | null {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener(CHANGED, cb)
      window.addEventListener('storage', cb)
      return () => {
        window.removeEventListener(CHANGED, cb)
        window.removeEventListener('storage', cb)
      }
    },
    () => read(kind, key),
    () => '',
  )
}
