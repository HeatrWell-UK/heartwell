'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Renders its children only once they're about to scroll into view. Used for
 * photos further down the page, so on a slow phone connection they don't
 * compete with the main photo (browsers start "lazy" images up to two screens
 * early on slow networks).
 */
export function WhenNear({ children, className, margin = '300px' }: { children: ReactNode; className?: string; margin?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [near, setNear] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || near) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setNear(true)
          observer.disconnect()
        }
      },
      { rootMargin: margin },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [near, margin])

  return (
    <span ref={ref} className={className}>
      {near ? children : null}
    </span>
  )
}
