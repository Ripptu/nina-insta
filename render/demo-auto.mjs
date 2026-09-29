import { createEngine } from './engine.mjs'
import { readPosts } from './inhalt.mjs'
import { buildCarousel } from './karussell.mjs'
const nrs = process.argv.slice(2).map(Number)
const posts = readPosts().filter((p) => !nrs.length || nrs.includes(p.nr))
const eng = await createEngine()
for (const p of posts) {
  const t = Date.now()
  const r = await buildCarousel(eng, p, `../material/auto/k${p.nr}`)
  console.log(`Karussell ${p.nr} ${p.titel}: ${r.files.length} Seiten, ${((Date.now() - t) / 1000).toFixed(0)} s`)
  console.log(r.log.join('\n'))
}
await eng.close()
