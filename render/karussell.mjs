// Rendert ein Karussell: pro Seite Foto suchen, layouten, Gesichtsschutz, speichern.
import fs from 'node:fs'
import path from 'node:path'
import { ranked } from './engine.mjs'
import { createViral, vorlagenFuer } from './viral.mjs'
import { benutzteCoverFotos, registriereCover } from './covers.mjs'

export async function buildCarousel(eng, post, outDir, { seed = post.nr, PH = 1350 } = {}) {
  const V = (eng._viral ||= createViral(eng))
  fs.mkdirSync(outDir, { recursive: true })
  const used = new Set()
  const files = []
  const log = []
  for (const pg of post.pages) {
    const file = path.join(outDir, `${String(pg.n).padStart(2, '0')}.jpg`)
    const kind = pg.role === 'buch' ? 'buch' : 'portrait'
    let done = false
    const gesperrt = pg.role === 'cover' ? benutzteCoverFotos(`k${post.nr}`) : new Set()
    for (const p of ranked(kind, used, seed + pg.n).filter((x) => !gesperrt.has(x.id))) {
      let r = null
      if (pg.role === 'cover') {
        // Viral-Vorlagen der Reihe nach, zuletzt die einfache Titelvorlage
        for (const v of vorlagenFuer(post.nr)) {
          const vr = await V[v === 'behind-rand' ? 'behind' : v](pg, p, { PH, outline: v === 'behind-rand' })
          if (!vr) continue
          const pr = await V.render(vr.html, file, PH)
          if (pr.length) { log.push(`  Cover ${v} mit Foto ${p.id} verworfen (${pr[0]})`); continue }
          r = { viral: v }
          break
        }
        if (r) { used.add(p.id); registriereCover(`k${post.nr}`, p.id); files.push(file); log.push(`  Seite ${pg.n}: Cover ${r.viral}, Foto ${p.id}`); done = true; break }
        r = await eng.cover(pg, p, { PH })
      }
      else if (pg.role === 'cover') { /* oben behandelt */ }
      else if (pg.role === 'quote') r = await eng.text(pg, p, { PH, quote: true })
      else if (pg.role === 'buch') r = p.kind === 'buch' ? await eng.split(pg, p, { PH }) : await eng.text(pg, p, { PH, cta: true })
      else r = await eng.text(pg, p, { PH, cta: pg.role === 'close' })
      if (!r) continue
      const problems = await eng.renderHtml(r.html, file, PH)
      if (problems.length) { log.push(`  Seite ${pg.n}: Foto ${p.id} verworfen (${problems[0]})`); continue }
      used.add(p.id)
      if (pg.role === 'cover') registriereCover(`k${post.nr}`, p.id)
      files.push(file)
      log.push(`  Seite ${pg.n}: ${pg.role}, Foto ${p.id}`)
      done = true
      break
    }
    if (!done && pg.role === 'cover') {
      // Alle Fotos waren schon Cover: reines Textcover statt Wiederholung
      const r = await eng.coverText(pg, { PH, variant: post.nr })
      if (r) {
        const problems = await eng.renderHtml(r.html, file, PH)
        if (!problems.length) { registriereCover(`k${post.nr}`, 'text'); files.push(file); log.push(`  Seite ${pg.n}: Textcover (keine freien Cover-Fotos)`); done = true }
      }
    }
    if (!done) throw new Error(`Karussell ${post.nr} Seite ${pg.n}: kein Foto passt (${pg.role})`)
  }
  return { files, log }
}
