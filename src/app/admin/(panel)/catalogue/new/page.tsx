import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeftIcon } from '@phosphor-icons/react/ssr'
import { ProductForm } from '@/components/admin/ProductForm'
import { loadEditorOptions, loadProduct } from '@/lib/admin/load-catalogue'
import { copyDraft, draftFromRow, emptyDraft } from '@/lib/admin/catalogue-form'

export const metadata: Metadata = { title: 'New product' }
export const dynamic = 'force-dynamic'

export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ type?: string; copy?: string }> }) {
  const { type, copy } = await searchParams
  const options = await loadEditorOptions()
  const source = copy ? await loadProduct(copy) : null
  const fieldsOf = (slug: string) => options.types.find((t) => t.slug === slug)?.fields ?? []
  const initial = source
    ? copyDraft(draftFromRow(source, fieldsOf(source.type?.slug ?? '')))
    : emptyDraft(options.types.find((t) => t.slug === type)?.slug ?? options.types[0]?.slug ?? '')

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link href="/admin/catalogue" className="flex min-h-10 items-center gap-1.5 self-start text-sm font-semibold text-zinc-600">
          <ArrowLeftIcon aria-hidden="true" size={16} /> Catalogue
        </Link>
        <h1 className="font-display text-2xl font-bold tracking-tight lg:text-4xl">{source ? `Copy of ${source.title}` : 'New product'}</h1>
        <p className="text-[15px] text-zinc-600">
          {source
            ? 'Everything is copied except the SKUs. It starts hidden, so nothing shows in the shop until you tick “Shown in the shop”.'
            : 'Choose the type first: it decides the Specifications fields. A new kind of product (a coffee table, a bed) needs its type adding under Structure first.'}
        </p>
      </header>
      <ProductForm initial={initial} options={options} />
    </div>
  )
}
