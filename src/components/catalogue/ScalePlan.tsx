import type { Layout } from '@/lib/product/measurements'
import { ASSUMED_DEPTH_CM, SET_GAP_CM, planExtent } from '@/lib/catalogue/range-sizes'

/**
 * A top view drawn in real centimetres inside a shared frame (the largest size
 * in the range), centred and standing on a common baseline. Every plan on a
 * page uses the same frame, so they share one scale and can be compared at a
 * glance. Line weights don't scale; the drawing is decoration, and the sizes
 * are given in words beside it.
 */

const line = { stroke: '#8E1B2E', strokeWidth: 1.75, vectorEffect: 'non-scaling-stroke' as const, strokeLinejoin: 'round' as const }
const seam = { stroke: '#8E1B2E', strokeWidth: 1, vectorEffect: 'non-scaling-stroke' as const, strokeDasharray: '3 3', fill: 'none' }
const BACK = 0.26 // back cushions take about a quarter of the depth
const ARM = 0.13 // and each arm about an eighth of it, at least 14 cm

function Straight({ x, y, w, d, seats }: { x: number; y: number; w: number; d: number; seats: number | null }) {
  const arm = Math.max(14, d * ARM)
  const back = y + d * BACK
  const inner = w - arm * 2
  const n = seats && seats > 1 && inner > 0 ? seats : 1
  return (
    <>
      <rect x={x} y={y} width={w} height={d} rx={5} fill="#FFFFFF" {...line} />
      <path d={`M${x} ${back}H${x + w}M${x + arm} ${back}V${y + d}M${x + w - arm} ${back}V${y + d}`} {...seam} />
      {Array.from({ length: n - 1 }, (_, i) => {
        const sx = x + arm + (inner / n) * (i + 1)
        return <path key={i} d={`M${sx} ${back}V${y + d}`} {...seam} />
      })}
    </>
  )
}

export function ScalePlan({ layout, frame, seats = null }: { layout: Layout; frame: { w: number; d: number }; seats?: number | null }) {
  const margin = Math.max(frame.w, frame.d) * 0.04
  const { w, d } = planExtent(layout)
  const x0 = (frame.w - w) / 2
  const y0 = frame.d - d // all plans stand on the same baseline

  let body
  if (layout.kind === 'straight') {
    body = <Straight x={x0} y={y0} w={w} d={d} seats={seats} />
  } else if (layout.kind === 'set') {
    let x = x0
    body = layout.pieces.map((p, i) => {
      const pd = p.d ?? ASSUMED_DEPTH_CM
      const piece = <Straight key={i} x={x} y={frame.d - pd} w={p.w} d={pd} seats={Number.parseInt(p.label, 10) || null} />
      x += p.w + SET_GAP_CM
      return piece
    })
  } else if (layout.kind === 'corner') {
    const D = layout.d ?? ASSUMED_DEPTH_CM
    const T = layout.top
    const L = layout.left
    body = (
      <>
        <path d={`M${x0} ${y0}h${T}v${D}H${x0 + D}V${y0 + L}H${x0}z`} fill="#FFFFFF" {...line} />
        <path d={`M${x0} ${y0 + D * BACK}H${x0 + T}M${x0 + D * BACK} ${y0 + D * BACK}V${y0 + L}`} {...seam} />
      </>
    )
  } else {
    const D = layout.d ?? ASSUMED_DEPTH_CM
    const W = layout.back
    const A = layout.left
    const B = layout.right
    body = (
      <>
        <path d={`M${x0} ${y0}h${W}v${B}h${-D}V${y0 + D}H${x0 + D}V${y0 + A}H${x0}z`} fill="#FFFFFF" {...line} />
        <path d={`M${x0 + D * BACK} ${y0 + A}V${y0 + D * BACK}H${x0 + W - D * BACK}V${y0 + B}`} {...seam} />
      </>
    )
  }

  return (
    <svg
      viewBox={`${-margin} ${-margin} ${frame.w + margin * 2} ${frame.d + margin * 2}`}
      className="block h-auto w-full"
      aria-hidden="true"
      focusable="false"
    >
      {body}
    </svg>
  )
}
