'use client'

import type { ReactNode } from 'react'
import { track } from '@/lib/tracking/browser'

/** A phone number to tap: a call is a Contact, the same as a WhatsApp tap. */
export function TelLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return (
    <a href={href} className={className} onClick={() => track('Contact', { contentName: 'Phone call' })}>
      {children}
    </a>
  )
}
