// Rebuilds scripts/sister-fingerprints.json from the git-ignored reference
// folder. Run it on the owner's machine whenever reference/leak-terms.txt or
// the catalogue changes:
//
//   node scripts/build-sister-fingerprints.mjs
//
// reference/leak-terms.txt holds one banned value per line as
// "category | value" (categories: brand, contact, social, account). Lines
// starting with # are notes. Product descriptions come from
// reference/catalogue/products.jsonl. Only hashes are written out.

import { readFileSync, writeFileSync } from 'node:fs'
import { buildFingerprints } from './lib/leak-scan.mjs'

const root = new URL('../', import.meta.url)
const read = (path) => readFileSync(new URL(path, root), 'utf8')

const terms = read('reference/leak-terms.txt')
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'))
  .map((line) => {
    const [category, ...rest] = line.split('|')
    return { category: category.trim(), term: rest.join('|').trim() }
  })

function jsonlColumn(path, column) {
  const [header, ...rows] = read(path).split(/\r?\n/).filter(Boolean)
  const index = JSON.parse(header).indexOf(column)
  if (index < 0) throw new Error(`${path} has no "${column}" column`)
  return rows.map((row) => JSON.parse(row)[index]).filter((v) => typeof v === 'string')
}

const descriptions = jsonlColumn('reference/catalogue/products.jsonl', 'description').map((d) => d.replace(/<[^>]+>/g, ' '))

const fingerprints = buildFingerprints({ terms, descriptions })
writeFileSync(new URL('scripts/sister-fingerprints.json', root), `${JSON.stringify(fingerprints)}\n`)
console.log(`Wrote ${fingerprints.terms.length} terms and ${fingerprints.shingles.hashes.length} description fingerprints.`)
