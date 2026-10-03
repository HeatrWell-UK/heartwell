// The engine behind `npm run check:leaks`.
//
// The repository must never hold anything from the sister shop: its name and
// domain, contact details, account IDs or product descriptions. To check for
// them without writing them down here, the check works on fingerprints: short
// SHA-256 hashes of each banned value, built locally from the git-ignored
// reference folder by scripts/build-sister-fingerprints.mjs. The scanner
// hashes what it reads and compares hashes, so neither this file nor the
// committed fingerprint file contains a single sister value.
//
// Matching is on words, ignoring case and punctuation, so "Example-Sofa-Co",
// "example sofa co" and "examplesofaco" all match the same entry, and a phone
// number matches however it is spaced. Descriptions are matched as runs of words
// (shingles), so a copied passage is caught even inside new text.
//
// The repository is public until launch, so the same pass also looks for
// credentials by their published formats. Keys belong in the host's
// environment variables, never in a file. (Publishable keys, which are meant to
// be public, aren't flagged.)

import { createHash } from 'node:crypto'

const SALT = 'heartwell-leak-v1:'
export const SHINGLE_SIZE = 12

const SECRET_PATTERNS = [
  ['private key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['Supabase secret key', /\bsb_secret_[A-Za-z0-9_-]{10,}/],
  ['JSON web token (e.g. a Supabase service key)', /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
  ['Meta access token', /\bEAA[A-Za-z0-9]{30,}/],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{35}/],
  ['Cloudinary URL with API secret', /cloudinary:\/\/\d+:[A-Za-z0-9_-]+@/],
  ['Anthropic API key', /\bsk-ant-[A-Za-z0-9_-]{20,}/],
  ['GitHub token', /\b(?:ghp|gho|ghs|ghu|github_pat)_[A-Za-z0-9_]{20,}/],
]

/** Lower-case words and numbers, everything else dropped. */
export function tokens(text) {
  return text.toLowerCase().match(/[a-z0-9]+/g) ?? []
}

export function fingerprint(value) {
  return createHash('sha256').update(SALT + value).digest('hex').slice(0, 16)
}

/** The form a banned term is stored and matched in: its words run together. */
export function termKey(term) {
  return tokens(term).join('')
}

// About half of the description shingles are kept, which halves the file. Any
// copied passage of 20 words or more still has several kept shingles in it.
function keepShingle(hash) {
  return parseInt(hash[0] ?? '0', 16) < 8
}

/**
 * Build the fingerprint set.
 * @param {{ terms: { category: string, term: string }[], descriptions: string[] }} input
 */
export function buildFingerprints({ terms, descriptions }) {
  const termEntries = new Map()
  let maxTokens = 1
  for (const { category, term } of terms) {
    const key = termKey(term)
    if (key.length < 5) throw new Error(`Term too short to match safely: "${term}"`)
    maxTokens = Math.max(maxTokens, tokens(term).length)
    termEntries.set(fingerprint(key), { h: fingerprint(key), c: category, l: key.length })
  }
  const shingles = new Set()
  for (const text of descriptions) {
    const words = tokens(text)
    for (let i = 0; i + SHINGLE_SIZE <= words.length; i++) {
      const h = fingerprint(words.slice(i, i + SHINGLE_SIZE).join(' '))
      if (keepShingle(h)) shingles.add(h)
    }
  }
  return {
    version: 1,
    maxTokens,
    terms: [...termEntries.values()].sort((a, b) => a.h.localeCompare(b.h)),
    shingles: { size: SHINGLE_SIZE, hashes: [...shingles].sort() },
  }
}

export function createMatcher(fingerprints) {
  return {
    terms: new Map(fingerprints.terms.map((t) => [t.h, t.c])),
    lengths: new Set(fingerprints.terms.map((t) => t.l)),
    maxLength: Math.max(0, ...fingerprints.terms.map((t) => t.l)),
    maxTokens: fingerprints.maxTokens,
    shingles: new Set(fingerprints.shingles.hashes),
    shingleSize: fingerprints.shingles.size,
  }
}

/**
 * Scan numbered lines. Returns one finding per line and category.
 * @param {{ n: number, text: string }[]} lines
 * @param {ReturnType<typeof createMatcher>} matcher
 * @param {{ allow?: string[] }} [options] categories this file may contain
 */
export function scanLines(lines, matcher, { allow = [] } = {}) {
  const findings = []
  const seen = new Set()
  const add = (line, category, text) => {
    if (allow.includes(category)) return
    const key = `${line}:${category}`
    if (seen.has(key)) return
    seen.add(key)
    findings.push({ line, category, text })
  }

  const allWords = []
  for (const { n, text } of lines) {
    for (const [label, pattern] of SECRET_PATTERNS) {
      if (pattern.test(text)) add(n, 'secret', label)
    }
    const words = tokens(text)
    for (let i = 0; i < words.length; i++) {
      allWords.push({ word: words[i], line: n })
      let joined = ''
      for (let k = 0; k < matcher.maxTokens && i + k < words.length; k++) {
        joined += words[i + k]
        if (joined.length > matcher.maxLength) break
        if (!matcher.lengths.has(joined.length)) continue
        const category = matcher.terms.get(fingerprint(joined))
        if (category) add(n, category, words.slice(i, i + k + 1).join(' '))
      }
    }
  }

  // Descriptions run across lines, so shingles are taken over the whole text.
  const size = matcher.shingleSize
  if (matcher.shingles.size > 0) {
    for (let i = 0; i + size <= allWords.length; i++) {
      const run = allWords.slice(i, i + size)
      if (matcher.shingles.has(fingerprint(run.map((w) => w.word).join(' ')))) {
        add(run[0].line, 'description', `${run.map((w) => w.word).join(' ')}…`)
      }
    }
  }
  return findings
}

export function scanText(text, matcher, options) {
  return scanLines(
    text.split(/\r?\n/).map((t, i) => ({ n: i + 1, text: t })),
    matcher,
    options,
  )
}
