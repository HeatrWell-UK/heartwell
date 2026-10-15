'use client'

import { useEffect } from 'react'

/**
 * In a row that scrolls sideways, brings the link for the page you're on
 * (aria-current) into the middle once, so it's never hidden off the edge.
 * Moves the row only, never the page.
 */
export function CentreCurrent({ containerId }: { containerId: string }) {
  useEffect(() => {
    const rows = document.getElementById(containerId)?.querySelectorAll<HTMLElement>('ul') ?? []
    for (const row of rows) {
      const item = row.querySelector<HTMLElement>('[aria-current="page"]')?.closest('li')
      if (!item || row.scrollWidth <= row.clientWidth) continue
      row.scrollLeft = item.offsetLeft - (row.clientWidth - item.offsetWidth) / 2
    }
  }, [containerId])
  return null
}
