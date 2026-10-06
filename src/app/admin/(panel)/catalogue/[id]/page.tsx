import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeftIcon, ArrowSquareOutIcon, CopyIcon } from '@phosphor-icons/react/ssr'
import { ProductForm } from '@/components/admin/ProductForm'
import { ProductDangerZone } from '@/components/admin/ProductDangerZone'
import { loadEditorOptions, loadProduct } from '@/lib/admin/load-catalogue'
import { draftFromRow, savedNote } from '@/lib/admin/catalogue-form'

export const metadata: Metadata = { title: 'Edit product' }
export const dynamic = 'force-dynamic'

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; removed?: string; hidden?: string }> }) {
  const [{ id }, { saved, removed, hidden }] = await Promise.all([params, searchParams])
  const [product, options] = await Promise.all([loadProduct(id), loadEditorOptions()])
  if (!product) notFound()
  const fields = options.types.find((t) => t.slug === product.type?.slug)?.fields ?? []

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link href="/admin/catalogue" className="flex min-h-10 items-center gap-1.5 self-start text-sm font-semibold text-zinc-600">
          <ArrowLeftIcon aria-hidden="true" size={16} /> Catalogue
        </Link>
        <h1 className="font-display text-2xl font-bold tracking-tight lg:text-4xl">{product.title}</h1>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-zinc-700">
          {product.is_active ? (
            <a href={`/products/${product.slug}`} target="_blank" rel="noopener" className="flex min-h-10 items-center gap-1.5 underline underline-offset-2">
              View in the shop <ArrowSquareOutIcon aria-hidden="true" size={16} />
            </a>
          ) : (
            <span className="flex min-h-10 items-center text-zinc-500">Hidden from the shop</span>
          )}
          <Link href={`/admin/catalogue/new?copy=${product.id}`} className="flex min-h-10 items-center gap-1.5 underline underline-offset-2">
            <CopyIcon aria-hidden="true" size={16} /> Copy as a new product
          </Link>
        </div>
      </header>
      {/* Keyed by the last change, so after a save the form reloads what the database now holds. */}
      <ProductForm key={product.updated_at} initial={draftFromRow(product, fields)} options={options} orderedVariantIds={product.orderedVariantIds} savedNote={saved ? savedNote(Number(removed) || 0, Number(hidden) || 0) : null} />
      <ProductDangerZone id={product.id} title={product.title} isActive={product.is_active} orderCount={product.orderCount} />
    </div>
  )
}
