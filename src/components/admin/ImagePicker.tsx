'use client'

// Choosing a photo: upload one from the phone (straight to Cloudinary, signed
// by the server), paste a Cloudinary link, or pick from the photos the
// catalogue already uses.

import Image from 'next/image'
import { useMemo, useState } from 'react'
import { CameraIcon, LinkIcon, MagnifyingGlassIcon } from '@phosphor-icons/react'
import { Sheet } from '@/components/ui/Sheet'
import { CLOUDINARY_IMAGE } from '@/lib/admin/catalogue-form'
import { signPhotoUpload } from '@/app/admin/(panel)/catalogue/actions'
import { inputClass, labelClass, secondaryButton } from './Fields'

const MAX_BYTES = 10 * 1024 * 1024
const fileName = (url: string) => decodeURIComponent(url.split('/').pop() ?? url)

export function ImagePicker({
  open,
  onClose,
  onPick,
  images,
  uploads,
  first = [],
  title = 'Choose a photo',
}: {
  open: boolean
  onClose: () => void
  onPick: (url: string) => void
  images: string[]
  uploads: boolean
  /** Shown at the top of the library (this product's own photos). */
  first?: string[]
  title?: string
}) {
  const [query, setQuery] = useState('')
  const [link, setLink] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const library = useMemo(() => {
    const ordered = [...new Set([...first.filter(Boolean), ...images])]
    const q = query.trim().toLowerCase()
    return (q ? ordered.filter((u) => fileName(u).toLowerCase().includes(q)) : ordered).slice(0, 120)
  }, [first, images, query])

  const pick = (url: string) => {
    setError(null)
    setLink('')
    onPick(url)
    onClose()
  }

  function applyLink() {
    const url = link.trim()
    if (!CLOUDINARY_IMAGE.test(url)) return setError('Paste a Cloudinary image link (it starts https://res.cloudinary.com/).')
    pick(url)
  }

  async function upload(file: File) {
    setError(null)
    if (file.size > MAX_BYTES) return setError('That photo is over 10 MB. Choose a smaller one.')
    setBusy(true)
    try {
      const signed = await signPhotoUpload()
      if (!signed.ok) return setError(signed.message)
      const body = new FormData()
      for (const [k, v] of Object.entries(signed.fields)) body.append(k, v)
      body.append('file', file)
      const res = await fetch(signed.url, { method: 'POST', body })
      const json = (await res.json().catch(() => ({}))) as { secure_url?: string; error?: { message?: string } }
      if (!res.ok || !json.secure_url) return setError(`Upload failed: ${json.error?.message ?? res.statusText}`)
      // iPhone photos arrive as HEIC; asking for .jpg makes Cloudinary deliver a format every browser shows.
      pick(json.secure_url.replace(/\.heic$/i, '.jpg'))
    } catch {
      setError('Upload failed. Check the connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={title} className="md:max-w-2xl">
      <div className="flex flex-col gap-5 text-zinc-900">
        {uploads ? (
          <label className={`${secondaryButton} cursor-pointer ${busy ? 'opacity-60' : ''}`}>
            <CameraIcon aria-hidden="true" size={20} />
            {busy ? 'Uploading…' : 'Upload a photo'}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) void upload(file)
              }}
            />
          </label>
        ) : (
          <p className="rounded-lg bg-zinc-50 p-3 text-sm text-zinc-600 ring-1 ring-zinc-200">
            Uploading from your phone needs the Cloudinary key and secret in the hosting settings. Until then, pick a photo below or paste a Cloudinary link.
          </p>
        )}

        {/* Not a <form>: the picker sits inside the product form, and forms can't nest. */}
        <div className="flex flex-col gap-1">
          <label htmlFor="picker-link" className={labelClass}>
            Or paste a Cloudinary link
          </label>
          <div className="flex gap-2">
            <input
              id="picker-link"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  applyLink()
                }
              }}
              inputMode="url"
              placeholder="https://res.cloudinary.com/…"
              className={inputClass}
            />
            <button type="button" onClick={applyLink} className={secondaryButton}>
              <LinkIcon aria-hidden="true" size={18} />
              Use
            </button>
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-800 ring-1 ring-red-200">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <label htmlFor="picker-search" className={labelClass}>
            Photos already in the catalogue
          </label>
          <div className="relative">
            <MagnifyingGlassIcon aria-hidden="true" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input id="picker-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by file name, e.g. ashton" className={`${inputClass} pl-9`} />
          </div>
          {library.length === 0 ? (
            <p className="text-sm text-zinc-500">No photos match.</p>
          ) : (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {library.map((url) => (
                <li key={url}>
                  <button type="button" onClick={() => pick(url)} className="group flex w-full flex-col gap-1 rounded-lg p-1 text-left ring-1 ring-zinc-200 hover:ring-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-900">
                    <span className="relative block aspect-square overflow-hidden rounded-md bg-zinc-100">
                      <Image src={url} alt="" width={160} height={160} sizes="160px" className="size-full object-contain" />
                    </span>
                    <span className="truncate text-[11px] text-zinc-500">{fileName(url)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Sheet>
  )
}

/** A small preview of a chosen photo (or an empty box). */
export function Thumb({ url, size = 64 }: { url: string; size?: number }) {
  return (
    <span className="relative block shrink-0 overflow-hidden rounded-md bg-zinc-100 ring-1 ring-zinc-200" style={{ width: size, height: size }}>
      {url ? <Image src={url} alt="" width={size * 2} height={size * 2} sizes={`${size}px`} className="size-full object-contain" /> : null}
    </span>
  )
}
