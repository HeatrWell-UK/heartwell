// Fails if anything from the sister shop is about to enter the repository.
//
//   node scripts/check-sister-leaks.mjs --staged   lines added in the commit (pre-commit hook)
//   node scripts/check-sister-leaks.mjs --all      every tracked and new file (CI, npm run verify)
//
// See scripts/lib/leak-scan.mjs for how matching works without storing any
// sister values.

import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createMatcher, scanLines, scanText } from './lib/leak-scan.mjs'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const FINGERPRINTS = join(ROOT, 'scripts/sister-fingerprints.json')

// Files that may not be committed at all.
const FORBIDDEN = [/^reference\//, /(^|\/)\.env(\..+)?$/]
const FORBIDDEN_EXCEPT = [/(^|\/)\.env\.example$/]

// Files never read: binaries, the lockfile, the fingerprints themselves.
const SKIP = [
  /\.(png|jpe?g|webp|avif|gif|ico|woff2?|ttf|otf|pdf|zip|mp4|webm)$/i,
  /(^|\/)package-lock\.json$/,
  /^scripts\/sister-fingerprints\.json$/,
  /^(node_modules|\.next|out|build|coverage)\//,
]

// The planning docs and session rules talk about the sister shop by name; they
// may name it, but nothing else (contacts, IDs, descriptions) is allowed there.
function allowedCategories(path) {
  return /^docs\//.test(path) || path === 'CLAUDE.md' ? ['brand'] : []
}

const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })

function isGitRepo() {
  try {
    return execFileSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() === 'true'
  } catch {
    return false
  }
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (['.git', 'node_modules', '.next', 'reference'].includes(name)) continue
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, out)
    else out.push(relative(ROOT, full).replaceAll('\\', '/'))
  }
  return out
}

/** Every file that is tracked, or new and not ignored. */
function allFiles() {
  if (!isGitRepo()) return walk(ROOT)
  return git('ls-files', '--cached', '--others', '--exclude-standard', '-z').split('\0').filter(Boolean)
}

/** Added lines in the staged diff, by file, with their new line numbers. */
function stagedAdditions() {
  const diff = git('diff', '--cached', '--no-color', '--no-ext-diff', '-U0', '--diff-filter=ACMR')
  const files = new Map()
  let current = null
  let lineNo = 0
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ ')) {
      const path = line.slice(4).replace(/^b\//, '')
      current = path === '/dev/null' ? null : path
      if (current && !files.has(current)) files.set(current, [])
    } else if (line.startsWith('@@')) {
      lineNo = Number(/\+(\d+)/.exec(line)?.[1] ?? 0)
    } else if (current && line.startsWith('+')) {
      files.get(current).push({ n: lineNo++, text: line.slice(1) })
    }
  }
  // Paths of every staged file, including binaries and renames, for the path rules.
  const names = git('diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z').split('\0').filter(Boolean)
  for (const name of names) if (!files.has(name)) files.set(name, [])
  return files
}

function main() {
  const mode = process.argv.includes('--staged') ? 'staged' : 'all'
  if (!existsSync(FINGERPRINTS)) {
    console.error('check:leaks: scripts/sister-fingerprints.json is missing. Run node scripts/build-sister-fingerprints.mjs.')
    process.exit(1)
  }
  const matcher = createMatcher(JSON.parse(readFileSync(FINGERPRINTS, 'utf8')))

  const problems = []
  const entries = mode === 'staged' ? [...stagedAdditions()] : allFiles().map((p) => [p, null])

  for (const [path, lines] of entries) {
    if (FORBIDDEN.some((re) => re.test(path)) && !FORBIDDEN_EXCEPT.some((re) => re.test(path))) {
      problems.push(`${path}  this file must never be committed`)
      continue
    }
    if (SKIP.some((re) => re.test(path))) continue
    const options = { allow: allowedCategories(path) }
    let findings
    if (lines) {
      findings = scanLines(lines, matcher, options)
    } else {
      const full = join(ROOT, path)
      if (!existsSync(full)) continue
      const text = readFileSync(full, 'utf8')
      if (text.includes('\0')) continue
      findings = scanText(text, matcher, options)
    }
    for (const f of findings) problems.push(`${path}:${f.line}  sister ${f.category}: "${f.text}"`)
  }

  if (problems.length) {
    console.error(`check:leaks found ${problems.length} problem(s). Nothing from the sister shop may be committed:\n`)
    for (const p of problems) console.error(`  ${p}`)
    console.error('\nRemove or rewrite these, then try again.')
    process.exit(1)
  }
  console.log(`check:leaks: clean (${entries.length} file${entries.length === 1 ? '' : 's'} checked, ${mode}).`)
}

main()
