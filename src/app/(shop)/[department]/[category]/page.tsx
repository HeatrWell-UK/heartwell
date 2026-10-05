import { CategoryPage, categoryMetadata, type CategoryRouteProps } from '@/components/catalogue/CategoryPage'

// A category within a department, e.g. /sofas/corner-sofas.
export const generateMetadata = (props: CategoryRouteProps) => categoryMetadata(props)

export default function CategoryRoute(props: CategoryRouteProps) {
  return <CategoryPage {...props} />
}
