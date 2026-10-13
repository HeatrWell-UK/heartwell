import Link from 'next/link'
import { CheckCircleIcon, WarningIcon, XCircleIcon } from '@phosphor-icons/react/ssr'
import { ActButton } from '@/components/admin/ActButton'
import { Card } from '@/components/admin/Fields'
import { dualTime } from '@/lib/admin/orders'
import { pushVerdict } from '@/lib/admin/orderflow'
import { checkOrderFlowReplies, sendToOrderFlow, setOrderFlow, setOrderFlowTests } from '@/app/admin/(panel)/settings/orderflow-actions'

export interface OrderFlowState {
  enabled: boolean
  /** Test orders go automatically too (marked TEST). */
  send_tests?: boolean
  configured: boolean
  recent: {
    id: number
    order_id: string
    reference: string
    status: string
    is_test: boolean
    pushed_at: string
    manual: boolean
    status_code: number | null
    outcome: string | null
    error: string | null
    checked_at: string | null
  }[]
  test_order: { id: string; reference: string } | null
}

const ICON = { ok: CheckCircleIcon, bad: XCircleIcon, wait: WarningIcon }
const TONE = { ok: 'text-emerald-700', bad: 'text-red-700', wait: 'text-amber-700' }

/** Settings → OrderFlow: is it connected, is it on, what did it say, and a test. */
export function OrderFlowCard({ state }: { state: OrderFlowState }) {
  const status = !state.configured ? 'Not connected' : state.enabled ? 'On' : 'Ready, switched off'
  const sendsTests = state.send_tests === true
  return (
    <Card
      title="OrderFlow"
      intro="Every real order goes to OrderFlow when it’s placed and whenever its status changes, with its items, total, postcode and delivery day, never the customer’s name, phone, email or address. Anything OrderFlow misses is sent again within 15 minutes."
    >
      <dl className="grid gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-lg bg-zinc-50 p-3 ring-1 ring-zinc-200">
          <dt className="text-zinc-500">Status</dt>
          <dd className="text-lg font-bold text-zinc-900">{status}</dd>
        </div>
        <div className="rounded-lg bg-zinc-50 p-3 ring-1 ring-zinc-200">
          <dt className="text-zinc-500">Address and key in Supabase Vault</dt>
          <dd className="text-lg font-bold text-zinc-900">{state.configured ? 'Both set' : 'Not yet'}</dd>
        </div>
        <div className="rounded-lg bg-zinc-50 p-3 ring-1 ring-zinc-200">
          <dt className="text-zinc-500">Test orders</dt>
          <dd className="text-lg font-bold text-zinc-900">{sendsTests ? 'Sent too, marked TEST' : 'Kept here'}</dd>
        </div>
      </dl>
      <p className="text-sm text-zinc-600">
        Before launch every order is a test order, so with test orders kept here nothing reaches OrderFlow on its own. Send them too while you try it
        out (each arrives as “TEST HW-…”; delete it there afterwards), and switch that off at go-live.
      </p>
      {!state.configured && (
        <p className="text-sm text-zinc-600">
          To connect it, add <span className="font-mono">orderflow_ingest_url</span> and <span className="font-mono">orderflow_ingest_key</span> as secrets in
          Supabase (the project → Project Settings → Vault). The steps are in <span className="font-mono">docs/ORDERFLOW.md</span>.
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        {state.configured && state.test_order && (
          <ActButton
            act={sendToOrderFlow.bind(null, state.test_order.id)}
            label={`Send test order ${state.test_order.reference} (marked TEST)`}
            confirm={`Send ${state.test_order.reference} to OrderFlow, marked TEST, to check the connection? Delete it in OrderFlow afterwards.`}
          />
        )}
        {(state.configured || state.enabled) && (
          <ActButton
            act={setOrderFlow.bind(null, !state.enabled)}
            label={state.enabled ? 'Switch off' : 'Switch on'}
            tone={state.enabled ? 'plain' : 'primary'}
            confirm={state.enabled ? 'Stop sending orders to OrderFlow?' : 'Start sending every real order to OrderFlow?'}
          />
        )}
        {(state.configured || sendsTests) && (
          <ActButton
            act={setOrderFlowTests.bind(null, !sendsTests)}
            label={sendsTests ? 'Keep test orders here' : 'Send test orders too'}
            tone="plain"
            confirm={
              sendsTests
                ? 'Stop sending test orders to OrderFlow? Real orders still go.'
                : 'Send test orders to OrderFlow too, marked TEST, when they’re placed and whenever their status changes? Delete them there afterwards.'
            }
          />
        )}
        {state.recent.length > 0 && <ActButton act={checkOrderFlowReplies} label="Check for replies" />}
      </div>
      {state.recent.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-bold text-zinc-900">Latest sends</h3>
          <ul className="divide-y divide-zinc-100 rounded-lg ring-1 ring-zinc-200">
            {state.recent.map((p) => {
              const v = pushVerdict(p)
              const Icon = ICON[v.tone]
              return (
                <li key={p.id} className="flex flex-col gap-0.5 p-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <span className="flex items-center gap-2">
                    <Icon aria-hidden="true" size={18} weight="fill" className={TONE[v.tone]} />
                    <Link href={`/admin/orders/${p.order_id}`} className="font-semibold text-zinc-900">
                      {p.is_test ? 'TEST ' : ''}
                      {p.reference}
                    </Link>
                    <span className="text-zinc-500">
                      {p.status}
                      {p.manual ? ', sent by hand' : ''}
                    </span>
                  </span>
                  <span className={`${TONE[v.tone]} sm:text-right`}>
                    {v.text} <span className="text-zinc-500">· {dualTime(p.pushed_at)?.uk}</span>
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </Card>
  )
}
