import { createEngine } from './engine.mjs'
import { readPosts } from './inhalt.mjs'
import { buildDesigner } from './designer.mjs'
const nrs = process.argv.slice(2).map(Number).filter(Boolean)
const eng = await createEngine()
for (const p of readPosts().filter((x) => !nrs.length || nrs.includes(x.nr))) {
  try { const r = await buildDesigner(eng, p, `../material/designer/k${p.nr}`.replace('../', '')); console.log(p.nr, r.log[0]?.trim(), r.files.length) } catch (e) { console.log(p.nr, 'FEHLER', e.message) }
}
await eng.close()
