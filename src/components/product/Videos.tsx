import type { ProductPageData } from '@/lib/product/types'

/** Short videos of this piece. They load only when tapped (preload none), so they never slow the page. */
export function Videos({ videos, title }: { videos: ProductPageData['videos']; title: string }) {
  if (videos.length === 0) return null
  const fromCustomers = videos.every((v) => v.fromCustomer)
  return (
    <section aria-labelledby="videos" className="flex flex-col gap-3">
      <h2 id="videos" className="text-2xl">
        {fromCustomers ? 'In our customers’ homes' : 'See it in a video'}
      </h2>
      <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1 lg:mx-0 lg:grid lg:grid-cols-2 lg:overflow-visible lg:px-0">
        {videos.map((v) => (
          <li key={v.mp4} className="flex w-[72%] shrink-0 snap-start flex-col gap-2 lg:w-auto">
            <video
              src={v.mp4}
              poster={v.poster}
              controls
              preload="none"
              playsInline
              aria-label={v.caption ? `${title}: ${v.caption}` : `${title} video`}
              className="aspect-[4/5] w-full rounded-[var(--radius-card)] bg-stone object-cover"
            />
            {v.caption && <p className="text-[15px] text-slate">{v.caption}</p>}
          </li>
        ))}
      </ul>
    </section>
  )
}
