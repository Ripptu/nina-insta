// Stories (1080 x 1920) im Stil Foto-Typo. Texte kommen aus docs/content-posts.md, Abschnitt "# Stories",
// Fassung "Automatik-Fassung (ohne Sticker)"; bei Quiz-Stories zusätzlich die Auflösung (zweite Story).
// Foto und Ausschnitt wählt die Layout-Engine; verletzt ein Foto den Gesichtsschutz, kommt das nächste dran.
import fs from 'node:fs'
import { createSeiten, paletteFor, PALETTEN } from './seiten.mjs'
import path from 'node:path'
import { ranked, CAT } from './engine.mjs'
import { reelBild } from './designer.mjs'

export const PH = 1920
/** Sicherer Bereich: Instagram verdeckt oben ca. 250 px (Profilzeile) und unten ca. 340 px (Antwortleiste, Reel-Caption).
 *  Das Logo sitzt deshalb knapp über der unteren Grenze (LOGO_TOP), Text endet darüber (hi). */
export const SAFE = { PH, lo: 250, hi: 1420 }
const LOGO = { w: 120, left: 56, top: 1440 }

/** Logo aus dem unsicheren Randbereich in den sicheren Bereich schieben (die Engine setzt es bei PH-190). */
export const fixLogo = (html) => html.replace(/(<img class="logo"[^>]*style=")[^"]*(")/, `$1width:${LOGO.w}px;left:${LOGO.left}px;top:${LOGO.top}px$2`)

const quoted = (s) => {
  const a = s.indexOf('„')
  const b = Math.max(s.lastIndexOf('“'), s.lastIndexOf('"'))
  return a >= 0 && b > a ? s.slice(a + 1, b).replace(/\s+/g, ' ').trim() : null
}

/** Liest "# Stories" aus docs/content-posts.md. */
export function readStories(file = new URL('../docs/content-posts.md', import.meta.url)) {
  const md = fs.readFileSync(file, 'utf8')
  const start = md.search(/^# Stories/m)
  const end = md.search(/^# Übersicht/m)
  const body = md.slice(start, end > start ? end : undefined)
  const out = []
  for (const sec of body.split(/^## /m).slice(1)) {
    const head = sec.match(/^Story (\d+): (.+)/)
    if (!head) continue
    const line = (prefix) => sec.split('\n').find((l) => l.startsWith('- ' + prefix))
    const val = (prefix) => { const l = line(prefix); return l ? l.slice(l.indexOf(':') + 1).trim() : '' }
    const auto = line('Automatik-Fassung')
    const aufl = line('Auflösung')
    if (!auto) throw new Error(`Story ${head[1]}: keine Automatik-Fassung`)
    out.push({
      nr: +head[1], id: `s${head[1]}`, titel: head[2].trim(),
      interaktion: val('Interaktion'), kernthema: +val('Kernthema') || null, ziel: val('Ziel'),
      hintergrund: val('Hintergrund'),
      text: quoted(auto),
      aufloesung: aufl ? quoted(aufl) : null,
    })
  }
  return out
}

const byId = (i) => CAT.find((p) => p.id === i)
const usable = (p) => p && (p.kind === 'portrait' || p.kind === 'ruecken')

/**
 * Rendert eine Seite: probiert die Kandidaten der Reihe nach durch (Engine-Layout, dann Gesichtsschutz).
 * kind: 'text' | 'quote' | 'cover' | 'split'. Rückgabe {foto, crop} oder null, wenn kein Foto passt.
 */
export async function renderSlide(eng, { kind = 'text', spec, cands, file, log = [], palette, index = 1, nr = 1 }) {
  // Fotos von Nina nur auf dem Cover; alle anderen Bilder sind Farbflächen mit Schrift und Zeichnungen
  if (kind === 'text' || kind === 'quote') {
    const dv = await reelBild(eng, { kind, spec, cands: [], file, nr, index, log })
    if (dv) return { foto: null, crop: null }
    const S = (eng._seiten ||= createSeiten(eng))
    const r = await S.seite({ ...spec, role: 'text' }, { PH, palette: palette || PALETTEN.braun, index, nr, lo: SAFE.lo, hi: SAFE.hi })
    if (!r) { log.push('Seite: Text passt nicht in die Fläche'); return null }
    const problems = await eng.renderHtml(fixLogo(r.html), file, PH)
    if (problems.length) { log.push(`Seite verworfen (${problems[0]})`); return null }
    return { foto: null, crop: null }
  }
  for (const p of cands) {
    let r
    if (kind === 'cover') r = await eng.cover(spec, p, SAFE)
    else if (kind === 'split') r = await eng.split(spec, p, { PH, cta: false })
    else r = await eng.text(spec, p, { ...SAFE, quote: kind === 'quote' })
    if (!r) { log.push(`Foto ${p.id}: kein freier Platz für den Text`); continue }
    const problems = await eng.renderHtml(fixLogo(r.html), file, PH)
    if (problems.length) { log.push(`Foto ${p.id} verworfen (${problems[0]})`); continue }
    return { foto: p.id, crop: r.crop }
  }
  return null
}

/**
 * Rendert eine Story (und bei Quiz-Stories die Auflösung) als 1080 x 1920 JPG nach outDir.
 * opts.used: Set bereits benutzter Foto-IDs (wird ergänzt, damit Stories verschiedene Fotos bekommen).
 * Rückgabe: { id, file, text, foto, files, fotos, log }; files enthält bei Auflösung eine zweite Datei.
 */
export async function renderStory(eng, story, outDir, opts = {}) {
  fs.mkdirSync(outDir, { recursive: true })
  const used = opts.used ?? new Set()
  const log = []
  const hg = story.hintergrund || ''
  // Hinweis aus "Hintergrund": Foto mit Buch (31/32) oder Rückenansicht am See bevorzugen, sonst ruhige Porträts.
  const pre = /Buch/.test(hg) ? [31, 32].map(byId) : /von hinten/.test(hg) ? CAT.filter((p) => p.kind === 'ruecken') : []
  const pages = [{ text: story.text, file: path.join(outDir, `${story.id}.jpg`) }]
  if (story.aufloesung) pages.push({ text: story.aufloesung, file: path.join(outDir, `${story.id}-aufloesung.jpg`) })
  const files = [], fotos = []
  for (const [k, pg] of pages.entries()) {
    // Fotos 31/32 (Nina mit Buch) nur, wenn der Hintergrund ein Buch nennt.
    const cands = [...pre.filter((p) => usable(p) && !used.has(p.id)), ...ranked('portrait', used, story.nr * 3 + k).filter((p) => pre.length || ![31, 32].includes(p.id))]
    const seen = new Set()
    const uniq = cands.filter((p) => !seen.has(p.id) && seen.add(p.id))
    const r = await renderSlide(eng, { kind: 'text', spec: { text: pg.text }, cands: uniq, file: pg.file, log, palette: paletteFor(story.nr, k + 1), index: k + 2, nr: story.nr })
    if (!r) throw new Error(`Story ${story.nr}${k ? ' (Auflösung)' : ''}: kein Foto passt (${log.join('; ')})`)
    if (r.foto != null) used.add(r.foto)
    files.push(pg.file); fotos.push(r.foto)
    log.push(`${path.basename(pg.file)}: Foto ${r.foto}`)
  }
  return { id: story.id, file: files[0], text: story.text, foto: fotos[0], files, fotos, log }
}
