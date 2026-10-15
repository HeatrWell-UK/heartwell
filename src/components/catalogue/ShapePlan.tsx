import type { ReactNode } from 'react'

/** Top-view plans of each shape category (velvet line drawings, as designed), keyed by category slug. */
const PLANS: Record<string, ReactNode> = {
  'corner-sofas': (
    <>
      <path d="M8 8h56v14H24v18H8z" />
      <path d="M24 22v-4M40 8v14M52 8v14M8 28h16" />
    </>
  ),
  'u-shaped-sofas': (
    <>
      <path d="M6 8h60v32H52V22H20v18H6z" />
      <path d="M36 8v14M6 28h14M52 28h14" />
    </>
  ),
  '3-2-sofa-sets': (
    <>
      <rect x="4" y="14" width="36" height="16" rx="4" />
      <rect x="46" y="14" width="22" height="16" rx="4" />
      <path d="M16 14v16M28 14v16M57 14v16" />
    </>
  ),
  recliners: (
    <>
      <path d="M14 36V12a4 4 0 0 1 4-4h8v20h18" />
      <path d="M44 28l12 8h8" />
      <path d="M14 36h30" />
    </>
  ),
  'armchairs-and-footstools': (
    <>
      <rect x="6" y="10" width="28" height="26" rx="5" />
      <path d="M12 16h16v20" />
      <rect x="42" y="22" width="24" height="14" rx="4" />
    </>
  ),
}

export const hasShapePlan = (slug: string) => slug in PLANS

/** The plan for a shape category, or nothing for categories that aren't shapes (fabric, leather). */
export function ShapePlan({ slug, width = 42, className }: { slug: string; width?: number; className?: string }) {
  if (!hasShapePlan(slug)) return null
  return (
    <svg
      width={width}
      height={Math.round((width * 48) / 72)}
      viewBox="0 0 72 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden="true"
      className={className ?? 'shrink-0 text-velvet'}
    >
      {PLANS[slug]}
    </svg>
  )
}
