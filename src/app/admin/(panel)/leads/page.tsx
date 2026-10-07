import type { Metadata } from 'next'
import Link from 'next/link'
import { ChatCircleTextIcon, EnvelopeSimpleIcon, PhoneIcon, WhatsappLogoIcon } from '@phosphor-icons/react/ssr'
import { ActButton } from '@/components/admin/ActButton'
import { CopyButton } from '@/components/admin/ClientButtons'
import { Tag } from '@/components/admin/OrderBits'
import { basketLines, isLeadTab, LEAD_TABS, leadCounts, loadBaskets, loadEnquiries, loadMessages, loadSamples, loadSubscribers, type LeadTab } from '@/lib/admin/load-leads'
import { dualTime } from '@/lib/admin/orders'
import { whatsAppTo } from '@/lib/leads/notify'
import { CONTACT_TOPICS, type ContactTopic } from '@/lib/leads/topics'
import { SAMPLES } from '@/config/samples'
import { SITE_URL } from '@/config/site'
import { cn } from '@/lib/cn'
import { emailBasketReminder, markBasketDone, setMessageStatus, setSampleStatus } from './actions'

export const metadata: Metadata = { title: 'Leads' }
export const dynamic = 'force-dynamic'

const INTRO: Record<LeadTab, string> = {
  samples: `Ring or WhatsApp to take the ${SAMPLES.fee}, post the samples, then mark them posted.`,
  messages: 'From the contact form. Reply by email or WhatsApp, then mark it replied.',
  whatsapp: 'Every tap on a WhatsApp button, with the HW-WA reference from the message. Find one by its reference to see where the chat started.',
  baskets: 'Shoppers who ticked “remind me about my basket” at checkout. Send the one reminder they asked for; leads close themselves if they order.',
  newsletter: 'People who confirmed they want emails. Only confirmed addresses may be emailed.',
}

const when = (iso: string | null) => dualTime(iso)?.uk ?? ''
const first = (name: string) => name.trim().split(/\s+/)[0] ?? name
const card = 'flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm'
const linkButton = 'flex min-h-11 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-zinc-800 ring-1 ring-zinc-200 hover:ring-zinc-300'

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center text-[15px] text-zinc-500">{children}</p>
}

function ShowAll({ tab, all }: { tab: LeadTab; all: boolean }) {
  return (
    <Link href={`/admin/leads?tab=${tab}${all ? '' : '&all=1'}`} className="self-start text-sm font-semibold text-zinc-700 underline underline-offset-2">
      {all ? 'Show only what’s waiting' : 'Show everything, including done'}
    </Link>
  )
}

async function Samples({ all }: { all: boolean }) {
  const rows = await loadSamples(all)
  if (rows.length === 0) return <Empty>{all ? 'No sample requests yet.' : 'No samples waiting.'}</Empty>
  return (
    <ul className="grid gap-3 lg:grid-cols-2">
      {rows.map((s) => {
        const wa = whatsAppTo(s.customer_phone, `Hi ${first(s.customer_name)}, it's Heartwell about your fabric samples. It's ${SAMPLES.fee} for the set, and we take it off your sofa if you buy. How would you like to pay?`)
        return (
          <li key={s.id} className={card}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-zinc-900">{s.customer_name}</p>
              <div className="flex gap-1.5">
                {s.is_test && <Tag tone="test">Test</Tag>}
                <Tag tone={s.status === 'pending' ? 'warn' : 'plain'}>{s.status === 'pending' ? 'Waiting' : s.status === 'posted' ? `Posted ${when(s.posted_at)}` : 'Cancelled'}</Tag>
              </div>
            </div>
            <p className="text-sm text-zinc-600">
              {s.customer_phone && (
                <>
                  <a href={`tel:${s.customer_phone.replace(/\s/g, '')}`} className="font-semibold text-zinc-800">
                    {s.customer_phone}
                  </a>
                  {' · '}
                </>
              )}
              <a href={`mailto:${s.customer_email}`} className="text-zinc-800">
                {s.customer_email}
              </a>
            </p>
            <p className="text-sm text-zinc-700">
              {s.shipping_address}, {s.postcode}
            </p>
            <ul className="flex flex-col gap-0.5 rounded-lg bg-zinc-50 p-3 text-sm">
              {s.sample_request_items.map((i) => (
                <li key={i.material_code}>
                  {i.material_collection} {i.material_name} <span className="font-mono text-xs text-zinc-500">{i.material_code}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-zinc-500">Asked {when(s.created_at)}</p>
            <div className="flex flex-wrap gap-2">
              {wa && (
                <a href={wa} target="_blank" rel="noopener" className={linkButton}>
                  <WhatsappLogoIcon aria-hidden="true" size={18} /> WhatsApp
                </a>
              )}
              {s.status === 'pending' ? (
                <>
                  <ActButton act={setSampleStatus.bind(null, s.id, 'posted')} label="Paid and posted" tone="primary" />
                  <ActButton act={setSampleStatus.bind(null, s.id, 'cancelled')} label="Cancel" tone="danger" confirm="Cancel this sample request?" />
                </>
              ) : (
                <ActButton act={setSampleStatus.bind(null, s.id, 'pending')} label="Back to waiting" />
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

async function Messages({ all }: { all: boolean }) {
  const rows = await loadMessages(all)
  if (rows.length === 0) return <Empty>{all ? 'No messages yet.' : 'No new messages.'}</Empty>
  return (
    <ul className="grid gap-3 lg:grid-cols-2">
      {rows.map((m) => {
        const wa = whatsAppTo(m.phone, `Hi ${first(m.name)}, it's Heartwell replying to your message.`)
        return (
          <li key={m.id} className={card}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-zinc-900">{m.name}</p>
              <div className="flex gap-1.5">
                {m.is_test && <Tag tone="test">Test</Tag>}
                <Tag tone={m.status === 'new' ? 'warn' : 'plain'}>{m.status === 'new' ? 'New' : m.status === 'replied' ? `Replied ${when(m.replied_at)}` : 'Closed'}</Tag>
              </div>
            </div>
            <p className="text-sm text-zinc-600">
              {CONTACT_TOPICS[m.topic as ContactTopic] ?? m.topic}
              {m.order_reference && (
                <>
                  {' · '}
                  <Link href={`/admin/orders?filter=all&q=${encodeURIComponent(m.order_reference)}`} className="font-semibold text-zinc-800">
                    {m.order_reference}
                  </Link>
                </>
              )}
              {' · '}
              {when(m.created_at)}
            </p>
            <p className="whitespace-pre-line rounded-lg bg-zinc-50 p-3 text-[15px] text-zinc-800">{m.message}</p>
            <div className="flex flex-wrap gap-2">
              <a href={`mailto:${m.email}?subject=${encodeURIComponent('Re: your message to Heartwell')}`} className={linkButton}>
                <EnvelopeSimpleIcon aria-hidden="true" size={18} /> {m.email}
              </a>
              {wa && (
                <a href={wa} target="_blank" rel="noopener" className={linkButton}>
                  <WhatsappLogoIcon aria-hidden="true" size={18} /> WhatsApp
                </a>
              )}
              {m.phone && (
                <a href={`tel:${m.phone.replace(/\s/g, '')}`} className={linkButton}>
                  <PhoneIcon aria-hidden="true" size={18} /> Ring
                </a>
              )}
            </div>
            <div className="flex flex-wrap gap-2 border-t border-zinc-100 pt-3">
              {m.status === 'new' ? (
                <>
                  <ActButton act={setMessageStatus.bind(null, m.id, 'replied')} label="Mark replied" tone="primary" />
                  <ActButton act={setMessageStatus.bind(null, m.id, 'closed')} label="Close without reply" />
                </>
              ) : (
                <ActButton act={setMessageStatus.bind(null, m.id, 'new')} label="Mark as new" />
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

async function Enquiries({ q }: { q: string }) {
  const rows = await loadEnquiries(q)
  return (
    <div className="flex flex-col gap-3">
      <form method="get" className="flex gap-2">
        <input type="hidden" name="tab" value="whatsapp" />
        <label htmlFor="wa-q" className="sr-only">
          Find a reference
        </label>
        <input id="wa-q" name="q" defaultValue={q} placeholder="HW-WA-261007-K7P2QX" autoCapitalize="characters" className="min-h-11 min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 font-mono text-[16px] uppercase" />
        <button type="submit" className="min-h-11 rounded-lg bg-zinc-900 px-5 text-sm font-semibold text-white">
          Find
        </button>
      </form>
      {rows.length === 0 ? (
        <Empty>{q ? 'No enquiry with that reference.' : 'No WhatsApp taps yet.'}</Empty>
      ) : (
        <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          {rows.map((e) => (
            <li key={e.id} className="flex flex-col gap-1.5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-sm font-semibold text-zinc-900">{e.reference}</span>
                <div className="flex gap-1.5">
                  {e.is_test && <Tag tone="test">Test</Tag>}
                  {e.order?.reference ? <Tag tone="source">Ordered {e.order.reference}</Tag> : null}
                </div>
              </div>
              <p className="text-sm text-zinc-700">
                {e.product_name ?? 'No product'} · from {e.page_context ?? 'the site'} · {when(e.created_at)}
              </p>
              {(e.page_url || e.utm_source) && (
                <p className="truncate text-xs text-zinc-500">
                  {e.page_url}
                  {e.utm_source && ` · ${e.utm_source}${e.utm_campaign ? ` / ${e.utm_campaign}` : ''}`}
                </p>
              )}
              {!e.converted_order_id && (
                <Link href={`/admin/orders/new?wa=${encodeURIComponent(e.reference)}`} className="self-start text-sm font-semibold text-zinc-800 underline underline-offset-2">
                  Take this order
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

async function Baskets({ all }: { all: boolean }) {
  const rows = await loadBaskets(all)
  if (rows.length === 0) return <Empty>{all ? 'No basket reminders yet.' : 'No baskets waiting for a reminder.'}</Empty>
  return (
    <ul className="grid gap-3 lg:grid-cols-2">
      {rows.map((b) => {
        const lines = basketLines(b.basket)
        const wa = b.whatsapp_opt_in
          ? whatsAppTo(
              b.phone,
              `Hi, it's Heartwell. You asked us to remind you about your basket: ${lines.map((l) => l.title).join(', ')}. Any questions about sizes, fabrics or delivery, just reply here. ${lines[0] ? `${SITE_URL}/products/${lines[0].slug}` : SITE_URL}`,
            )
          : null
        return (
          <li key={b.id} className={card}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-zinc-900">{[b.email, b.phone].filter(Boolean).join(' · ') || 'Contact removed'}</p>
              <div className="flex gap-1.5">
                {b.is_test && <Tag tone="test">Test</Tag>}
                <Tag tone={b.status === 'active' ? 'warn' : 'plain'}>{b.status === 'active' ? (b.reminder_sent_at ? `Reminded ${when(b.reminder_sent_at)}` : 'Waiting') : b.status === 'converted' ? 'Ordered' : 'Closed'}</Tag>
              </div>
            </div>
            <p className="text-xs text-zinc-500">
              Asked {when(b.created_at)} · by {[b.email_opt_in && 'email', b.whatsapp_opt_in && 'WhatsApp'].filter(Boolean).join(' or ')} · kept until {when(b.expires_at).split(' ').slice(0, 2).join(' ')}
            </p>
            {lines.length > 0 && (
              <ul className="flex flex-col gap-0.5 rounded-lg bg-zinc-50 p-3 text-sm">
                {lines.map((l) => (
                  <li key={`${l.slug}-${l.option}`}>
                    <a href={`/products/${l.slug}`} target="_blank" rel="noopener" className="font-semibold text-zinc-800">
                      {l.quantity > 1 ? `${l.quantity} × ` : ''}
                      {l.title}
                    </a>
                    {l.option && <span className="text-zinc-500"> · {l.option}</span>}
                  </li>
                ))}
              </ul>
            )}
            {b.status === 'active' && (
              <div className="flex flex-wrap gap-2">
                {b.email_opt_in && b.email && !b.reminder_sent_at && <ActButton act={emailBasketReminder.bind(null, b.id)} label="Email the reminder" tone="primary" />}
                {wa && !b.reminder_sent_at && (
                  <>
                    <a href={wa} target="_blank" rel="noopener" className={linkButton}>
                      <WhatsappLogoIcon aria-hidden="true" size={18} /> WhatsApp
                    </a>
                    <ActButton act={markBasketDone.bind(null, b.id, 'whatsapp')} label="Reminded on WhatsApp" />
                  </>
                )}
                <ActButton act={markBasketDone.bind(null, b.id, 'done')} label="Done" />
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

async function Newsletter() {
  const rows = await loadSubscribers()
  const confirmed = rows.filter((r) => r.status === 'confirmed')
  const pending = rows.filter((r) => r.status === 'pending').length
  const stopped = rows.filter((r) => r.status === 'unsubscribed').length
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[15px] text-zinc-700">
        <strong>{confirmed.length}</strong> confirmed · {pending} waiting to confirm · {stopped} stopped
      </p>
      {confirmed.length > 0 && <CopyButton text={confirmed.map((r) => r.email).join(', ')} label="Copy confirmed emails" className="self-start" />}
      {confirmed.length === 0 ? (
        <Empty>No confirmed subscribers yet.</Empty>
      ) : (
        <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white text-sm shadow-sm">
          {confirmed.map((r) => (
            <li key={r.id} className="flex flex-wrap justify-between gap-2 px-4 py-3">
              <span className="text-zinc-900">{r.email}</span>
              <span className="text-zinc-500">since {when(r.confirmed_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ tab?: string; all?: string; q?: string }> }) {
  const params = await searchParams
  const tab: LeadTab = isLeadTab(params.tab) ? params.tab : 'samples'
  const all = params.all === '1'
  const q = (params.q ?? '').slice(0, 40)
  const counts = await leadCounts()

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-bold tracking-tight lg:text-4xl">Leads</h1>
        <p className="flex items-start gap-2 text-[15px] text-zinc-600">
          <ChatCircleTextIcon aria-hidden="true" size={20} className="mt-0.5 shrink-0" />
          {INTRO[tab]}
        </p>
      </header>
      <nav aria-label="Lead types" className="-mx-4 overflow-x-auto px-4">
        <ul className="flex gap-2">
          {LEAD_TABS.map((t) => (
            <li key={t.key}>
              <Link
                href={`/admin/leads?tab=${t.key}`}
                aria-current={t.key === tab ? 'page' : undefined}
                className={cn(
                  'flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-semibold ring-1',
                  t.key === tab ? 'bg-zinc-900 text-white ring-zinc-900 hover:text-white' : 'bg-white text-zinc-700 ring-zinc-200',
                )}
              >
                {t.label}
                <span className={cn('rounded-full px-2 py-0.5 text-xs tabular-nums', t.key === tab ? 'bg-white/15' : 'bg-zinc-100')}>{counts[t.key]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {tab === 'samples' && (
        <>
          <Samples all={all} />
          <ShowAll tab={tab} all={all} />
        </>
      )}
      {tab === 'messages' && (
        <>
          <Messages all={all} />
          <ShowAll tab={tab} all={all} />
        </>
      )}
      {tab === 'whatsapp' && <Enquiries q={q} />}
      {tab === 'baskets' && (
        <>
          <Baskets all={all} />
          <ShowAll tab={tab} all={all} />
        </>
      )}
      {tab === 'newsletter' && <Newsletter />}
    </div>
  )
}
