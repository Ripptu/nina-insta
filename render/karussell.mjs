// Rendert ein Karussell: pro Seite Foto suchen, layouten, Gesichtsschutz, speichern.
import fs from 'node:fs'
import path from 'node:path'
import { ranked } from './engine.mjs'

export async function buildCarousel(eng, post, outDir, { seed = post.nr, PH = 1350 } = {}) {
  fs.mkdirSync(outDir, { recursive: true })
  const used = new Set()
  const files = []
  const log = []
  for (const pg of post.pages) {
    const file = path.join(outDir, `${String(pg.n).padStart(2, '0')}.jpg`)
    const kind = pg.role === 'buch' ? 'buch' : 'portrait'
    let done = false
    for (const p of ranked(kind, used, seed + pg.n)) {
      let r = null
      if (pg.role === 'cover') r = await eng.cover(pg, p, { PH })
      else if (pg.role === 'quote') r = await eng.text(pg, p, { PH, quote: true })
      else if (pg.role === 'buch') r = p.kind === 'buch' ? await eng.split(pg, p, { PH }) : await eng.text(pg, p, { PH, cta: true })
      else r = await eng.text(pg, p, { PH, cta: pg.role === 'close' })
      if (!r) continue
      const problems = await eng.renderHtml(r.html, file, PH)
      if (problems.length) { log.push(`  Seite ${pg.n}: Foto ${p.id} verworfen (${problems[0]})`); continue }
      used.add(p.id)
      files.push(file)
      log.push(`  Seite ${pg.n}: ${pg.role}, Foto ${p.id}`)
      done = true
      break
    }
    if (!done) throw new Error(`Karussell ${post.nr} Seite ${pg.n}: kein Foto passt (${pg.role})`)
  }
  return { files, log }
}
