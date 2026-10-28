// Uploads the publishing slides (out/<range>/social/*.jpg, made by
// `build.mjs all --social`) to Heartwell's Cloudinary, so Instagram and
// Facebook can fetch them, and records each file's public address in
// out/social-urls.json. Files already recorded are skipped, so it can resume.
//
//   node design/social/products/upload.mjs <signed.json>
//
// signed.json is one credential from the Cloudinary MCP's sign-upload tool,
// signed for: { asset_folder: "heartwell/social/posts", use_filename: true,
// unique_filename: false, overwrite: true, tags: "heartwell-social" }.
// The signature lasts about an hour.

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { join, basename } from 'node:path'
import { ROOT } from './lib.mjs'

const OUT = join(ROOT, 'design/social/products/out')
const URLS = join(OUT, 'social-urls.json')
const signed = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const cred = Array.isArray(signed) ? signed[0] : signed
const params = typeof cred.upload_params === 'string' ? Object.fromEntries(new URLSearchParams(cred.upload_params)) : cred.upload_params
const endpoint = `https://${cred.host ?? 'api.cloudinary.com'}/v1_1/${cred.cloud_name}/image/upload`

const urls = existsSync(URLS) ? JSON.parse(readFileSync(URLS, 'utf8')) : {}
const files = readdirSync(OUT, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(OUT, d.name, 'social', 'manifest.json')))
  .flatMap((d) => {
    const m = JSON.parse(readFileSync(join(OUT, d.name, 'social', 'manifest.json'), 'utf8'))
    return [...new Set([...m.instagram.slides, ...m.facebook.slides].map((s) => s.file))].map((f) => join(OUT, d.name, 'social', f))
  })
  .filter((f) => !urls[basename(f)])

async function upload(file) {
  const form = new FormData()
  form.append('file', new Blob([readFileSync(file)], { type: 'image/jpeg' }), basename(file))
  form.append('api_key', cred.api_key)
  form.append('signature', cred.signature)
  for (const [k, v] of Object.entries(params)) form.append(k, String(v))
  const res = await fetch(endpoint, { method: 'POST', body: form })
  const body = await res.json()
  if (!res.ok || !body.secure_url) throw new Error(`${basename(file)}: ${res.status} ${JSON.stringify(body.error ?? body)}`)
  return body.secure_url
}

let done = 0
const queue = [...files]
async function worker() {
  while (queue.length) {
    const f = queue.shift()
    urls[basename(f)] = await upload(f)
    done++
    if (done % 10 === 0 || !queue.length) {
      writeFileSync(URLS, JSON.stringify(urls, null, 2))
      console.log(`${done}/${files.length} uploaded`)
    }
  }
}
await Promise.all([worker(), worker(), worker(), worker()])
writeFileSync(URLS, JSON.stringify(urls, null, 2))
console.log(`Done: ${Object.keys(urls).length} addresses in ${URLS}`)
