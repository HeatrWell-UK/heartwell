import { SeasonBar } from '@/components/season/SeasonBar'
import { ANNOUNCEMENT, ANNOUNCEMENT_SHORT } from '@/config/promises'
import type { EventSettings } from '@/lib/offers/event'

/**
 * One sentence with a thin gold rule underneath, one line on phones too, in
 * its shorter form. While the Christmas and New Year season is on (Run 3), the
 * sticky rotating bar (SeasonBar): it switches at UK midnight in the browser
 * and ends on 1 February by itself.
 */
export function AnnouncementBar({ event }: { event?: EventSettings }) {
  if (event) return <SeasonBar settings={event} fallback={ANNOUNCEMENT} fallbackShort={ANNOUNCEMENT_SHORT} />
  return (
    <div className="border-gold-rule bg-wine px-4 pb-2 pt-2.5 text-center text-[13px] font-medium text-white">
      <span className="sm:hidden">{ANNOUNCEMENT_SHORT}</span>
      <span className="hidden sm:inline">{ANNOUNCEMENT}</span>
    </div>
  )
}
