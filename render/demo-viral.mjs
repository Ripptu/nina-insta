import { createEngine, ranked } from './engine.mjs'
import { createViral, vorlagenFuer } from './viral.mjs'
import { readPosts } from './inhalt.mjs'
import fs from 'node:fs'
const eng = await createEngine()
const V = createViral(eng)
const out = '../material/auto/viral'
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true })
const only = process.argv[2]
const posts = readPosts()
let n = 0
for (const post of posts) {
  const spec = post.pages[0]
  const list = only ? [only] : vorlagenFuer(post.nr, spec.head).slice(0, 1)
  for (const v of list) {
    const name = v === 'behind-rand' ? 'behind' : v
    let ok = false
    for (const p of ranked('portrait', new Set(), post.nr * 3)) {
      const r = await V[name](spec, p, { outline: v === 'behind-rand' })
      if (!r) continue
      const f = `${out}/${String(post.nr).padStart(2, '0')}-${v}.jpg`
      const pr = await V.render(r.html, f, 1350)
      if (pr.length) { console.log(post.nr, v, 'Foto', p.id, 'verworfen:', pr[0]); continue }
      console.log(post.nr, v, 'Foto', p.id); ok = true; break
    }
    if (!ok) console.log(post.nr, v, 'KEIN Foto passt')
  }
}
await eng.close()
