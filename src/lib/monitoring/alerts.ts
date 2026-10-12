// The hourly health check's verdicts and its email. The red checks are the
// Health card's own (src/lib/admin/status.ts), so the card and the alert can
// never disagree. Pure: tested without a database or a mailbox.

import type { StatusCheck } from '@/lib/admin/status'
import { envLabel } from '@/config/env'
import { button, C, escapeHtml, h, layout, p, type RenderedEmail } from '@/lib/email/layout'

export interface Problem {
  key: string
  title: string
  summary: string
}

export interface AlertNotice extends Problem {
  /** When it first went red. */
  since: string
}

/** Everything the Health card shows in red. */
export function problemsFrom(checks: StatusCheck[]): Problem[] {
  return checks.filter((c) => c.level === 'error').map((c) => ({ key: c.key, title: c.title, summary: c.summary }))
}

const ukTime = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    .format(new Date(iso))
    .replace(',', '')

/** One email: what's broken (new, or still broken a day later), and what's been fixed since the last one. */
export function alertEmail(notify: AlertNotice[], resolved: { key: string; title: string }[], opts: { statusUrl: string; appEnv: string }): RenderedEmail {
  const where = opts.appEnv === 'production' ? '' : `[${envLabel(opts.appEnv)}] `
  const subject =
    notify.length > 0
      ? `${where}Heartwell needs attention: ${notify.map((n) => n.title).join(', ')}`
      : `${where}Heartwell is back to normal: ${resolved.map((r) => r.title).join(', ')}`
  const broken = notify
    .map((n) => p(`<strong>${escapeHtml(n.title)}</strong><br>${escapeHtml(n.summary)}<br><span style="color:${C.slate};font-size:14px">Since ${escapeHtml(ukTime(n.since))}</span>`))
    .join('')
  const fixed = resolved.length ? p(`<strong>Fixed:</strong> ${resolved.map((r) => escapeHtml(r.title)).join(', ')}.`) : ''
  const body = [
    h(notify.length ? 'Something needs attention' : 'Back to normal'),
    broken,
    fixed,
    button(opts.statusUrl, 'Open the Status page'),
    p('This is the hourly check. You’ll hear again tomorrow if it’s still red, and once it’s fixed.', `color:${C.slate};font-size:14px`),
  ].join('')
  const text = [
    notify.length ? 'Something needs attention:' : 'Back to normal.',
    '',
    ...notify.flatMap((n) => [`${n.title}: ${n.summary} (since ${ukTime(n.since)})`, '']),
    resolved.length ? `Fixed: ${resolved.map((r) => r.title).join(', ')}.` : '',
    '',
    `Status page: ${opts.statusUrl}`,
  ].join('\n')
  return { subject, html: layout(subject, body, notify.length ? notify[0]!.summary : 'Everything is working again.'), text }
}

/** The hourly check runs on the hour; a little over two hours without one means it has stopped. */
export const STALE_AFTER_MS = 2 * 60 * 60_000 + 15 * 60_000

/** /api/health/checks: green only while nothing is red and the hourly check is still running. */
export function healthVerdict(state: { red: number; last_check: string | null } | null, now = Date.now()) {
  if (!state) return { ok: false, red: null, stale: true }
  const stale = !state.last_check || now - Date.parse(state.last_check) > STALE_AFTER_MS
  return { ok: state.red === 0 && !stale, red: state.red, stale }
}
