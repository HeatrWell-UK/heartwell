import { ANNOUNCEMENT } from '@/config/promises'

/** One sentence, no carousel, with a thin gold rule underneath. */
export function AnnouncementBar() {
  return (
    <div className="border-gold-rule bg-wine px-4 pb-2 pt-2.5 text-center text-[13px] font-medium text-white">
      {ANNOUNCEMENT}
    </div>
  )
}
