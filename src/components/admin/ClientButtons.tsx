'use client'

import { useState } from 'react'
import { CheckIcon, CopyIcon, PrinterIcon } from '@phosphor-icons/react'
import { cn } from '@/lib/cn'

const base = 'flex min-h-11 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 hover:border-zinc-300'

/** Copies the order as plain text, ready to paste into OrderFlow or a message. */
export function CopyButton({ text, label = 'Copy order', className }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className={cn(base, className)}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
        } catch {
          // Older in-app browsers: select-and-copy fallback.
          const area = document.createElement('textarea')
          area.value = text
          document.body.append(area)
          area.select()
          document.execCommand('copy')
          area.remove()
        }
        setCopied(true)
        window.setTimeout(() => setCopied(false), 2000)
      }}
    >
      {copied ? <CheckIcon aria-hidden="true" size={18} /> : <CopyIcon aria-hidden="true" size={18} />}
      <span aria-live="polite">{copied ? 'Copied' : label}</span>
    </button>
  )
}

export function PrintButton({ className }: { className?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={cn(base, 'print:hidden', className)}>
      <PrinterIcon aria-hidden="true" size={18} />
      Print
    </button>
  )
}
