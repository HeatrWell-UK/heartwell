import { Hero } from '@/components/home/Hero'
import { PromiseTiles } from '@/components/home/PromiseTiles'
import { HowOrderingWorks } from '@/components/home/HowOrderingWorks'

// Phase 3 home: the hero, the promises and how ordering works. Shop by shape,
// popular sofas, fabrics and the rest arrive with the catalogue (Phase 9).
export default function HomePage() {
  return (
    <div className="pb-14 lg:pb-20">
      <Hero />
      <PromiseTiles />
      <HowOrderingWorks />
    </div>
  )
}
