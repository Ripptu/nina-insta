import { createEngine } from './engine.mjs'
import { readPosts } from './inhalt.mjs'
import { buildCarousel } from './karussell.mjs'
const nrs = process.argv.slice(2).map(Number).filter(Boolean)
const eng = await createEngine()
for (const p of readPosts().filter((x) => !nrs.length || nrs.includes(x.nr))) {
  try { const r = await buildCarousel(eng, p, `material/auto/k${p.nr}`); console.log(p.nr, r.log.join(' | ')) } catch (e) { console.log(p.nr, 'FEHLER', e.message) }
}
await eng.close()
