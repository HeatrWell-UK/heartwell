import type { Level } from '@/lib/admin/status'
import { cn } from '@/lib/cn'

const STYLE: Record<Level, { dot: string; text: string; label: string }> = {
  ok: { dot: 'bg-emerald-600', text: 'text-emerald-800 bg-emerald-50', label: 'OK' },
  warn: { dot: 'bg-amber-500', text: 'text-amber-900 bg-amber-50', label: 'Not set up yet' },
  error: { dot: 'bg-red-600', text: 'text-red-800 bg-red-50', label: 'Problem' },
}

/** Colour plus words, so the state never depends on colour alone. */
export function StatusBadge({ level, label }: { level: Level; label?: string }) {
  const s = STYLE[level]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', s.text)}>
      <span aria-hidden="true" className={cn('size-2 rounded-full', s.dot)} />
      {label ?? s.label}
    </span>
  )
}
