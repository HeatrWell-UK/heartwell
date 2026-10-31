import { CategoryPage, categoryMetadata, categoryParams, type CategoryRouteProps } from '@/components/catalogue/CategoryPage'

// A department, e.g. /sofas. Any top-level category in the tree gets one.
// Cached and rebuilt at most every five minutes (audit A4); a department added
// later is built on its first visit.
export const revalidate = 300
export const generateStaticParams = () => categoryParams('department')

export const generateMetadata = (props: CategoryRouteProps) => categoryMetadata(props)

export default function DepartmentPage(props: CategoryRouteProps) {
  return <CategoryPage {...props} />
}
