import type { Piece } from '@/lib/catalogue/clean'
import type { SizeFields } from '@/lib/catalogue/display'
import { measurementLayout, type Layout } from '@/lib/product/measurements'

/**
 * A top-view drawing to scale, with gold dimension lines, and the numbers
 * underneath. Straight pieces, corners, U-shapes and two-piece sets each get
 * their own drawing; anything unknown is left out rather than guessed.
 */

const GOLD = '#B58A2F'
const VELVET = '#8E1B2E'
const label = { fontFamily: 'var(--font-figtree), sans-serif', fontSize: 13, fontWeight: 600, fill: '#22171A' } as const

function DimH({ x1, x2, y, text }: { x1: number; x2: number; y: number; text: string }) {
  return (
    <g>
      <path d={`M${x1} ${y}H${x2}M${x1} ${y - 5}v10M${x2} ${y - 5}v10`} stroke={GOLD} strokeWidth={1.5} />
      <text x={(x1 + x2) / 2} y={y - 8} textAnchor="middle" {...label}>
        {text}
      </text>
    </g>
  )
}

function DimV({ y1, y2, x, text, side }: { y1: number; y2: number; x: number; text: string; side: 'left' | 'right' }) {
  const tx = side === 'left' ? x - 10 : x + 12
  const ty = (y1 + y2) / 2
  return (
    <g>
      <path d={`M${x} ${y1}V${y2}M${x - 5} ${y1}h10M${x - 5} ${y2}h10`} stroke={GOLD} strokeWidth={1.5} />
      <text x={tx} y={ty} textAnchor="middle" transform={`rotate(-90 ${tx} ${ty})`} {...label}>
        {text}
      </text>
    </g>
  )
}

const shapeStyle = { fill: '#F5F1EF', stroke: VELVET, strokeWidth: 2, strokeLinejoin: 'round' as const }
const cushion = { stroke: VELVET, strokeWidth: 1.2, strokeDasharray: '4 4', fill: 'none' }

function Drawing({ layout }: { layout: Layout }) {
  // Drawing area: x 60–290, y 34–196.
  if (layout.kind === 'straight') {
    const d = layout.d ?? Math.round(layout.w * 0.45)
    const s = Math.min(220 / layout.w, 150 / d)
    const W = layout.w * s
    const D = d * s
    const x = 60 + (220 - W) / 2
    const y = 40
    return (
      <>
        <rect x={x} y={y} width={W} height={D} rx={6} {...shapeStyle} />
        <path d={`M${x} ${y + D * 0.28}H${x + W}`} {...cushion} />
        <DimH x1={x} x2={x + W} y={y - 14} text={`${layout.w} cm`} />
        {layout.d && <DimV y1={y} y2={y + D} x={x + W + 16} text={`${layout.d} cm`} side="right" />}
      </>
    )
  }
  if (layout.kind === 'corner') {
    const s = Math.min(220 / layout.top, 156 / layout.left)
    const T = layout.top * s
    const L = layout.left * s
    // An unknown depth is drawn at a typical 90 cm but never labelled.
    const D = (layout.d ?? 90) * s
    const x = 66
    const y = 38
    return (
      <>
        <path d={`M${x} ${y}h${T}v${D}H${x + D}V${y + L}H${x}z`} {...shapeStyle} />
        <path d={`M${x} ${y + D * 0.28}H${x + T}M${x + D * 0.28} ${y + D * 0.28}V${y + L}`} {...cushion} />
        <DimH x1={x} x2={x + T} y={y - 14} text={`${layout.top} cm`} />
        <DimV y1={y} y2={y + L} x={x - 16} text={`${layout.left} cm`} side="left" />
        {layout.d && <DimV y1={y} y2={y + D} x={x + T + 16} text={`${layout.d} cm`} side="right" />}
      </>
    )
  }
  if (layout.kind === 'u') {
    const s = Math.min(212 / layout.back, 156 / Math.max(layout.left, layout.right))
    const W = layout.back * s
    const A = layout.left * s
    const B = layout.right * s
    const D = (layout.d ?? 90) * s
    const x = 66
    const y = 38
    return (
      <>
        <path d={`M${x} ${y}h${W}v${B}h${-D}V${y + D}H${x + D}V${y + A}H${x}z`} {...shapeStyle} />
        <path d={`M${x + D * 0.28} ${y + A}V${y + D * 0.28}H${x + W - D * 0.28}V${y + B}`} {...cushion} />
        <DimH x1={x} x2={x + W} y={y - 14} text={`${layout.back} cm`} />
        <DimV y1={y} y2={y + A} x={x - 16} text={`${layout.left} cm`} side="left" />
        <DimV y1={y} y2={y + B} x={x + W + 16} text={`${layout.right} cm`} side="right" />
      </>
    )
  }
  const [p1, p2] = layout.pieces as [{ label: string; w: number; d: number | null }, { label: string; w: number; d: number | null }]
  const d1 = p1.d ?? Math.round(p1.w * 0.45)
  const d2 = p2.d ?? d1
  const s = Math.min(200 / (p1.w + p2.w), 120 / Math.max(d1, d2))
  const gap = 24
  const x1 = 60 + (230 - (p1.w + p2.w) * s - gap) / 2
  const x2 = x1 + p1.w * s + gap
  const y = 52
  return (
    <>
      <rect x={x1} y={y} width={p1.w * s} height={d1 * s} rx={6} {...shapeStyle} />
      <rect x={x2} y={y} width={p2.w * s} height={d2 * s} rx={6} {...shapeStyle} />
      <path d={`M${x1} ${y + d1 * s * 0.28}h${p1.w * s}M${x2} ${y + d2 * s * 0.28}h${p2.w * s}`} {...cushion} />
      <DimH x1={x1} x2={x1 + p1.w * s} y={y - 14} text={`${p1.w} cm`} />
      <DimH x1={x2} x2={x2 + p2.w * s} y={y - 14} text={`${p2.w} cm`} />
      <text x={x1 + (p1.w * s) / 2} y={y + d1 * s + 22} textAnchor="middle" {...label} fontWeight={500} fill="#5E4F52">
        {p1.label}
      </text>
      <text x={x2 + (p2.w * s) / 2} y={y + d2 * s + 22} textAnchor="middle" {...label} fontWeight={500} fill="#5E4F52">
        {p2.label}
      </text>
    </>
  )
}

function describe(layout: Layout, noun: string): string {
  switch (layout.kind) {
    case 'straight':
      return `Top view of the ${noun}: ${layout.w} centimetres wide${layout.d ? `, ${layout.d} centimetres deep` : ''}`
    case 'corner':
      return `Top view of the corner ${noun}: ${layout.top} by ${layout.left} centimetres${layout.d ? `, ${layout.d} centimetres deep` : ''}`
    case 'u':
      return `Top view of the U-shaped ${noun}: ${layout.back} centimetres along the back, sides of ${layout.left} and ${layout.right} centimetres`
    case 'set':
      return `Top view of the set: ${layout.pieces.map((p) => `${p.label} ${p.w} centimetres wide`).join(' and ')}`
  }
}

export function Measurements({
  shape,
  noun,
  dimensions,
  pieces,
  note,
  askHref,
}: {
  shape: string | null
  noun: string
  dimensions: SizeFields
  pieces: Piece[]
  note: string | null
  askHref: string
}) {
  const layout = measurementLayout(shape, dimensions, pieces)
  const { width_cm: w, depth_cm: d, height_cm: h, side_a_cm: a, side_b_cm: b } = dimensions

  const figures: { label: string; value: string }[] = []
  if (layout?.kind === 'u') figures.push({ label: 'Back', value: `${layout.back} cm` }, { label: 'Sides', value: `${a} and ${b} cm` })
  else if (layout?.kind === 'corner') figures.push({ label: 'Sides', value: `${a} × ${b} cm` })
  else if (layout?.kind !== 'set' && w) figures.push({ label: 'Width', value: `${w} cm` })
  if (d) figures.push({ label: 'Depth', value: `${d} cm` })
  if (h) figures.push({ label: 'Height', value: `${h} cm` })

  return (
    <section aria-labelledby="measurements" className="flex flex-col gap-3.5">
      <h2 id="measurements" className="text-2xl">
        Measurements
      </h2>
      {layout ? (
        <div className="rounded-[var(--radius-card)] border border-line bg-white p-4">
          <svg viewBox="0 0 340 220" width="100%" role="img" aria-label={describe(layout, noun)} className="mx-auto block max-w-md">
            <Drawing layout={layout} />
          </svg>
          {layout.kind === 'set' ? (
            <ul className="mt-2 flex flex-col gap-1 border-t border-line-soft pt-3 text-[15px]">
              {layout.pieces.map((p) => {
                const piece = pieces.find((x) => x.label === p.label)
                const parts = [`W ${p.w}`, piece?.depth_cm ? `D ${piece.depth_cm}` : null, piece?.height_cm ? `H ${piece.height_cm}` : null].filter(Boolean)
                return (
                  <li key={p.label}>
                    <span className="font-semibold">{p.label}:</span> {parts.join(' · ')} cm
                  </li>
                )
              })}
            </ul>
          ) : (
            figures.length > 0 && (
              <dl className="mt-2 flex flex-wrap gap-x-8 gap-y-2 border-t border-line-soft pt-3">
                {figures.map((f) => (
                  <div key={f.label} className="flex flex-col">
                    <dt className="text-[13px] text-slate">{f.label}</dt>
                    <dd className="text-base font-semibold">{f.value}</dd>
                  </div>
                ))}
              </dl>
            )
          )}
          {note && <p className="mt-3 text-sm text-slate">{note}</p>}
        </div>
      ) : (
        <p className="rounded-[var(--radius-card)] border border-dashed border-field p-4 text-[15px] text-slate">
          We’re confirming the measurements for this piece. <a href={askHref}>Ask us</a> and we’ll send them to you.
        </p>
      )}
    </section>
  )
}
