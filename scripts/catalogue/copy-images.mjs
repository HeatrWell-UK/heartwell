// Copies the reference catalogue's images into Heartwell's Cloudinary,
// server to server: Cloudinary fetches each original from the source URL, so
// nothing is downloaded here. Repeatable: images already copied are skipped.
//
//   node scripts/catalogue/build-import.mjs     (writes the manifest)
//   node scripts/catalogue/copy-images.mjs      (copies, writes images-map.json)
//   node scripts/catalogue/build-import.mjs     (again, now with Heartwell URLs)
//
// Needs, in the git-ignored reference folder:
//   reference/catalogue-source.json             { "imageBase": "<source upload URL>/" }
//   reference/.import/upload-credentials.json   one signed set per folder, from
//     Cloudinary's sign-upload with { folder, use_filename: true,
//     unique_filename: false, overwrite: false, tags: "heartwell-source" }.
//     Signatures expire after an hour; no API secret is ever stored.
//
// Every file name is checked against the leak fingerprints first, so nothing
// naming the sister shop ends up in a Heartwell image address.

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createMatcher, scanText } from '../lib/leak-scan.mjs'

const ROOT = new URL('../../', import.meta.url)
const read = (path) => JSON.parse(readFileSync(new URL(path, ROOT), 'utf8'))

const { imageBase } = read('reference/catalogue-source.json')
const manifest = read('reference/.import/images-manifest.json')
const credentials = read('reference/.import/upload-credentials.json')
const mapPath = new URL('reference/.import/images-map.json', ROOT)
const map = existsSync(mapPath) ? JSON.parse(readFileSync(mapPath, 'utf8')) : {}
const matcher = createMatcher(read('scripts/sister-fingerprints.json'))

const byFolder = new Map(credentials.map((c) => [new URLSearchParams(c.upload_params).get('folder') ?? JSON.parse(c.upload_params).folder, c]))
const baseName = (path) => path.split('/').pop().replace(/\.[a-z0-9]+$/i, '')

const blocked = manifest.filter((m) => scanText(baseName(m.path).replace(/[-_]+/g, ' '), matcher).length > 0)
if (blocked.length) {
  console.error(`copy-images: ${blocked.length} file name(s) match the leak fingerprints; rename before copying:`)
  for (const b of blocked) console.error(`  ${b.path}`)
  process.exit(1)
}

const todo = manifest.filter((m) => !map[m.path])
console.log(`${manifest.length} images, ${manifest.length - todo.length} already copied, ${todo.length} to copy`)

let failed = 0
for (const [i, item] of todo.entries()) {
  const cred = byFolder.get(item.folder)
  if (!cred) {
    console.error(`no signed credentials for ${item.folder}`)
    process.exit(1)
  }
  const params = typeof cred.upload_params === 'string' ? JSON.parse(cred.upload_params) : cred.upload_params
  const form = new FormData()
  form.set('file', imageBase + item.path)
  form.set('api_key', cred.api_key)
  form.set('signature', cred.signature)
  for (const [k, v] of Object.entries(params)) form.set(k, String(v))

  const res = await fetch(`https://${cred.host}/v1_1/${cred.cloud_name}/image/upload`, { method: 'POST', body: form })
  const body = await res.json().catch(() => ({}))
  if (!res.ok || !body.secure_url) {
    failed++
    console.error(`  failed ${item.path}: ${res.status} ${body.error?.message ?? ''}`)
    if (res.status === 401) break // signature expired or wrong: sign again
    continue
  }
  map[item.path] = body.secure_url
  writeFileSync(mapPath, JSON.stringify(map, null, 1))
  if ((i + 1) % 20 === 0 || i + 1 === todo.length) console.log(`  ${i + 1}/${todo.length}`)
}

console.log(`${Object.keys(map).length}/${manifest.length} copied${failed ? `, ${failed} failed (run again)` : ''}`)
process.exit(failed ? 1 : 0)
