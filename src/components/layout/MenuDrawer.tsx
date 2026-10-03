'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { ListIcon, XIcon } from '@phosphor-icons/react'
import { ABOUT_LINKS, HELP_LINKS, SHOP_LINKS } from '@/config/navigation'
import { LogoLockup } from '@/components/brand/Logo'

/**
 * The main menu: a panel that slides in from the left over the page.
 *
 * The slide is a horizontal scroll-snap container (sheet + full-width spacer),
 * so a finger can drag it closed natively, with momentum, and it always
 * settles fully open or fully closed. An IntersectionObserver on the sheet is
 * the single source of truth for "open" and "closed", whatever closed it:
 * a swipe, a tap on the dim area, the close button, Escape or a link.
 *
 * It is a fixed overlay rather than a popover, so it works in every in-app
 * browser, including older iPhones. While open, the page behind is `inert`.
 */
export function MenuDrawer() {
  const [mounted, setMounted] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLElement>(null)
  const closeRequested = useRef(false)

  const close = useCallback(() => {
    closeRequested.current = true
    const scroller = scrollerRef.current
    if (!scroller) return
    const closedAt = scroller.scrollWidth - scroller.clientWidth
    // Already at the closed position (closed before it finished opening): no
    // scroll will happen for the observer to see, so unmount directly.
    if (scroller.scrollLeft >= closedAt - 1) setMounted(false)
    else scroller.scrollTo({ left: closedAt, behavior: 'smooth' })
  }, [])

  // Once mounted: start off-screen, then slide in.
  useEffect(() => {
    if (!mounted) return
    const scroller = scrollerRef.current
    const sheet = sheetRef.current
    const overlay = overlayRef.current
    if (!scroller || !sheet || !overlay) return

    scroller.scrollTo({ left: scroller.scrollWidth, behavior: 'instant' as ScrollBehavior })
    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => scroller.scrollTo({ left: 0, behavior: 'smooth' })),
    )

    const setDim = () => {
      const ratio = Math.max(0, Math.min(1, 1 - scroller.scrollLeft / sheet.offsetWidth))
      overlay.style.setProperty('--dim', String(ratio))
    }
    scroller.addEventListener('scroll', setDim, { passive: true })
    setDim()

    const page = document.getElementById('page')
    const threshold = 1 / window.innerWidth
    // The sheet starts off-screen, so "not visible" only means closed once it
    // has been fully open at least once.
    let hasOpened = false
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries.at(-1)
        if (!entry) return
        if (entry.intersectionRatio === 1) {
          hasOpened = true
          if (page) page.inert = true
          document.documentElement.style.overflow = 'hidden'
          triggerRef.current?.setAttribute('aria-expanded', 'true')
          sheet.focus({ preventScroll: true })
        } else if ((hasOpened || closeRequested.current) && entry.intersectionRatio < threshold) {
          if (page) page.inert = false
          document.documentElement.style.overflow = ''
          triggerRef.current?.setAttribute('aria-expanded', 'false')
          setMounted(false)
          triggerRef.current?.focus({ preventScroll: true })
        }
      },
      { root: overlay, threshold: [threshold, 1] },
    )
    observer.observe(sheet)

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)

    return () => {
      cancelAnimationFrame(frame)
      scroller.removeEventListener('scroll', setDim)
      observer.disconnect()
      document.removeEventListener('keydown', onKey)
      if (page) page.inert = false
      document.documentElement.style.overflow = ''
    }
  }, [mounted, close])

  const linkClass = 'flex min-h-12 items-center rounded-lg px-3 text-[17px] text-ink hover:bg-stone'

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Open menu"
        aria-expanded="false"
        aria-controls="main-menu"
        onClick={() => {
          closeRequested.current = false
          setMounted(true)
        }}
        className="flex size-11 items-center justify-center rounded-full text-ink hover:bg-stone"
      >
        <ListIcon aria-hidden="true" size={24} />
      </button>

      {mounted &&
        createPortal(
          <div
            ref={overlayRef}
            className="fixed inset-0 z-50"
            style={{ ['--dim' as string]: 0 }}
            onClick={(e) => {
              if (!sheetRef.current?.contains(e.target as Node)) close()
            }}
          >
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-wine-deep" style={{ opacity: 'calc(var(--dim) * 0.6)' }} />
            <div
              ref={scrollerRef}
              className="no-scrollbar relative grid h-full snap-x snap-mandatory overflow-x-scroll overscroll-none [grid-template-columns:min(22rem,84vw)_100%]"
            >
              <nav
                ref={sheetRef}
                id="main-menu"
                aria-label="Main menu"
                tabIndex={-1}
                className="flex h-svh snap-start flex-col overflow-y-auto bg-white shadow-overlay outline-none"
              >
                <div className="flex items-center justify-between border-b border-line-soft px-3 py-2">
                  <LogoLockup height={28} />
                  <button type="button" aria-label="Close menu" onClick={close} className="flex size-11 items-center justify-center rounded-full text-ink hover:bg-stone">
                    <XIcon aria-hidden="true" size={24} />
                  </button>
                </div>
                <div className="flex flex-col gap-6 px-3 py-5">
                  <MenuSection title="Shop sofas" links={SHOP_LINKS} linkClass={linkClass} onNavigate={close} />
                  <MenuSection title="Help" links={HELP_LINKS} linkClass={linkClass} onNavigate={close} />
                  <MenuSection title="Heartwell" links={ABOUT_LINKS} linkClass={linkClass} onNavigate={close} />
                </div>
              </nav>
              <div aria-hidden="true" className="snap-end" />
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}

function MenuSection({
  title,
  links,
  linkClass,
  onNavigate,
}: {
  title: string
  links: { label: string; href: string }[]
  linkClass: string
  onNavigate: () => void
}) {
  return (
    <section className="flex flex-col gap-1">
      <h2 className="px-3 pb-1 font-display text-lg">{title}</h2>
      <ul className="flex flex-col">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className={linkClass} onClick={onNavigate}>
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
