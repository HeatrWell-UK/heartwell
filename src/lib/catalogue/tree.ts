// The category tree: where each category lives on the site and what it holds.
// Top-level categories are departments (/sofas; later /dining, /beds), and
// everything beneath a department sits one level under it (/sofas/corner-sofas),
// so a new department or category needs data, not code.

export interface CategoryNode {
  id: string
  slug: string
  name: string
  parentId: string | null
  sort: number
  description: string | null
  seoTitle: string | null
  seoDescription: string | null
  imageUrl: string | null
}

export function departmentOf(tree: CategoryNode[], node: CategoryNode): CategoryNode {
  let current = node
  const seen = new Set<string>()
  while (current.parentId && !seen.has(current.id)) {
    seen.add(current.id)
    const parent = tree.find((c) => c.id === current.parentId)
    if (!parent) break
    current = parent
  }
  return current
}

export function categoryHref(tree: CategoryNode[], node: CategoryNode): string {
  const dept = departmentOf(tree, node)
  return dept.id === node.id ? `/${node.slug}` : `/${dept.slug}/${node.slug}`
}

export const childrenOf = (tree: CategoryNode[], id: string | null) =>
  tree.filter((c) => c.parentId === id).sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name))

/** The category and every category beneath it. */
export function subtreeIds(tree: CategoryNode[], id: string): Set<string> {
  const ids = new Set([id])
  let grew = true
  while (grew) {
    grew = false
    for (const c of tree) {
      if (c.parentId && ids.has(c.parentId) && !ids.has(c.id)) {
        ids.add(c.id)
        grew = true
      }
    }
  }
  return ids
}

/** From the department down to the category itself. */
export function trail(tree: CategoryNode[], node: CategoryNode): CategoryNode[] {
  const path = [node]
  const seen = new Set([node.id])
  let current = node
  while (current.parentId) {
    const parent = tree.find((c) => c.id === current.parentId)
    if (!parent || seen.has(parent.id)) break
    seen.add(parent.id)
    path.unshift(parent)
    current = parent
  }
  return path
}

/** Resolves /:department or /:department/:category to a node, or null. */
export function resolveCategory(tree: CategoryNode[], department: string, category?: string): CategoryNode | null {
  const dept = tree.find((c) => c.slug === department && c.parentId === null)
  if (!dept) return null
  if (!category) return dept
  const node = tree.find((c) => c.slug === category)
  if (!node || node.id === dept.id) return null
  return departmentOf(tree, node).id === dept.id ? node : null
}
