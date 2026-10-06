import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeftIcon } from '@phosphor-icons/react/ssr'
import { CategoryForm, CollectionForm, DeleteBlock, RangeForm, TypeForm, type StructureKind } from '@/components/admin/StructureForms'
import { loadImageLibrary, loadStructure } from '@/lib/admin/load-catalogue'
import {
  categoryDraftFromRow,
  collectionDraftFromRow,
  descendantsOf,
  emptyCategoryDraft,
  emptyCollectionDraft,
  emptyRangeDraft,
  emptyTypeDraft,
  rangeDraftFromRow,
  typeDraftFromRow,
} from '@/lib/admin/structure-form'

export const metadata: Metadata = { title: 'Catalogue structure' }
export const dynamic = 'force-dynamic'

const KINDS: Record<StructureKind, { one: string }> = {
  types: { one: 'product type' },
  categories: { one: 'category' },
  ranges: { one: 'range' },
  fabrics: { one: 'collection' },
}

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`

export default async function StructureItemPage({ params, searchParams }: { params: Promise<{ kind: string; id: string }>; searchParams: Promise<{ saved?: string; parent?: string }> }) {
  const [{ kind: rawKind, id }, { saved, parent }] = await Promise.all([params, searchParams])
  if (!(rawKind in KINDS)) notFound()
  const kind = rawKind as StructureKind
  const isNew = id === 'new'
  const structure = await loadStructure()
  const formKey = saved ?? 'initial'
  const savedNote = Boolean(saved)

  let title: string
  let form: React.ReactNode
  let remove: React.ReactNode = null

  if (kind === 'types') {
    const row = structure.types.find((t) => t.id === id)
    if (!isNew && !row) notFound()
    title = row ? row.name : 'New product type'
    form = <TypeForm key={formKey} initial={row ? typeDraftFromRow(row) : emptyTypeDraft()} savedNote={savedNote} />
    if (row) remove = <DeleteBlock id={row.id} kind={kind} name={row.name} blockedBy={row.products ? `${plural(row.products, 'product')} use this type. Move them to another type first.` : null} />
  } else if (kind === 'categories') {
    const row = structure.categories.find((c) => c.id === id)
    if (!isNew && !row) notFound()
    title = row ? row.name : 'New category'
    const blocked = row ? descendantsOf(structure.categories, row.id) : new Set<string>()
    const parents = structure.categories.map((c) => ({ id: c.id, name: c.name, depth: c.depth, disabled: blocked.has(c.id) }))
    const library = await loadImageLibrary()
    const startParent = parent && structure.categories.some((c) => c.id === parent) ? parent : ''
    form = <CategoryForm key={formKey} initial={row ? categoryDraftFromRow(row) : emptyCategoryDraft(startParent)} parents={parents} library={library} savedNote={savedNote} />
    if (row) {
      const reason = row.children
        ? `It has ${plural(row.children, 'category')} inside it. Move or delete those first, or hide this one.`
        : row.primaryFor
          ? `It’s the main category of ${plural(row.primaryFor, 'product')}. Change those first, or hide this one.`
          : null
      remove = <DeleteBlock id={row.id} kind={kind} name={row.name} blockedBy={reason} />
    }
  } else if (kind === 'ranges') {
    const row = structure.ranges.find((r) => r.id === id)
    if (!isNew && !row) notFound()
    title = row ? row.name : 'New range'
    form = <RangeForm key={formKey} initial={row ? rangeDraftFromRow(row) : emptyRangeDraft()} savedNote={savedNote} />
    if (row) remove = <DeleteBlock id={row.id} kind={kind} name={row.name} blockedBy={row.products ? `${plural(row.products, 'product')} are in this range. Take them out first, or hide the range.` : null} />
  } else {
    const row = structure.collections.find((c) => c.id === id)
    if (!isNew && !row) notFound()
    title = row ? row.name : 'New collection'
    const library = await loadImageLibrary()
    form = <CollectionForm key={formKey} initial={row ? collectionDraftFromRow(row) : emptyCollectionDraft()} library={library} savedNote={savedNote} />
    if (row) remove = <DeleteBlock id={row.id} kind={kind} name={row.name} blockedBy={null} />
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link href={`/admin/catalogue/structure#${kind}`} className="flex min-h-10 items-center gap-1.5 self-start text-sm font-semibold text-zinc-600">
          <ArrowLeftIcon aria-hidden="true" size={16} /> Structure
        </Link>
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{KINDS[kind].one}</p>
        <h1 className="font-display text-2xl font-bold tracking-tight lg:text-4xl">{title}</h1>
      </header>
      {form}
      {remove}
    </div>
  )
}
