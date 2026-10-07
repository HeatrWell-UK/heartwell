'use client'

// Adding or editing a product video: upload from the phone (when Cloudinary
// keys are set) or paste a Cloudinary video link.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { VideoCameraIcon } from '@phosphor-icons/react'
import { saveVideo, signVideoUpload } from '@/app/admin/(panel)/videos/actions'
import { cloudinaryVideo, VIDEO_KINDS, type VideoKind } from '@/lib/videos'
import { OutcomeNote, primaryButton, secondaryButton, SelectField, TextField, Toggle, type Outcome } from './Fields'

const MAX_BYTES = 100 * 1024 * 1024

export interface VideoDraft {
  id: string | null
  url: string
  productId: string
  kind: VideoKind
  caption: string
  sort: string
  isActive: boolean
}

export function VideoForm({ initial, products, uploads, onDone }: { initial: VideoDraft; products: { id: string; title: string }[]; uploads: boolean; onDone?: () => void }) {
  const router = useRouter()
  const [d, setD] = useState(initial)
  const [busy, setBusy] = useState<'saving' | 'uploading' | null>(null)
  const [outcome, setOutcome] = useState<Outcome>(null)
  const set = (patch: Partial<VideoDraft>) => setD((x) => ({ ...x, ...patch }))
  const preview = cloudinaryVideo(d.url)

  async function upload(file: File) {
    if (file.size > MAX_BYTES) return setOutcome({ ok: false, message: 'That video is over 100 MB. Trim it, or send a shorter clip.' })
    setBusy('uploading')
    setOutcome(null)
    try {
      const signed = await signVideoUpload()
      if (!signed.ok) return setOutcome(signed)
      const body = new FormData()
      for (const [k, v] of Object.entries(signed.fields)) body.append(k, v)
      body.append('file', file)
      const res = await fetch(signed.url, { method: 'POST', body })
      const json = (await res.json().catch(() => ({}))) as { secure_url?: string; error?: { message?: string } }
      if (!res.ok || !json.secure_url) return setOutcome({ ok: false, message: `Upload failed: ${json.error?.message ?? res.statusText}` })
      set({ url: json.secure_url })
    } catch {
      setOutcome({ ok: false, message: 'Upload failed. Check the connection and try again.' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy('saving')
        const r = await saveVideo({ ...d, sort: Number(d.sort) || 0 }).catch(() => ({ ok: false as const, message: 'Couldn’t reach the server. Try again.' }))
        setBusy(null)
        setOutcome(r)
        if (r.ok) {
          if (!d.id) setD(initial)
          router.refresh()
          onDone?.()
        }
      }}
    >
      {uploads && (
        <label className={`${secondaryButton} cursor-pointer self-start ${busy === 'uploading' ? 'opacity-60' : ''}`}>
          <VideoCameraIcon aria-hidden="true" size={20} />
          {busy === 'uploading' ? 'Uploading…' : 'Upload a video'}
          <input
            type="file"
            accept="video/*"
            className="sr-only"
            disabled={busy !== null}
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) void upload(file)
            }}
          />
        </label>
      )}
      <TextField
        label={uploads ? 'Or paste a Cloudinary video link' : 'Cloudinary video link'}
        value={d.url}
        inputMode="url"
        onChange={(url) => set({ url: url.trim() })}
        invalid={d.url !== '' && !preview}
        hint={d.url !== '' && !preview ? 'This doesn’t look like a Cloudinary video link (it needs /video/upload/).' : undefined}
      />
      {preview && (
        <video src={preview.mp4} poster={preview.poster} controls preload="none" playsInline className="aspect-video w-full max-w-md rounded-lg bg-zinc-900" />
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Product" value={d.productId} onChange={(productId) => set({ productId })} options={[{ value: '', label: 'Not linked to a product' }, ...products.map((p) => ({ value: p.id, label: p.title }))]} />
        <SelectField label="Who made it" value={d.kind} onChange={(kind) => set({ kind: kind as VideoKind })} options={VIDEO_KINDS.map((k) => ({ value: k.value, label: k.label }))} />
      </div>
      <TextField label="Caption (optional)" value={d.caption} maxLength={200} onChange={(caption) => set({ caption })} hint="Shown under the video, e.g. Delivered to Leeds." />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Order" value={d.sort} inputMode="numeric" onChange={(sort) => set({ sort: sort.replace(/\D/g, '').slice(0, 4) })} hint="Lower numbers first." />
        <div className="flex items-end pb-2">
          <Toggle label="Shown on the product page" checked={d.isActive} onChange={(isActive) => set({ isActive })} />
        </div>
      </div>
      <OutcomeNote outcome={outcome} />
      <button type="submit" disabled={busy !== null} className={`${primaryButton} self-start`}>
        {busy === 'saving' ? 'Saving…' : d.id ? 'Save video' : 'Add video'}
      </button>
    </form>
  )
}
