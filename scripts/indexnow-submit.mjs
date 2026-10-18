// Announces every page in the live sitemap to IndexNow (Bing and the others)
// in one go: after a launch, a content change across many pages, or a new
// batch of products. Day to day, admin saves announce their own page.
//
//   node scripts/indexnow-submit.mjs            (sends)
//   node scripts/indexnow-submit.mjs --dry-run  (lists what it would send)
//
// The key matches src/lib/seo/indexnow.ts and public/<key>.txt.

const SITE = 'https://heartwellsofa.co.uk'
const KEY = '3d55e0a0a44569590386357208be9804'
const dryRun = process.argv.includes('--dry-run')

const keyFile = await fetch(`${SITE}/${KEY}.txt`)
if (!keyFile.ok || (await keyFile.text()).trim() !== KEY) {
  console.error(`The key file ${SITE}/${KEY}.txt isn't live yet: deploy first.`)
  process.exit(1)
}

const sitemap = await (await fetch(`${SITE}/sitemap.xml`)).text()
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'))
console.log(`${urlList.length} pages in the sitemap`)
if (dryRun) {
  console.log(urlList.join('\n'))
  process.exit(0)
}

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: new URL(SITE).host, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList }),
})
console.log(`IndexNow answered ${res.status} ${res.statusText}`, (await res.text()).slice(0, 300))
process.exit(res.ok ? 0 : 1)
