import { EventBand } from '@/components/offer/EventOffer'
import { ANNOUNCEMENT, ANNOUNCEMENT_SHORT } from '@/config/promises'
import type { EventSettings } from '@/lib/offers/event'

/**
 * One sentence, no carousel, with a thin gold rule underneath. One line on
 * phones too, in its shorter form. While the Christmas and New Year event is
 * on, the event's line for the part of the season (it switches at UK midnight
 * in the browser and ends on 1 February by itself).
 */
export function AnnouncementBar({ event }: { event?: EventSettings }) {
  return (
    <div className="border-gold-rule bg-wine px-4 pb-2 pt-2.5 text-center text-[13px] font-medium text-white">
      {event ? (
        <EventBand settings={event} fallback={ANNOUNCEMENT} fallbackShort={ANNOUNCEMENT_SHORT} />
      ) : (
        <>
          <span className="sm:hidden">{ANNOUNCEMENT_SHORT}</span>
          <span className="hidden sm:inline">{ANNOUNCEMENT}</span>
        </>
      )}
    </div>
  )
}
