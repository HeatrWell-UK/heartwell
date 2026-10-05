import { CategoryPage, categoryMetadata, type CategoryRouteProps } from '@/components/catalogue/CategoryPage'

// A department, e.g. /sofas. Any top-level category in the tree gets one.
export const generateMetadata = (props: CategoryRouteProps) => categoryMetadata(props)

export default function DepartmentPage(props: CategoryRouteProps) {
  return <CategoryPage {...props} />
}
