import { CategoryPage, categoryMetadata, categoryParams, type CategoryRouteProps } from '@/components/catalogue/CategoryPage'

// A category within a department, e.g. /sofas/corner-sofas. Cached and rebuilt
// at most every five minutes (audit A4); one added later is built on its first visit.
export const revalidate = 300
export const generateStaticParams = () => categoryParams('category')

export const generateMetadata = (props: CategoryRouteProps) => categoryMetadata(props)

export default function CategoryRoute(props: CategoryRouteProps) {
  return <CategoryPage {...props} />
}
