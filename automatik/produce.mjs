// Erzeugt Beiträge aus dem Vorrat und trägt sie als Status „neu“ in die Queue ein.
// Aufruf: node automatik/produce.mjs [--typ karussell|story|reel] [--anzahl N] [--nur k1,k2]
import fs from 'node:fs'
import path from 'node:path'
import { ladeQueue, speichereQueue } from './queue.mjs'
import { createEngine } from '../render/engine.mjs'
import { readPosts } from '../render/inhalt.mjs'
const ANGEBOTE = JSON.parse(fs.readFileSync(new URL('../data/angebote.json', import.meta.url), 'utf8'))
const sperre = (post) => { const min = ANGEBOTE[String(post.angebot || '').toLowerCase().replace(/^veranstaltung.*/, 'veranstaltungen')]?.fruehestens; const fr = post.fruehestens && /^\d{4}-\d{2}-\d{2}$/.test(post.fruehestens) ? post.fruehestens : null; return [fr, min].filter(Boolean).sort().pop() || null }
const AUTO = new URL('../docs/content-posts-auto.md', import.meta.url)
const alleBeitraege = () => [...readPosts(), ...(fs.existsSync(AUTO) ? readPosts(AUTO) : [])]
import { buildCarousel } from '../render/karussell.mjs'
import { pruefeStruktur } from './karussell-regeln.mjs'

const ROOT = path.resolve(new URL('..', import.meta.url).pathname)
// Seit 29.10.2026 (Nina): nur Inhalte aus Ninas eigenen Quellen (Buch, Hörbuch, ihre Fragen und Antworten) oder mit festem Termin (Shop-Start).
// Alles ohne `Buchquelle` und ohne `Termin` wird nicht mehr produziert, solange plan/params.json "nur_eigene_quellen" setzt.
const PARAMS = JSON.parse(fs.readFileSync(path.join(ROOT, 'plan/params.json'), 'utf8'))
const eigeneQuelle = (x) => !PARAMS.nur_eigene_quellen || Boolean(x.buchquelle || x.termin)
const args = process.argv.slice(2)
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d)
const typ = opt('--typ', 'karussell')
const anzahl = +opt('--anzahl', 99)
const nur = opt('--nur', '')?.split(',').filter(Boolean)
const rel = (f) => path.relative(ROOT, f)
const tags = (h) => (h || '').split(/\s+/).filter((x) => x.startsWith('#'))

const q = await ladeQueue()
const vorhanden = new Set(q.map((x) => x.id))
const eng = await createEngine()
let neu = 0
try {
  if (typ === 'karussell') {
    for (const post of alleBeitraege()) {
      const id = `k${String(post.nr).padStart(2, '0')}`
      if (vorhanden.has(id) || (nur.length && !nur.includes(id) && !nur.includes(String(post.nr)))) continue
      if (!eigeneQuelle(post)) continue
      if (neu >= anzahl) break
      const sf = pruefeStruktur(post)
      if (sf.length) { console.log(`Karussell ${id} ${post.titel} nicht produziert (Strukturregel): ${sf[0]}`); process.exitCode = 1; continue }
      const out = path.join(ROOT, 'out', id)
      fs.rmSync(out, { recursive: true, force: true })
      let r
      try { r = await buildCarousel(eng, post, out) } catch (e) { console.log(`Karussell ${id} ${post.titel} nicht produziert: ${e.message}`); process.exitCode = 1; continue }
      q.push({
        id, typ: 'karussell', quelle: `docs/content-posts.md#Karussell ${post.nr}`, titel: post.titel, format: post.format || null, angebot: /^veranstaltung/i.test(post.angebot || '') ? 'Veranstaltungen' : post.angebot || 'keins',
        kernthema: post.kernthema ? +String(post.kernthema).match(/\d+/)?.[0] : null, fruehestens: [sperre(post), post.termin].filter(Boolean).sort().pop() || null, termin: post.termin || null, buchquelle: post.buchquelle || null,
        dateien: r.files.map(rel), caption: post.caption, hashtags: tags(post.hashtags), status: 'neu', geplant: null, qa: null, ig: null, fehler: null,
      })
      await speichereQueue(q)
      neu++
      console.log(`Produziert ${id} ${post.titel} (${r.files.length} Seiten)`)
    }
  } else if (typ === 'story') {
    // Stories aus docs/content-posts.md und aus docs/content-stories-auto.md (von neu-schreiben.mjs --typ story)
    const { alleStories, renderStory } = await import('../render/story.mjs')
    for (const st of alleStories()) {
      const id = `s${String(st.nr).padStart(2, '0')}`
      if (vorhanden.has(id) || (nur.length && !nur.includes(id))) continue
      if (!eigeneQuelle(st)) continue
      if (neu >= anzahl) break
      const out = path.join(ROOT, 'out', id)
      fs.rmSync(out, { recursive: true, force: true })
      let r
      try { r = await renderStory(eng, st, out) } catch (e) {
        // Eine Story, für die kein Foto passt, darf die übrigen nicht blockieren: melden, weiter, am Ende Exit-Code 1.
        console.log(`Story ${id} ${st.titel} nicht produziert: ${e.message}`)
        process.exitCode = 1
        continue
      }
      q.push({ id, typ: 'story', quelle: `${st.datei}#Story ${st.nr}`, buchquelle: st.buchquelle || null, titel: st.titel, angebot: st.angebot || 'keins', kernthema: st.kernthema ?? null, fruehestens: st.termin || null, termin: st.termin || null, dateien: (r.dateien || r.files || [r.datei]).map(rel), caption: st.angebot ? 'Link in der Bio' : '', hashtags: [], status: 'neu', geplant: null, qa: null, ig: null, fehler: null })
      await speichereQueue(q)
      neu++
      console.log(`Produziert ${id} ${st.titel}`)
    }
  } else if (typ === 'reel') {
    const { readReels, renderReel } = await import('../render/reel.mjs')
    for (const rl of readReels()) {
      const id = `r${String(rl.nr).padStart(2, '0')}`
      if (vorhanden.has(id) || (nur.length && !nur.includes(id))) continue
      if (!eigeneQuelle(rl)) continue
      if (neu >= anzahl) break
      const out = path.join(ROOT, 'out', id)
      fs.rmSync(out, { recursive: true, force: true })
      const r = await renderReel(eng, rl, out)
      if (r.status === 'braucht-ton') { console.log(`Übersprungen ${id}: braucht Ton`); continue }
      q.push({ id, typ: 'reel', quelle: `docs/content-reels.md#Reel ${rl.nr}`, titel: rl.titel, angebot: rl.angebot || 'keins', kernthema: rl.kernthema ?? null, serie: rl.serie && rl.serie !== '–' ? rl.serie : null, buchquelle: rl.buchquelle || null, fruehestens: rl.fruehestens || null, dateien: (r.dateien || [r.video, r.cover]).filter(Boolean).map(rel), caption: rl.caption, hashtags: tags(rl.hashtags), status: 'neu', geplant: null, qa: null, ig: null, fehler: null })
      await speichereQueue(q)
      neu++
      console.log(`Produziert ${id} ${rl.titel}`)
    }
  }
  else if (typ === 'stimme') {
    // Reels aus Ninas Sprachaufnahmen (data/stimm-reels.json, Ton aus stimme/)
    const { lesDefinitionen, renderStimmReel } = await import('../render/stimmreel.mjs')
    for (const d of lesDefinitionen()) {
      if (vorhanden.has(d.id) || (nur.length && !nur.includes(d.id))) continue
      if (neu >= anzahl) break
      const out = path.join(ROOT, 'out', d.id)
      fs.rmSync(out, { recursive: true, force: true })
      let r
      try { r = await renderStimmReel(eng, d, out) } catch (e) { console.log(`Stimm-Reel ${d.id} ${d.titel} nicht produziert: ${e.message}`); process.exitCode = 1; continue }
      q.push({ id: d.id, typ: 'reel', quelle: `data/stimm-reels.json#${d.id}`, buchquelle: d.buchquelle || 'stimme', titel: d.titel, angebot: d.angebot || 'keins', kernthema: d.kernthema ?? null, serie: null, fruehestens: d.termin || d.fruehestens || null, termin: d.termin || null, dateien: [r.video, r.cover].map(rel), caption: d.caption, hashtags: tags(d.hashtags), status: 'neu', geplant: null, qa: null, ig: null, fehler: null })
      await speichereQueue(q)
      neu++
      console.log(`Produziert ${d.id} ${d.titel} (${r.dauer.toFixed(0)} s)`)
    }
  }
} finally {
  await eng.close()
}
console.log(`${neu} neu produziert.`)
