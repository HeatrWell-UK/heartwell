import type { Metadata } from 'next'
import { SavedView } from './SavedView'

export const metadata: Metadata = {
  title: 'Saved sofas',
  robots: { index: false, follow: false },
}

export default function SavedPage() {
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 pb-16 pt-6 lg:px-6 lg:pt-10">
      <h1 className="text-[32px] leading-tight lg:text-[40px]">Saved sofas</h1>
      <SavedView />
    </div>
  )
}
