import type { Metadata } from 'next'
import { ActButton } from '@/components/admin/ActButton'
import { Card } from '@/components/admin/Fields'
import { Tag } from '@/components/admin/OrderBits'
import { VideoForm } from '@/components/admin/VideoForm'
import { createClient } from '@/lib/supabase/server'
import { UPLOADS_CONFIGURED } from '@/lib/admin/cloudinary'
import { cloudinaryVideo, VIDEO_KINDS, type VideoKind } from '@/lib/videos'
import { deleteVideo } from './actions'

export const metadata: Metadata = { title: 'Videos' }
export const dynamic = 'force-dynamic'

export default async function AdminVideosPage() {
  const db = await createClient()
  const [videos, products] = await Promise.all([
    db.from('videos').select('id, url, kind, caption, sort, is_active, product_id, product:products(title)').order('sort').order('created_at', { ascending: false }),
    db.from('products').select('id, title').order('title'),
  ])
  if (videos.error) throw new Error(`Videos: ${videos.error.message}`)
  if (products.error) throw new Error(`Products: ${products.error.message}`)
  const kindLabel = (k: string) => VIDEO_KINDS.find((x) => x.value === k)?.label ?? k

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-bold tracking-tight lg:text-4xl">Videos</h1>
        <p className="text-[15px] text-zinc-600">
          Short videos on product pages: a customer’s sofa in their room, or one of yours. Only post a customer’s video with their permission.
        </p>
      </header>

      <Card title="Add a video">
        <VideoForm initial={{ id: null, url: '', productId: '', kind: 'customer', caption: '', sort: '0', isActive: true }} products={products.data} uploads={UPLOADS_CONFIGURED} />
      </Card>

      {videos.data.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center text-[15px] text-zinc-500">No videos yet.</p>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {videos.data.map((v) => {
            const video = cloudinaryVideo(v.url)
            return (
              <li key={v.id} className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                {video && <video src={video.mp4} poster={video.poster} controls preload="none" playsInline className="aspect-video w-full rounded-lg bg-zinc-900" />}
                <div className="flex flex-wrap items-center gap-1.5">
                  <Tag>{kindLabel(v.kind)}</Tag>
                  {!v.is_active && <Tag tone="warn">Hidden</Tag>}
                  <span className="text-sm text-zinc-700">{v.product?.title ?? 'Not linked to a product'}</span>
                </div>
                {v.caption && <p className="text-sm text-zinc-600">{v.caption}</p>}
                <details className="rounded-lg bg-zinc-50 p-3">
                  <summary className="cursor-pointer text-sm font-semibold text-zinc-800">Edit</summary>
                  <div className="pt-3">
                    <VideoForm
                      initial={{ id: v.id, url: v.url, productId: v.product_id ?? '', kind: v.kind as VideoKind, caption: v.caption ?? '', sort: String(v.sort), isActive: v.is_active }}
                      products={products.data}
                      uploads={UPLOADS_CONFIGURED}
                    />
                  </div>
                </details>
                <ActButton act={deleteVideo.bind(null, v.id)} label="Delete" tone="danger" confirm="Delete this video from the site? The file stays in Cloudinary." />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
