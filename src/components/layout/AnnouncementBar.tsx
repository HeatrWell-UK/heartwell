import { ANNOUNCEMENT, ANNOUNCEMENT_SHORT } from '@/config/promises'

/** One sentence, no carousel, with a thin gold rule underneath. One line on phones too, in its shorter form. */
export function AnnouncementBar() {
  return (
    <div className="border-gold-rule bg-wine px-4 pb-2 pt-2.5 text-center text-[13px] font-medium text-white">
      <span className="sm:hidden">{ANNOUNCEMENT_SHORT}</span>
      <span className="hidden sm:inline">{ANNOUNCEMENT}</span>
    </div>
  )
}
