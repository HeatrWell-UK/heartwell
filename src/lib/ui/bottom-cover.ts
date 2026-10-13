'use client'

import { useEffect, type RefObject } from 'react'

// Things fixed to the bottom of the screen (the cookie question, the product
// page's buy bar) report their height here. globals.css turns the tallest into
// room at the end of the page and scroll padding, so they never hide the
// footer or a focused field (WCAG 2.4.11).

const covers = new Map<string, number>()

function apply() {
  const tallest = Math.max(0, ...covers.values())
  const root = document.documentElement
  if (tallest > 0) root.style.setProperty('--hw-cover-bottom', `${tallest}px`)
  else root.style.removeProperty('--hw-cover-bottom')
}

/** While `active`, keeps the page clear of `ref`'s height (zero when it's hidden by CSS, e.g. on large screens). */
export function useBottomCover(key: string, ref: RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    const el = ref.current
    if (!el || !active) return
    const measure = () => {
      covers.set(key, el.offsetHeight)
      apply()
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => {
      observer.disconnect()
      covers.delete(key)
      apply()
    }
  }, [key, ref, active])
}
