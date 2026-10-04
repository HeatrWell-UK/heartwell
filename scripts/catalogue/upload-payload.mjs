// Puts the built catalogue payload where the database can fetch it, and prints
// the two SQL statements that import it. Used because the payload (~100 KB) is
// too big to paste comfortably and no database key is kept on this machine.
//
//   node scripts/catalogue/upload-payload.mjs
//
// Needs reference/.import/payload-credentials.json: one signed set from
// Cloudinary's sign-upload with { public_id: "heartwell/import/catalogue-<random>.json",
// tags: "heartwell-import" } (an unguessable name; signatures expire after an
// hour). The file holds catalogue data only, never customer data. Delete it
// from the media library (tag heartwell-import) after the import if wanted.
//
// Then, in the Supabase SQL editor (or over the MCP connection):
//   1. select net.http_get('<url>', timeout_milliseconds := 20000);   -- returns an id
//   2. select public.import_catalogue(content::jsonb) from net._http_response
//        where id = <id> and md5(content) = '<md5>';
// The md5 check makes sure the database imports exactly the file built here.

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const ROOT = new URL('../../', import.meta.url)
const payload = readFileSync(new URL('reference/.import/catalogue.json', ROOT))
const [cred] = JSON.parse(readFileSync(new URL('reference/.import/payload-credentials.json', ROOT), 'utf8'))

const form = new FormData()
form.set('file', new Blob([payload], { type: 'application/json' }), 'catalogue.json')
form.set('api_key', cred.api_key)
form.set('signature', cred.signature)
for (const [k, v] of Object.entries(cred.upload_params)) form.set(k, String(v))

const res = await fetch(`https://${cred.host}/v1_1/${cred.cloud_name}/raw/upload`, { method: 'POST', body: form })
const body = await res.json().catch(() => ({}))
if (!res.ok || !body.secure_url) {
  console.error(`upload-payload: ${res.status} ${body.error?.message ?? ''}`)
  process.exit(1)
}

const md5 = createHash('md5').update(payload).digest('hex')
console.log(`Uploaded ${payload.length} bytes`)
console.log(`\n1. select net.http_get('${body.secure_url}', timeout_milliseconds := 20000) as request_id;`)
console.log(`2. select public.import_catalogue(content::jsonb) from net._http_response where id = <request_id> and md5(content) = '${md5}';`)
