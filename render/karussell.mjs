// Rendert ein Karussell: pro Seite Foto suchen, layouten, Gesichtsschutz, speichern.
import fs from 'node:fs'
import path from 'node:path'
import { ranked } from './engine.mjs'
import { createViral, viralCover } from './viral.mjs'
import { createSeiten, paletteFor } from './seiten.mjs'
import { benutzteCoverFotos, registriereCover } from './covers.mjs'

export async function buildCarousel(eng, post, outDir, { seed = post.nr, PH = 1350 } = {}) {
  const V = (eng._viral ||= createViral(eng))
  const S = (eng._seiten ||= createSeiten(eng))
  fs.mkdirSync(outDir, { recursive: true })
  const used = new Set()
  const files = []
  const log = []
  for (const pg of post.pages) {
    const file = path.join(outDir, `${String(pg.n).padStart(2, '0')}.jpg`)
    let done = false
    const gesperrt = pg.role === 'cover' ? benutzteCoverFotos(`k${post.nr}`) : new Set()
    // Fotos von Nina nur auf dem Cover; Buch-Angebotsseite darf ein Buchfoto (Gegenstand) zeigen, sonst Farbfläche
    const cands = pg.role === 'cover' ? ranked('portrait', used, seed + pg.n).filter((x) => !gesperrt.has(x.id)) : pg.role === 'buch' ? [...ranked('buch', used, seed + pg.n), null] : [null]
    for (const p of cands) {
      let r = null
      if (pg.role === 'cover') {
        // Viral-Vorlagen der Reihe nach, zuletzt die einfache Titelvorlage
        const vc = await viralCover(V, pg, [p], file, { PH, nr: post.nr })
        if (vc) { used.add(p.id); registriereCover(`k${post.nr}`, p.id); files.push(file); log.push(`  Seite ${pg.n}: Cover ${vc.vorlage}, Foto ${p.id}`); done = true; break }
        r = await eng.cover(pg, p, { PH })
      }
      else if (pg.role === 'buch' && p) r = await eng.split(pg, p, { PH })
      else r = await S.seite(pg, { PH, palette: paletteFor(post.nr, pg.n), index: pg.n, nr: post.nr })
      if (!r) continue
      const problems = await eng.renderHtml(r.html, file, PH)
      if (problems.length) { log.push(`  Seite ${pg.n}: Foto ${p?.id} verworfen (${problems[0]})`); continue }
      if (p) used.add(p.id)
      if (pg.role === 'cover') registriereCover(`k${post.nr}`, p.id)
      files.push(file)
      log.push(`  Seite ${pg.n}: ${pg.role}${p ? ', Foto ' + p.id : ''}`)
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
