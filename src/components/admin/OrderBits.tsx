import { cn } from '@/lib/cn'
import { isStatus, STATUS_LABEL } from '@/lib/admin/orders'

const STYLE: Record<string, string> = {
  pending_cod: 'bg-zinc-100 text-zinc-700 ring-zinc-200',
  confirmed: 'bg-amber-50 text-amber-800 ring-amber-200',
  processing: 'bg-sky-50 text-sky-800 ring-sky-200',
  shipped: 'bg-indigo-50 text-indigo-800 ring-indigo-200',
  delivered: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  cancelled: 'bg-red-50 text-red-800 ring-red-200',
}

export function OrderStatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1', STYLE[status] ?? STYLE.pending_cod, className)}>
      {isStatus(status) ? STATUS_LABEL[status] : status}
    </span>
  )
}

export function Tag({ children, tone = 'plain' }: { children: React.ReactNode; tone?: 'plain' | 'test' | 'warn' | 'source' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1',
        tone === 'plain' && 'bg-white text-zinc-700 ring-zinc-200',
        tone === 'test' && 'bg-violet-50 text-violet-800 ring-violet-200',
        tone === 'warn' && 'bg-amber-50 text-amber-900 ring-amber-200',
        tone === 'source' && 'bg-zinc-800 text-white ring-zinc-800',
      )}
    >
      {children}
    </span>
  )
}

export const SOURCE_LABEL: Record<string, string> = { website: 'Website', whatsapp: 'WhatsApp', phone: 'Phone' }
