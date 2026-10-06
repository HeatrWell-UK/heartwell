'use client'

// The product editor: one form for every product type. The type decides the
// Specifications fields; everything else (sizes, colourways, photos, words,
// where it shows) is the same for a sofa or a coffee table.

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDownIcon, ArrowUpIcon, ImageIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react'
import {
  checkDraft,
  DIM_FIELDS,
  emptyVariant,
  OFFER_TIERS,
  ORIGINS,
  slugify,
  type DraftProblem,
  type ProductDraft,
  type SpecFieldDef,
  type VariantDraft,
} from '@/lib/admin/catalogue-form'
import type { EditorOptions } from '@/lib/admin/load-catalogue'
import { saveProduct } from '@/app/admin/(panel)/catalogue/actions'
import { cn } from '@/lib/cn'
import { Card, inputClass, labelClass, SaveBar, secondaryButton, SelectField, TextArea, TextField, Toggle, type Outcome } from './Fields'
import { ImagePicker, Thumb } from './ImagePicker'

const TIER_LABEL: Record<string, string> = { HIGH: 'High', MID: 'Mid', STANDARD: 'Standard', EXCLUDED: 'No offer' }

type PickerTarget = { kind: 'gallery' } | { kind: 'variant'; key: string } | null

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item!)
  return next
}

function Suggestions({ id, values }: { id: string; values: string[] | undefined }) {
  if (!values?.length) return null
  return (
    <datalist id={id}>
      {values.map((v) => (
        <option key={v} value={v} />
      ))}
    </datalist>
  )
}

function SpecInput({ field, value, onChange, suggestions, invalid }: { field: SpecFieldDef; value: string; onChange: (v: string) => void; suggestions?: string[]; invalid: boolean }) {
  if (field.options?.length) {
    const options = [...field.options, ...(value && !field.options.includes(value) ? [value] : [])]
    return <SelectField label={field.label} value={value} onChange={onChange} options={[{ value: '', label: 'Not set' }, ...options.map((o) => ({ value: o, label: o }))]} />
  }
  const listId = `spec-${field.key}-list`
  return (
    <>
      <TextField
        label={field.label}
        value={value}
        onChange={onChange}
        invalid={invalid}
        list={suggestions?.length ? listId : undefined}
        inputMode={field.kind === 'number' ? 'decimal' : undefined}
        autoComplete="off"
      />
      <Suggestions id={listId} values={suggestions} />
    </>
  )
}

export function ProductForm({
  initial,
  options,
  orderedVariantIds = [],
  savedNote = null,
}: {
  initial: ProductDraft
  options: EditorOptions
  orderedVariantIds?: string[]
  savedNote?: string | null
}) {
  const router = useRouter()
  const [draft, setDraft] = useState(initial)
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id))
  const [saving, setSaving] = useState(false)
  const [outcome, setOutcome] = useState<Outcome>(savedNote ? { ok: true, message: savedNote } : null)
  const [problems, setProblems] = useState<DraftProblem[]>([])
  const [picker, setPicker] = useState<PickerTarget>(null)

  const type = options.types.find((t) => t.slug === draft.productType)
  const fields = useMemo(() => type?.fields ?? [], [type])
  const range = options.ranges.find((r) => r.slug === draft.range)
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(initial), [draft, initial])
  const ordered = new Set(orderedVariantIds)

  // A gentle guard against losing unsaved changes by closing the tab.
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const set = (patch: Partial<ProductDraft>) => setDraft((d) => ({ ...d, ...patch }))
  const setVariant = (key: string, patch: Partial<VariantDraft>) => setDraft((d) => ({ ...d, variants: d.variants.map((v) => (v.key === key ? { ...v, ...patch } : v)) }))
  const invalid = (field: string) => problems.some((p) => p.field === field)

  const categoryOptions = options.categories.map((c) => ({ value: c.slug, label: `${'— '.repeat(c.depth)}${c.name}${c.is_active ? '' : ' (hidden)'}` }))
  const textFields = fields.filter((f) => f.kind === 'text' || f.kind === 'number')
  const flagFields = fields.filter((f) => f.kind === 'boolean')
  const piecesField = fields.find((f) => f.kind === 'pieces')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const local = checkDraft(draft, fields)
    setProblems(local)
    if (local.length) return setOutcome({ ok: false, message: local[0]!.message, problems: local })
    setSaving(true)
    setOutcome(null)
    const r = await saveProduct(draft).catch(() => ({ ok: false as const, message: 'Couldn’t reach the server. Try again.' }))
    setSaving(false)
    if (!r.ok) {
      setProblems('problems' in r && r.problems ? r.problems : [])
      return setOutcome(r)
    }
    // Reload from the database so new colourways get their ids and the form starts clean.
    router.replace(`/admin/catalogue/${r.id}?saved=${Date.now()}&removed=${r.removed}&hidden=${r.hidden}`, { scroll: !draft.id })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <Card title="The basics" id="basics">
        <TextField
          label="Name"
          value={draft.title}
          invalid={invalid('title')}
          maxLength={200}
          onChange={(title) => set({ title, ...(slugTouched ? {} : { slug: slugify(title) }) })}
          hint="As customers see it, e.g. Ashton 3 Seater Sofa."
        />
        <TextField
          label="Web address"
          prefix="/products/"
          value={draft.slug}
          invalid={invalid('slug')}
          maxLength={80}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onChange={(slug) => {
            setSlugTouched(true)
            set({ slug: slug.toLowerCase().replace(/\s+/g, '-') })
          }}
          hint={draft.id ? 'Changing it changes the page address; old links and ads stop working.' : 'Filled in from the name. Small letters, numbers and hyphens.'}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Product type"
            value={draft.productType}
            invalid={invalid('productType')}
            onChange={(productType) => set({ productType })}
            options={[...(type ? [] : [{ value: '', label: 'Choose…' }]), ...options.types.map((t) => ({ value: t.slug, label: t.name }))]}
            hint="Decides the Specifications fields and the filters it appears under."
          />
          <TextField label="Price" prefix="£" value={draft.basePrice} invalid={invalid('basePrice')} inputMode="decimal" onChange={(basePrice) => set({ basePrice })} hint="The price before any colourway difference." />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Range"
            value={draft.range}
            onChange={(r) => set({ range: r })}
            options={[{ value: '', label: 'Not in a range' }, ...options.ranges.map((r) => ({ value: r.slug, label: `${r.name}${r.is_active ? '' : ' (hidden)'}` }))]}
            hint="Products in one range are offered as sizes and styles of each other."
          />
          <SelectField
            label="Offer tier"
            value={draft.offerTier}
            onChange={(t) => set({ offerTier: t as ProductDraft['offerTier'] })}
            options={[...(draft.offerTier === '' ? [{ value: '', label: 'Not set (no offer)' }] : []), ...OFFER_TIERS.map((t) => ({ value: t, label: TIER_LABEL[t]! }))]}
            hint="How much an offer code takes off (amounts are in Settings)."
          />
        </div>
        {range && (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label={range.axis1_name} value={draft.axis1} invalid={invalid('axis1')} onChange={(axis1) => set({ axis1 })} list="axis1-list" autoComplete="off" hint="e.g. 3 Seater, Corner." />
            <Suggestions id="axis1-list" values={options.suggestions.axis1} />
            {range.axis2_name && (
              <>
                <TextField label={range.axis2_name} value={draft.axis2} onChange={(axis2) => set({ axis2 })} list="axis2-list" autoComplete="off" hint="Optional, e.g. High back." />
                <Suggestions id="axis2-list" values={options.suggestions.axis2} />
              </>
            )}
          </div>
        )}
        <TextField label="Trade name (staff only)" value={draft.tradeTitle} maxLength={200} onChange={(tradeTitle) => set({ tradeTitle })} hint="The name the warehouse and OrderFlow use, if different. Never shown to customers." />
      </Card>

      <Card title="Where it shows" id="shows">
        <SelectField
          label="Main category"
          value={draft.primaryCategory}
          onChange={(primaryCategory) => set({ primaryCategory, categories: draft.categories.filter((c) => c !== primaryCategory) })}
          options={[{ value: '', label: 'None' }, ...categoryOptions]}
          hint="Used for the breadcrumb and Google’s product category."
        />
        <fieldset className="flex flex-col gap-2">
          <legend className={cn(labelClass, 'mb-1')}>Also listed in</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {options.categories
              .filter((c) => c.slug !== draft.primaryCategory)
              .map((c) => (
                <label key={c.slug} className="flex min-h-10 items-center gap-2.5 rounded-lg px-2 text-sm hover:bg-zinc-50" style={{ paddingLeft: `${0.5 + c.depth * 1}rem` }}>
                  <input
                    type="checkbox"
                    className="size-5 accent-zinc-900"
                    checked={draft.categories.includes(c.slug)}
                    onChange={(e) => set({ categories: e.target.checked ? [...draft.categories, c.slug] : draft.categories.filter((x) => x !== c.slug) })}
                  />
                  {c.name}
                  {!c.is_active && <span className="text-xs text-zinc-400">(hidden)</span>}
                </label>
              ))}
          </div>
        </fieldset>
        <Toggle label="Shown in the shop" checked={draft.isActive} onChange={(isActive) => set({ isActive })} hint="Untick to hide it everywhere; orders and history are kept." />
        <Toggle label="Featured" checked={draft.isFeatured} onChange={(isFeatured) => set({ isFeatured })} hint="Listed first in its categories and in Popular now on the home page." />
        <TextField label="Order in lists" value={draft.sort} inputMode="numeric" className="max-w-40" onChange={(sort) => set({ sort: sort.replace(/\D/g, '').slice(0, 4) })} hint="Lower numbers first." />
      </Card>

      <Card title="Size" id="size" intro="In centimetres. Leave out what doesn’t apply.">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {DIM_FIELDS.map((d) => (
            <TextField
              key={d.key}
              label={d.label}
              suffix="cm"
              value={draft.dims[d.key]}
              invalid={invalid(`dims.${d.key}`)}
              inputMode="decimal"
              onChange={(v) => set({ dims: { ...draft.dims, [d.key]: v } })}
              hint={d.hint}
            />
          ))}
        </div>
        <TextField label="Size note" value={draft.dimensionsNote} maxLength={300} onChange={(dimensionsNote) => set({ dimensionsNote })} hint="Optional, e.g. Arms are 20 cm wide each." />
        {piecesField && (
          <fieldset className="flex flex-col gap-3">
            <legend className={cn(labelClass, 'mb-1')}>{piecesField.label}</legend>
            <p className="-mt-1 text-xs text-zinc-500">For sets: each piece’s own name and size (the measurements drawing uses the first two).</p>
            {draft.pieces.map((p, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 rounded-lg bg-zinc-50 p-3 ring-1 ring-zinc-200 sm:grid-cols-5">
                <TextField className="col-span-2" label={`Piece ${i + 1}`} value={p.label} invalid={invalid(`pieces.${i}`)} onChange={(label) => set({ pieces: draft.pieces.map((x, n) => (n === i ? { ...x, label } : x)) })} />
                {(['width', 'depth', 'height'] as const).map((k) => (
                  <TextField key={k} label={k[0]!.toUpperCase() + k.slice(1)} suffix="cm" inputMode="decimal" value={p[k]} onChange={(v) => set({ pieces: draft.pieces.map((x, n) => (n === i ? { ...x, [k]: v } : x)) })} />
                ))}
                <button type="button" onClick={() => set({ pieces: draft.pieces.filter((_, n) => n !== i) })} className="col-span-2 flex min-h-10 items-center gap-1.5 text-sm font-semibold text-red-700 sm:col-span-5">
                  <TrashIcon aria-hidden="true" size={16} /> Remove piece
                </button>
              </div>
            ))}
            {draft.pieces.length < 6 && (
              <button type="button" onClick={() => set({ pieces: [...draft.pieces, { label: '', width: '', depth: '', height: '' }] })} className={cn(secondaryButton, 'self-start')}>
                <PlusIcon aria-hidden="true" size={16} weight="bold" /> Add a piece
              </button>
            )}
          </fieldset>
        )}
      </Card>

      {(textFields.length > 0 || flagFields.length > 0) && (
        <Card title="Specifications" id="specs" intro={`The fields every ${type?.name.toLowerCase() ?? 'product'} has. Change the list under Catalogue → Structure.`}>
          {textFields.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {textFields.map((f) => (
                <SpecInput
                  key={f.key}
                  field={f}
                  value={typeof draft.specs[f.key] === 'string' ? (draft.specs[f.key] as string) : ''}
                  invalid={invalid(`specs.${f.key}`)}
                  suggestions={options.suggestions[`spec.${f.key}`]}
                  onChange={(v) => set({ specs: { ...draft.specs, [f.key]: v } })}
                />
              ))}
            </div>
          )}
          {flagFields.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {flagFields.map((f) => (
                <Toggle key={f.key} label={f.label} checked={draft.specs[f.key] === true} onChange={(v) => set({ specs: { ...draft.specs, [f.key]: v } })} />
              ))}
            </div>
          )}
        </Card>
      )}

      <Card title="Making" id="making">
        <SelectField label="Where it’s made" value={draft.origin} onChange={(o) => set({ origin: o as ProductDraft['origin'] })} options={ORIGINS.map((o) => ({ value: o.value, label: o.label }))} />
        <Toggle
          label="Made to order"
          checked={draft.madeToOrder}
          onChange={(madeToOrder) => set({ madeToOrder })}
          hint={
            type?.materialKinds.length
              ? `Customers can choose any ${type.materialKinds.join(' or ')} from the library, and are told it’s made for them.`
              : 'This type has no material library, so customers can’t choose a fabric; they’re still told it’s made for them.'
          }
        />
      </Card>

      <Card title="Colourways" id="colourways" intro="Each colour you sell, with the warehouse SKU. The first shown one is the default.">
        {draft.variants.map((v, i) => {
          const wasOrdered = v.id !== null && ordered.has(v.id)
          return (
            <div key={v.key} className={cn('flex flex-col gap-3 rounded-lg p-3 ring-1', v.isActive ? 'bg-zinc-50 ring-zinc-200' : 'bg-zinc-100 ring-zinc-200 opacity-80')}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-zinc-900">
                  {v.colourName || `Colourway ${i + 1}`}
                  {!v.isActive && <span className="ml-2 text-xs font-semibold text-zinc-500">Hidden</span>}
                </p>
                <div className="flex gap-1">
                  <button type="button" aria-label={`Move ${v.colourName || `colourway ${i + 1}`} up`} disabled={i === 0} onClick={() => set({ variants: move(draft.variants, i, i - 1) })} className="flex size-10 items-center justify-center rounded-lg text-zinc-700 ring-1 ring-zinc-200 disabled:opacity-30">
                    <ArrowUpIcon aria-hidden="true" size={16} />
                  </button>
                  <button type="button" aria-label={`Move ${v.colourName || `colourway ${i + 1}`} down`} disabled={i === draft.variants.length - 1} onClick={() => set({ variants: move(draft.variants, i, i + 1) })} className="flex size-10 items-center justify-center rounded-lg text-zinc-700 ring-1 ring-zinc-200 disabled:opacity-30">
                    <ArrowDownIcon aria-hidden="true" size={16} />
                  </button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField label="SKU" value={v.sku} invalid={invalid(`variants.${i}.sku`)} maxLength={40} autoCapitalize="characters" spellCheck={false} onChange={(sku) => setVariant(v.key, { sku })} hint={wasOrdered ? 'Ordered before: change only if the warehouse did.' : 'As the warehouse knows it.'} />
                <TextField label="Colour name" value={v.colourName} maxLength={80} onChange={(colourName) => setVariant(v.key, { colourName })} hint="e.g. Grey, Oatmeal." />
                <div className="flex flex-col gap-1">
                  <label htmlFor={`${v.key}-hex`} className={labelClass}>
                    Colour swatch
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      aria-label="Pick the swatch colour"
                      value={/^#[0-9A-Fa-f]{6}$/.test(v.colourHex) ? v.colourHex : '#cccccc'}
                      onChange={(e) => setVariant(v.key, { colourHex: e.target.value.toUpperCase() })}
                      className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-zinc-300 bg-white p-1"
                    />
                    <input id={`${v.key}-hex`} value={v.colourHex} placeholder="#8A8D8F" aria-invalid={invalid(`variants.${i}.colourHex`) || undefined} onChange={(e) => setVariant(v.key, { colourHex: e.target.value.trim() })} className={inputClass} />
                  </div>
                </div>
                <TextField label="Material" value={v.materialLabel} maxLength={80} onChange={(materialLabel) => setVariant(v.key, { materialLabel })} hint="Optional, e.g. Plush velvet." />
                <TextField label="Price difference" prefix="£" value={v.priceAdjustment} invalid={invalid(`variants.${i}.priceAdjustment`)} inputMode="decimal" onChange={(priceAdjustment) => setVariant(v.key, { priceAdjustment })} hint="0 for the same price; -20 for £20 less." />
                <div className="flex flex-col gap-1">
                  <span className={labelClass}>Photo</span>
                  <div className="flex items-center gap-3">
                    <Thumb url={v.imageUrl} />
                    <button type="button" onClick={() => setPicker({ kind: 'variant', key: v.key })} className={secondaryButton}>
                      <ImageIcon aria-hidden="true" size={18} /> {v.imageUrl ? 'Change' : 'Choose'}
                    </button>
                    {v.imageUrl && (
                      <button type="button" onClick={() => setVariant(v.key, { imageUrl: '' })} className="text-sm font-semibold text-zinc-600 underline underline-offset-2">
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-3">
                <Toggle label="Shown" checked={v.isActive} onChange={(isActive) => setVariant(v.key, { isActive })} />
                {wasOrdered ? (
                  <p className="text-xs text-zinc-500">Ordered before, so it can be hidden but not deleted.</p>
                ) : (
                  <button type="button" onClick={() => set({ variants: draft.variants.filter((x) => x.key !== v.key) })} className="flex min-h-10 items-center gap-1.5 text-sm font-semibold text-red-700">
                    <TrashIcon aria-hidden="true" size={16} /> Delete colourway
                  </button>
                )}
              </div>
            </div>
          )
        })}
        {invalid('variants') && <p className="text-sm font-semibold text-red-700">{problems.find((p) => p.field === 'variants')?.message}</p>}
        <button type="button" onClick={() => set({ variants: [...draft.variants, emptyVariant()] })} className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 text-sm font-semibold text-zinc-700">
          <PlusIcon aria-hidden="true" size={16} weight="bold" /> Add a colourway
        </button>
      </Card>

      <Card title="Photos" id="photos" intro="Extra photos for the gallery, after the colourway’s own photo. The first one also leads in lists when a colourway has no photo.">
        {draft.gallery.length > 0 && (
          <ul className="flex flex-col gap-2">
            {draft.gallery.map((url, i) => (
              <li key={url} className="flex items-center gap-3 rounded-lg bg-zinc-50 p-2 ring-1 ring-zinc-200">
                <Thumb url={url} size={56} />
                <span className="min-w-0 flex-1 truncate text-xs text-zinc-500">{decodeURIComponent(url.split('/').pop() ?? '')}</span>
                <button type="button" aria-label={`Move photo ${i + 1} up`} disabled={i === 0} onClick={() => set({ gallery: move(draft.gallery, i, i - 1) })} className="flex size-10 items-center justify-center rounded-lg ring-1 ring-zinc-200 disabled:opacity-30">
                  <ArrowUpIcon aria-hidden="true" size={16} />
                </button>
                <button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => set({ gallery: draft.gallery.filter((x) => x !== url) })} className="flex size-10 items-center justify-center rounded-lg text-red-700 ring-1 ring-zinc-200">
                  <TrashIcon aria-hidden="true" size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
        {invalid('gallery') && <p className="text-sm font-semibold text-red-700">{problems.find((p) => p.field === 'gallery')?.message}</p>}
        {draft.gallery.length < 20 && (
          <button type="button" onClick={() => setPicker({ kind: 'gallery' })} className={cn(secondaryButton, 'self-start')}>
            <PlusIcon aria-hidden="true" size={16} weight="bold" /> Add a photo
          </button>
        )}
      </Card>

      <Card title="Words" id="words">
        <TextArea label="Description" value={draft.description} rows={8} maxLength={8000} onChange={(description) => set({ description })} hint="Plain text. Leave a blank line between paragraphs." />
        <TextArea label="Highlights" value={draft.highlights} rows={4} onChange={(highlights) => set({ highlights })} hint="One per line, shown as short points." />
        <TextField label="Search title" value={draft.seoTitle} maxLength={120} placeholder={draft.title} onChange={(seoTitle) => set({ seoTitle })} hint="Optional. What Google shows; the name is used when blank." />
        <TextArea label="Search description" value={draft.seoDescription} rows={3} maxLength={320} onChange={(seoDescription) => set({ seoDescription })} hint="Optional. One or two sentences for Google and link previews." />
      </Card>

      <SaveBar saving={saving} label={draft.id ? 'Save changes' : 'Create product'} outcome={outcome}>
        {dirty && !saving && <span className="text-sm text-amber-800">Unsaved changes</span>}
      </SaveBar>

      <ImagePicker
        open={picker !== null}
        onClose={() => setPicker(null)}
        images={options.images}
        uploads={options.uploads}
        first={[...draft.gallery, ...draft.variants.map((v) => v.imageUrl)]}
        title={picker?.kind === 'gallery' ? 'Add a gallery photo' : 'Colourway photo'}
        onPick={(url) => {
          if (picker?.kind === 'gallery') set({ gallery: draft.gallery.includes(url) ? draft.gallery : [...draft.gallery, url] })
          else if (picker?.kind === 'variant') setVariant(picker.key, { imageUrl: url })
        }}
      />
    </form>
  )
}
