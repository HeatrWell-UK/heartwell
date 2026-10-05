// Site search over the catalogue. Small enough to search in memory, so it's
// instant and understands how people type: "u shape", "3 and 2", "gray",
// "corner grey". Every word must match something (a word can be the start of
// a longer one, so "rec" finds recliners); if nothing matches every word, the
// best partial matches are shown and the page says so.

import type { ListingProduct } from './listing-types'

const STOPWORDS = new Set(['a', 'an', 'the', 'in', 'with', 'and', 'for', 'of', 'sofa', 'sofas', 'settee', 'settees', 'couch', 'couches', 'suite'])

/** Lower case, British spelling, joined-up forms, no punctuation. */
export function normaliseQuery(text: string): string {
  return text
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\bgray\b/g, 'grey')
    .replace(/\bu[\s-]*shaped?\b/g, 'ushape')
    .replace(/\bl[\s-]*shaped?\b/g, 'lshape')
    .replace(/\b3\s*(?:\+|and|&|-)\s*2\b/g, '3plus2')
    .replace(/\b(\d)\s*-?\s*seat(?:er|s)?\b/g, '$1seater')
    .replace(/\barm\s*chairs?\b/g, 'armchair')
    .replace(/\bfoot\s*stools?\b/g, 'footstool')
    .replace(/\brecliners?\b|\breclining\b/g, 'recliner')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const SHAPE_WORDS: Record<string, string> = {
  straight: 'straight',
  set: '3plus2 set pair',
  corner: 'corner lshape',
  'u-shape': 'ushape',
  armchair: 'armchair chair',
  footstool: 'footstool pouffe ottoman',
}

interface Field {
  text: string
  weight: number
}

function fieldsOf(p: ListingProduct, categoryNames: string[]): Field[] {
  return [
    { text: normaliseQuery(p.title), weight: 3 },
    { text: normaliseQuery(p.rangeName ?? ''), weight: 3 },
    { text: normaliseQuery(categoryNames.join(' ')), weight: 2 },
    { text: normaliseQuery(p.colours.map((c) => c.name).join(' ')), weight: 2 },
    {
      text: normaliseQuery(
        [
          p.typeName,
          p.material ?? '',
          p.shape ? SHAPE_WORDS[p.shape] ?? p.shape : '',
          p.seats ? `${p.seats} seater` : '',
          p.reclining ? `${p.reclining} recliner` : '',
          p.madeToOrder ? 'made to order custom fabric' : '',
          p.axis1Value ?? '',
          p.axis2Value ?? '',
        ].join(' '),
      ),
      weight: 1,
    },
  ]
}

function wordMatch(text: string, token: string): boolean {
  return text.split(' ').some((w) => w.startsWith(token) || (token.length > 3 && w.startsWith(token.replace(/s$/, ''))))
}

export interface SearchResult {
  products: ListingProduct[]
  /** True when no product matched every word and these are the closest. */
  partial: boolean
  terms: string[]
}

export function searchCatalogue(products: ListingProduct[], query: string, categoryNames: (p: ListingProduct) => string[]): SearchResult {
  const terms = normaliseQuery(query)
    .split(' ')
    .filter((t) => t && !STOPWORDS.has(t))
  if (terms.length === 0) return { products: [], partial: false, terms }

  const scored = products.map((p) => {
    const fields = fieldsOf(p, categoryNames(p))
    let matched = 0
    let score = 0
    for (const t of terms) {
      const best = Math.max(0, ...fields.filter((f) => wordMatch(f.text, t)).map((f) => f.weight))
      if (best > 0) {
        matched++
        score += best
      }
    }
    return { p, matched, score: score + (p.featured ? 0.5 : 0) }
  })

  const byScore = (a: (typeof scored)[number], b: (typeof scored)[number]) =>
    b.score - a.score || a.p.rangeSort - b.p.rangeSort || a.p.sort - b.p.sort
  const all = scored.filter((s) => s.matched === terms.length).sort(byScore)
  if (all.length) return { products: all.map((s) => s.p), partial: false, terms }
  const some = scored.filter((s) => s.matched > 0).sort((a, b) => b.matched - a.matched || byScore(a, b))
  return { products: some.slice(0, 24).map((s) => s.p), partial: some.length > 0, terms }
}
