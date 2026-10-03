export interface Fingerprints {
  version: number
  maxTokens: number
  terms: { h: string; c: string; l: number }[]
  shingles: { size: number; hashes: string[] }
}

export interface Matcher {
  terms: Map<string, string>
  lengths: Set<number>
  maxLength: number
  maxTokens: number
  shingles: Set<string>
  shingleSize: number
}

export interface Finding {
  line: number
  category: string
  text: string
}

export const SHINGLE_SIZE: number
export function tokens(text: string): string[]
export function fingerprint(value: string): string
export function termKey(term: string): string
export function buildFingerprints(input: { terms: { category: string; term: string }[]; descriptions: string[] }): Fingerprints
export function createMatcher(fingerprints: Fingerprints): Matcher
export function scanLines(lines: { n: number; text: string }[], matcher: Matcher, options?: { allow?: string[] }): Finding[]
export function scanText(text: string, matcher: Matcher, options?: { allow?: string[] }): Finding[]
