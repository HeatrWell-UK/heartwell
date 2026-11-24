'use client'

// The hero's festive layer while the season is on (Run 3): a string of warm
// lights along the top, a tree beside the words on wider screens, and gentle
// six-armed snow. All decorative (aria-hidden, no pointer events). The snow
// is off with reduced motion and lighter on phones; nothing here covers the
// words, the price row or the sofa photo's middle.

import { useEvent } from '@/components/offer/EventOffer'
import type { EventSettings } from '@/lib/offers/event'
import { useReducedMotion } from './browserPrefs'

const BULBS = 22
const FLAKES = 26
const MOBILE_FLAKES = 10

/** Six arms, each with a pair of side branches: a real snow crystal, not a dot or a star. */
function Flake({ size }: { size: number }) {
  return (
    <svg viewBox="-10 -10 20 20" width={size} height={size}>
      <g stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" fill="none">
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <g key={a} transform={`rotate(${a})`}>
            <line x1="0" y1="0" x2="0" y2="-9" />
            <line x1="0" y1="-5" x2="-2.6" y2="-7.4" />
            <line x1="0" y1="-5" x2="2.6" y2="-7.4" />
          </g>
        ))}
      </g>
    </svg>
  )
}

function Tree() {
  return (
    <svg viewBox="0 0 120 170" className="h-full w-auto" aria-hidden="true">
      <polygon points="60,6 64,16 75,16 66,22 70,33 60,26 50,33 54,22 45,16 56,16" fill="#E9CC7B" />
      <path d="M60 24 L94 74 H76 L104 116 H82 L114 158 H6 L38 116 H16 L44 74 H26 Z" fill="#1F4A33" />
      <path d="M60 24 L94 74 H76 L104 116 H82 L114 158 H60 Z" fill="#173A28" />
      <path d="M30 76 Q60 92 90 74 M22 118 Q60 136 98 116" fill="none" stroke="#E9CC7B" strokeWidth="2" opacity=".85" />
      {[
        [48, 60],
        [70, 66],
        [40, 98],
        [62, 104],
        [84, 96],
        [30, 140],
        [56, 146],
        [80, 140],
        [98, 146],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4.2" className="hw-bulb" style={{ animationDelay: `${(i % 4) * 0.45}s` }} fill={i % 3 === 0 ? '#F2DC9C' : i % 3 === 1 ? '#A3243A' : '#FBF4E6'} />
      ))}
      <rect x="52" y="158" width="16" height="10" fill="#5A181A" />
    </svg>
  )
}

export function SeasonDecor({ settings }: { settings: EventSettings }) {
  const state = useEvent(settings)
  const reduced = useReducedMotion()
  if (!state) return null
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* Warm lights on a wire across the top. */}
      <svg viewBox="0 0 1000 40" preserveAspectRatio="none" className="absolute inset-x-0 top-0 h-7 w-full sm:h-9">
        <path d="M0 6 Q 250 34 500 8 T 1000 6" fill="none" stroke="#2A0A10" strokeWidth="1.5" />
      </svg>
      <div className="absolute inset-x-0 top-0 flex h-9 justify-between px-[2%]">
        {Array.from({ length: BULBS }, (_, i) => {
          const t = i / (BULBS - 1)
          const y = 3 + 11 * Math.abs(Math.sin(Math.PI * 2 * t))
          return (
            <span
              key={i}
              className={`hw-bulb block size-2 rounded-full sm:size-2.5 ${i % 2 ? 'max-sm:hidden' : ''}`}
              style={{ marginTop: `${y}px`, animationDelay: `${(i % 5) * 0.5}s`, background: i % 3 === 0 ? '#F2DC9C' : i % 3 === 1 ? '#FFD27A' : '#FBF4E6' }}
            />
          )
        })}
      </div>

      {/* The tree, beside the words on tablets and desktops (left), clear of the sofa photo. */}
      <div className="absolute left-[3%] top-12 hidden h-[150px] opacity-95 md:block lg:left-[5%] lg:h-[190px]">
        <Tree />
      </div>

      {!reduced && (
        <div className="absolute inset-0 text-white/70">
          {Array.from({ length: FLAKES }, (_, i) => {
            const left = (i * 37) % 100
            const size = 8 + ((i * 7) % 9)
            const dur = 11 + ((i * 5) % 9)
            return (
              <span
                key={i}
                className={`hw-flake absolute -top-6 block ${i >= MOBILE_FLAKES ? 'max-sm:hidden' : ''}`}
                style={{ left: `${left}%`, animationDuration: `${dur}s`, animationDelay: `-${(i * 1.7) % dur}s`, opacity: 0.35 + ((i * 3) % 5) / 10 }}
              >
                <Flake size={size} />
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
