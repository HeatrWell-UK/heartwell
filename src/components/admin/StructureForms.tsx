'use client'

// Editors for the catalogue's structure: product types (their Specifications
// fields and filters), categories, ranges, and fabric/material collections.

import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDownIcon, ArrowUpIcon, ImageIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react'
import { SPEC_KINDS, slugify } from '@/lib/admin/catalogue-form'
import {
  checkCategory,
  checkCollection,
  checkRange,
  checkType,
  emptyMaterial,
  emptySpecField,
  FILTER_OPTIONS,
  filtersWithoutFields,
  MATERIAL_KIND_LABEL,
  MATERIAL_KINDS,
  REMOVAL_UNITS,
  SPEC_KIND_LABEL,
  type CategoryDraft,
  type CollectionDraft,
  type MaterialDraft,
  type RangeDraft,
  type SpecFieldDraft,
  type TypeDraft,
} from '@/lib/admin/structure-form'
import {
  deleteCategory,
  deleteCollection,
  deleteProductType,
  deleteRange,
  saveCategory,
  saveCollection,
  saveProductType,
  saveRange,
  type StructureResult,
} from '@/app/admin/(panel)/catalogue/structure/actions'
import { cn } from '@/lib/cn'
import { Card, dangerButton, inputClass, labelClass, SaveBar, secondaryButton, SelectField, TextArea, TextField, Toggle, type Outcome } from './Fields'
import { ImagePicker, Thumb } from './ImagePicker'

export type StructureKind = 'types' | 'categories' | 'ranges' | 'fabrics'

interface ImageLibrary {
  images: string[]
  uploads: boolean
}

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item!)
  return next
}

const UNREACHABLE: StructureResult = { ok: false, message: 'Couldn’t reach the server. Try again.' }

/** Shared save flow: check in the browser, save on the server, then reload the page's data. */
function useSave<D extends { id: string | null }>(kind: StructureKind, check: (d: D) => string[], save: (d: D) => Promise<StructureResult>) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [outcome, setOutcome] = useState<Outcome>(null)
  async function run(draft: D) {
    const problems = check(draft)
    if (problems.length) return setOutcome({ ok: false, message: problems[0]!, problems })
    setSaving(true)
    setOutcome(null)
    const r = await save(draft).catch(() => UNREACHABLE)
    setSaving(false)
    if (!r.ok) return setOutcome(r)
    router.replace(`/admin/catalogue/structure/${kind}/${r.id}?saved=${Date.now()}`, { scroll: !draft.id })
  }
  return { saving, outcome, setOutcome, run }
}

function MoveButtons({ index, length, onMove, name }: { index: number; length: number; onMove: (to: number) => void; name: string }) {
  return (
    <div className="flex gap-1">
      <button type="button" aria-label={`Move ${name} up`} disabled={index === 0} onClick={() => onMove(index - 1)} className="flex size-10 items-center justify-center rounded-lg ring-1 ring-zinc-200 disabled:opacity-30">
        <ArrowUpIcon aria-hidden="true" size={16} />
      </button>
      <button type="button" aria-label={`Move ${name} down`} disabled={index === length - 1} onClick={() => onMove(index + 1)} className="flex size-10 items-center justify-center rounded-lg ring-1 ring-zinc-200 disabled:opacity-30">
        <ArrowDownIcon aria-hidden="true" size={16} />
      </button>
    </div>
  )
}

/** Delete, or the reason it can't be deleted yet. */
export function DeleteBlock({ id, kind, name, blockedBy }: { id: string; kind: StructureKind; name: string; blockedBy: string | null }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [outcome, setOutcome] = useState<Outcome>(null)
  const action = { types: deleteProductType, categories: deleteCategory, ranges: deleteRange, fabrics: deleteCollection }[kind]
  return (
    <section aria-labelledby="delete-title" className="flex flex-col gap-3 rounded-xl border border-red-200 bg-white p-4 sm:p-5">
      <h2 id="delete-title" className="text-lg font-bold text-red-900">
        Delete
      </h2>
      {blockedBy ? (
        <p className="text-sm text-zinc-700">{blockedBy}</p>
      ) : (
        <button
          type="button"
          disabled={busy}
          className={cn(dangerButton, 'self-start')}
          onClick={async () => {
            if (!window.confirm(`Delete ${name}? This can’t be undone.`)) return
            setBusy(true)
            const r = await action(id).catch(() => UNREACHABLE)
            setBusy(false)
            if (!r.ok) return setOutcome(r)
            router.push(`/admin/catalogue/structure?deleted=${encodeURIComponent(name)}`)
          }}
        >
          <TrashIcon aria-hidden="true" size={16} /> Delete {name}
        </button>
      )}
      {outcome && !outcome.ok && (
        <p role="alert" className="text-sm font-semibold text-red-800">
          {outcome.message}
        </p>
      )}
    </section>
  )
}

function CheckboxGroup({ legend, hint, options, values, onChange }: { legend: string; hint?: ReactNode; options: { value: string; label: string }[]; values: string[]; onChange: (v: string[]) => void }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className={cn(labelClass, 'mb-1')}>{legend}</legend>
      {hint && <p className="-mt-1 text-xs text-zinc-500">{hint}</p>}
      <div className="grid gap-1 sm:grid-cols-2">
        {options.map((o) => (
          <label key={o.value} className="flex min-h-10 items-center gap-2.5 rounded-lg px-2 text-sm hover:bg-zinc-50">
            <input type="checkbox" className="size-5 accent-zinc-900" checked={values.includes(o.value)} onChange={(e) => onChange(e.target.checked ? [...values, o.value] : values.filter((v) => v !== o.value))} />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

// Product types ---------------------------------------------------------------

export function TypeForm({ initial, savedNote }: { initial: TypeDraft; savedNote: boolean }) {
  const [d, setD] = useState(initial)
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id))
  const { saving, outcome, run } = useSave<TypeDraft>('types', checkType, saveProductType)
  const set = (patch: Partial<TypeDraft>) => setD((x) => ({ ...x, ...patch }))
  const setField = (rowKey: string, patch: Partial<SpecFieldDraft>) => set({ specFields: d.specFields.map((f) => (f.rowKey === rowKey ? { ...f, ...patch } : f)) })
  const unmatched = filtersWithoutFields(d)
  const keyFrom = (label: string) => slugify(label).replace(/-/g, '_').replace(/^[^a-z]+/, '').slice(0, 40)

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        void run(d)
      }}
    >
      <Card title="Name">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Name" value={d.name} maxLength={60} onChange={(name) => set({ name, ...(slugTouched ? {} : { slug: slugify(name) }) })} hint="One of them, e.g. Coffee table." />
          <TextField label="Plural" value={d.namePlural} maxLength={60} onChange={(namePlural) => set({ namePlural })} hint="e.g. Coffee tables." />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Short name"
            value={d.slug}
            disabled={Boolean(d.id)}
            maxLength={60}
            autoCapitalize="none"
            spellCheck={false}
            onChange={(slug) => {
              setSlugTouched(true)
              set({ slug: slug.toLowerCase() })
            }}
            hint={d.id ? 'Fixed once the type exists.' : 'Used inside the system, e.g. coffee-table.'}
          />
          <TextField label="Order" value={d.sort} inputMode="numeric" onChange={(sort) => set({ sort: sort.replace(/\D/g, '').slice(0, 4) })} hint="Lower numbers first in lists." />
        </div>
      </Card>

      <Card title="Specifications fields" intro="What every product of this type records, shown to customers in its Specifications panel. Words, numbers or yes/no.">
        {d.specFields.map((f, i) => (
          <div key={f.rowKey} className="flex flex-col gap-3 rounded-lg bg-zinc-50 p-3 ring-1 ring-zinc-200">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold">{f.label || `Field ${i + 1}`}</p>
              <MoveButtons index={i} length={d.specFields.length} name={f.label || `field ${i + 1}`} onMove={(to) => set({ specFields: move(d.specFields, i, to) })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <TextField label="Label" value={f.label} maxLength={60} onChange={(label) => setField(f.rowKey, { label, ...(f.key === '' || f.key === keyFrom(f.label) ? { key: keyFrom(label) } : {}) })} hint="What customers read." />
              <TextField label="Key" value={f.key} maxLength={40} autoCapitalize="none" spellCheck={false} onChange={(key) => setField(f.rowKey, { key: key.toLowerCase() })} hint="Stored name, e.g. top_material." />
              <SelectField label="Kind" value={f.kind} onChange={(kind) => setField(f.rowKey, { kind: kind as SpecFieldDraft['kind'] })} options={SPEC_KINDS.map((k) => ({ value: k, label: SPEC_KIND_LABEL[k] }))} />
            </div>
            {f.kind === 'text' && <TextField label="Fixed choices (optional)" value={f.options} maxLength={600} onChange={(options) => setField(f.rowKey, { options })} hint="Separated by commas, e.g. Round, Square, Rectangular. Leave blank for free text." />}
            <button type="button" onClick={() => set({ specFields: d.specFields.filter((x) => x.rowKey !== f.rowKey) })} className="flex min-h-10 items-center gap-1.5 self-start text-sm font-semibold text-red-700">
              <TrashIcon aria-hidden="true" size={16} /> Remove field
            </button>
          </div>
        ))}
        <button type="button" onClick={() => set({ specFields: [...d.specFields, emptySpecField()] })} className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 text-sm font-semibold text-zinc-700">
          <PlusIcon aria-hidden="true" size={16} weight="bold" /> Add a field
        </button>
        {d.id && <p className="text-xs text-zinc-500">Renaming a key or removing a field hides that detail on existing products; the stored value is kept, never deleted.</p>}
      </Card>

      <Card title="Shopping">
        <CheckboxGroup
          legend="Filters on its category pages"
          hint="Price, colour, width and made to order work for anything. Shape, seats, material and reclining read the Specifications fields with those keys."
          options={FILTER_OPTIONS.map((f) => ({ value: f.key, label: f.label }))}
          values={d.filters}
          onChange={(filters) => set({ filters })}
        />
        {unmatched.length > 0 && <p className="text-sm text-amber-800">No field for: {unmatched.join(', ')}. Those filters won’t find anything until a field with that key is added.</p>}
        <CheckboxGroup
          legend="Materials customers can choose (made to order)"
          hint="Which collections in the fabric library apply. Leave all unticked if it can’t be made in another material."
          options={MATERIAL_KINDS.map((k) => ({ value: k, label: MATERIAL_KIND_LABEL[k] }))}
          values={d.materialKinds}
          onChange={(materialKinds) => set({ materialKinds })}
        />
        <SelectField label="Taking the old one away" value={d.removalUnit} onChange={(v) => set({ removalUnit: v as TypeDraft['removalUnit'] })} options={REMOVAL_UNITS.map((u) => ({ value: u.value, label: u.label }))} />
      </Card>

      <Card title="Google and Meta" intro="The category their shopping catalogues file it under (Phase 15 feeds). Use Google’s product taxonomy wording.">
        <TextField label="Google product category" value={d.googleCategory} maxLength={200} onChange={(googleCategory) => set({ googleCategory })} hint="e.g. Furniture > Tables > Coffee Tables" />
        <TextField label="Meta product category" value={d.metaCategory} maxLength={200} onChange={(metaCategory) => set({ metaCategory })} hint="Usually the same." />
      </Card>

      <SaveBar saving={saving} label={d.id ? 'Save type' : 'Create type'} outcome={outcome ?? (savedNote ? { ok: true, message: 'Saved.' } : null)} />
    </form>
  )
}

// Categories -------------------------------------------------------------------

export function CategoryForm({
  initial,
  parents,
  library,
  savedNote,
}: {
  initial: CategoryDraft
  parents: { id: string; name: string; depth: number; disabled: boolean }[]
  library: ImageLibrary
  savedNote: boolean
}) {
  const [d, setD] = useState(initial)
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id))
  const [picking, setPicking] = useState(false)
  const { saving, outcome, run } = useSave<CategoryDraft>('categories', checkCategory, saveCategory)
  const set = (patch: Partial<CategoryDraft>) => setD((x) => ({ ...x, ...patch }))

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        void run(d)
      }}
    >
      <Card title="Category">
        <TextField label="Name" value={d.name} maxLength={80} onChange={(name) => set({ name, ...(slugTouched ? {} : { slug: slugify(name) }) })} hint="As it appears in the menu, e.g. Coffee Tables." />
        <TextField
          label="Web address"
          value={d.slug}
          maxLength={80}
          autoCapitalize="none"
          spellCheck={false}
          onChange={(slug) => {
            setSlugTouched(true)
            set({ slug: slug.toLowerCase().replace(/\s+/g, '-') })
          }}
          hint={d.id ? 'Part of the page address. Changing it breaks old links and ads.' : 'Filled in from the name.'}
        />
        <SelectField
          label="Sits inside"
          value={d.parentId}
          onChange={(parentId) => set({ parentId })}
          options={[{ value: '', label: 'Nothing: a top-level department in the menu' }, ...parents.map((p) => ({ value: p.id, label: `${'— '.repeat(p.depth)}${p.name}`, disabled: p.disabled }))]}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Order" value={d.sort} inputMode="numeric" onChange={(sort) => set({ sort: sort.replace(/\D/g, '').slice(0, 4) })} hint="Lower numbers first in the menu." />
          <div className="flex items-end pb-2">
            <Toggle label="Shown in the shop" checked={d.isActive} onChange={(isActive) => set({ isActive })} />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className={labelClass}>Photo</span>
          <div className="flex items-center gap-3">
            <Thumb url={d.imageUrl} size={72} />
            <button type="button" onClick={() => setPicking(true)} className={secondaryButton}>
              <ImageIcon aria-hidden="true" size={18} /> {d.imageUrl ? 'Change' : 'Choose'}
            </button>
            {d.imageUrl && (
              <button type="button" onClick={() => set({ imageUrl: '' })} className="text-sm font-semibold text-zinc-600 underline underline-offset-2">
                Remove
              </button>
            )}
          </div>
          <p className="text-xs text-zinc-500">Optional. Not shown in the shop yet.</p>
        </div>
      </Card>
      <Card title="Words">
        <TextArea label="Introduction" value={d.description} rows={6} maxLength={4000} onChange={(description) => set({ description })} hint="Shown on the category page. Leave a blank line between paragraphs." />
        <TextField label="Search title" value={d.seoTitle} maxLength={120} placeholder={d.name} onChange={(seoTitle) => set({ seoTitle })} />
        <TextArea label="Search description" value={d.seoDescription} rows={3} maxLength={320} onChange={(seoDescription) => set({ seoDescription })} />
      </Card>
      <SaveBar saving={saving} label={d.id ? 'Save category' : 'Create category'} outcome={outcome ?? (savedNote ? { ok: true, message: 'Saved. The menu and pages update on the next visit.' } : null)} />
      <ImagePicker open={picking} onClose={() => setPicking(false)} onPick={(imageUrl) => set({ imageUrl })} images={library.images} uploads={library.uploads} first={[d.imageUrl]} title="Category photo" />
    </form>
  )
}

// Ranges -----------------------------------------------------------------------

export function RangeForm({ initial, savedNote }: { initial: RangeDraft; savedNote: boolean }) {
  const [d, setD] = useState(initial)
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id))
  const { saving, outcome, run } = useSave<RangeDraft>('ranges', checkRange, saveRange)
  const set = (patch: Partial<RangeDraft>) => setD((x) => ({ ...x, ...patch }))

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        void run(d)
      }}
    >
      <Card title="Range" intro="A family of products offered as sizes and styles of each other, e.g. Ashton in 2, 3 and 4 seats.">
        <TextField label="Name" value={d.name} maxLength={80} onChange={(name) => set({ name, ...(slugTouched ? {} : { slug: slugify(name) }) })} />
        <TextField
          label="Web address"
          prefix="/ranges/"
          value={d.slug}
          maxLength={80}
          autoCapitalize="none"
          spellCheck={false}
          onChange={(slug) => {
            setSlugTouched(true)
            set({ slug: slug.toLowerCase().replace(/\s+/g, '-') })
          }}
          hint={d.id ? 'Changing it breaks old links.' : 'Filled in from the name.'}
        />
        <TextField label="Trade name (staff only)" value={d.tradeName} maxLength={120} onChange={(tradeName) => set({ tradeName })} hint="What the warehouse and OrderFlow call it, if different." />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="First option is called" value={d.axis1Name} maxLength={40} onChange={(axis1Name) => set({ axis1Name })} hint="Usually Size." />
          <TextField label="Second option is called" value={d.axis2Name} maxLength={40} onChange={(axis2Name) => set({ axis2Name })} hint="Optional, e.g. Back style." />
        </div>
        <TextArea label="Description" value={d.description} rows={4} maxLength={2000} onChange={(description) => set({ description })} hint="Optional. Not shown in the shop yet." />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Order" value={d.sort} inputMode="numeric" onChange={(sort) => set({ sort: sort.replace(/\D/g, '').slice(0, 4) })} />
          <div className="flex items-end pb-2">
            <Toggle label="Shown in the shop" checked={d.isActive} onChange={(isActive) => set({ isActive })} />
          </div>
        </div>
      </Card>
      <SaveBar saving={saving} label={d.id ? 'Save range' : 'Create range'} outcome={outcome ?? (savedNote ? { ok: true, message: 'Saved.' } : null)} />
    </form>
  )
}

// Fabric and material collections ----------------------------------------------

export function CollectionForm({ initial, library, savedNote }: { initial: CollectionDraft; library: ImageLibrary; savedNote: boolean }) {
  const [d, setD] = useState(initial)
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id))
  const [picking, setPicking] = useState<string | null>(null)
  const { saving, outcome, run } = useSave<CollectionDraft>('fabrics', checkCollection, saveCollection)
  const set = (patch: Partial<CollectionDraft>) => setD((x) => ({ ...x, ...patch }))
  const setMaterial = (rowKey: string, patch: Partial<MaterialDraft>) => set({ materials: d.materials.map((m) => (m.rowKey === rowKey ? { ...m, ...patch } : m)) })

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        void run(d)
      }}
    >
      <Card title="Collection" intro="A family of fabrics or materials customers can choose for made-to-order pieces.">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Name" value={d.name} maxLength={80} onChange={(name) => set({ name, ...(slugTouched ? {} : { slug: slugify(name) }) })} hint="e.g. Plush Velvet." />
          <TextField
            label="Short name"
            value={d.slug}
            maxLength={80}
            autoCapitalize="none"
            spellCheck={false}
            onChange={(slug) => {
              setSlugTouched(true)
              set({ slug: slug.toLowerCase().replace(/\s+/g, '-') })
            }}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Kind" value={d.kind} onChange={(k) => set({ kind: k as CollectionDraft['kind'] })} options={MATERIAL_KINDS.map((k) => ({ value: k, label: MATERIAL_KIND_LABEL[k] }))} hint="Product types list the kinds they can be made in." />
          <TextField label="Extra charge" prefix="£" value={d.surcharge} inputMode="decimal" onChange={(surcharge) => set({ surcharge })} hint="Added to the price when chosen. 0 for none." />
        </div>
        <TextField label="Supplier (staff only)" value={d.supplier} maxLength={120} onChange={(supplier) => set({ supplier })} />
        <TextArea label="Description" value={d.description} rows={3} maxLength={1000} onChange={(description) => set({ description })} hint="Optional. Not shown in the shop yet." />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Order" value={d.sort} inputMode="numeric" onChange={(sort) => set({ sort: sort.replace(/\D/g, '').slice(0, 4) })} />
          <div className="flex items-end pb-2">
            <Toggle label="Shown in the shop" checked={d.isActive} onChange={(isActive) => set({ isActive })} />
          </div>
        </div>
      </Card>

      <Card title="Colours" intro="Removing a colour deletes it; orders keep their own copy of its name and code. Untick Shown to retire one instead.">
        {d.materials.map((m, i) => (
          <div key={m.rowKey} className={cn('flex flex-col gap-3 rounded-lg p-3 ring-1 ring-zinc-200', m.isActive ? 'bg-zinc-50' : 'bg-zinc-100 opacity-80')}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="size-8 rounded-full ring-1 ring-black/10" style={{ backgroundColor: /^#[0-9A-Fa-f]{6}$/.test(m.hex) ? m.hex : undefined }} aria-hidden="true" />
                <p className="text-sm font-bold">{m.name || `Colour ${i + 1}`}</p>
              </div>
              <MoveButtons index={i} length={d.materials.length} name={m.name || `colour ${i + 1}`} onMove={(to) => set({ materials: move(d.materials, i, to) })} />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <TextField label="Code" value={m.code} maxLength={40} autoCapitalize="characters" spellCheck={false} onChange={(code) => setMaterial(m.rowKey, { code })} />
              <TextField label="Name" value={m.name} maxLength={80} onChange={(name) => setMaterial(m.rowKey, { name })} />
              <div className="col-span-2 flex flex-col gap-1">
                <label htmlFor={`${m.rowKey}-hex`} className={labelClass}>
                  Colour
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    aria-label="Pick the colour"
                    value={/^#[0-9A-Fa-f]{6}$/.test(m.hex) ? m.hex : '#cccccc'}
                    onChange={(e) => setMaterial(m.rowKey, { hex: e.target.value.toUpperCase() })}
                    className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-zinc-300 bg-white p-1"
                  />
                  <input id={`${m.rowKey}-hex`} value={m.hex} placeholder="#8A8D8F" onChange={(e) => setMaterial(m.rowKey, { hex: e.target.value.trim() })} className={inputClass} />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Thumb url={m.imageUrl} size={48} />
              <button type="button" onClick={() => setPicking(m.rowKey)} className={secondaryButton}>
                <ImageIcon aria-hidden="true" size={18} /> {m.imageUrl ? 'Change swatch photo' : 'Add swatch photo'}
              </button>
              {m.imageUrl && (
                <button type="button" onClick={() => setMaterial(m.rowKey, { imageUrl: '' })} className="text-sm font-semibold text-zinc-600 underline underline-offset-2">
                  Remove
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-3">
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <Toggle label="Shown" checked={m.isActive} onChange={(isActive) => setMaterial(m.rowKey, { isActive })} />
                <Toggle label="Can be sent as a sample" checked={m.isSwatchable} onChange={(isSwatchable) => setMaterial(m.rowKey, { isSwatchable })} />
              </div>
              <button type="button" onClick={() => set({ materials: d.materials.filter((x) => x.rowKey !== m.rowKey) })} className="flex min-h-10 items-center gap-1.5 text-sm font-semibold text-red-700">
                <TrashIcon aria-hidden="true" size={16} /> Delete colour
              </button>
            </div>
          </div>
        ))}
        <button type="button" onClick={() => set({ materials: [...d.materials, emptyMaterial()] })} className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 text-sm font-semibold text-zinc-700">
          <PlusIcon aria-hidden="true" size={16} weight="bold" /> Add a colour
        </button>
      </Card>

      <SaveBar saving={saving} label={d.id ? 'Save collection' : 'Create collection'} outcome={outcome ?? (savedNote ? { ok: true, message: 'Saved.' } : null)} />
      <ImagePicker
        open={picking !== null}
        onClose={() => setPicking(null)}
        onPick={(imageUrl) => picking && setMaterial(picking, { imageUrl })}
        images={library.images}
        uploads={library.uploads}
        first={d.materials.map((m) => m.imageUrl)}
        title="Swatch photo"
      />
    </form>
  )
}
