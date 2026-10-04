'use client'

import { useSyncExternalStore } from 'react'

const noop = () => () => {}

/**
 * False on the server and during hydration, true afterwards. Pages that show
 * what's stored on the device wait for it, so they never flash "empty".
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  )
}
