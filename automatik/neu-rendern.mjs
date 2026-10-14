// Baut schon vorhandene, noch nicht veröffentlichte Beiträge mit dem aktuellen Renderer neu (z. B. nach einer Gestaltungsänderung)
// und setzt sie auf „neu“, damit die Qualitätsprüfung sie wieder ansieht. Caption, Angebot, Sperrdatum bleiben.
// Aufruf: node automatik/neu-rendern.mjs k04,k07,s11
import fs from 'node:fs'
import path from 'node:path'
import { ladeQueue, speichereQueue } from './queue.mjs'
import { createEngine } from '../render/engine.mjs'
import { readPosts } from '../render/inhalt.mjs'
import { buildCarousel } from '../render/karussell.mjs'
import { alleStories, renderStory } from '../render/story.mjs'

const ROOT = path.resolve(new URL('..', import.meta.url).pathname)
const AUTO = new URL('../docs/content-posts-auto.md', import.meta.url)
const ids = (process.argv[2] || '').split(',').filter(Boolean)
if (!ids.length) { console.log('Aufruf: node automatik/neu-rendern.mjs k04,k07,s11'); process.exit(1) }
const rel = (f) => path.relative(ROOT, f)
const posts = [...readPosts(), ...(fs.existsSync(AUTO) ? readPosts(AUTO) : [])]
const stories = alleStories()

const q = await ladeQueue()
const eng = await createEngine()
try {
  for (const id of ids) {
    const item = q.find((x) => x.id === id)
    if (!item) { console.log(`${id}: nicht in der Queue`); continue }
    if (item.status === 'veroeffentlicht') { console.log(`${id}: schon veröffentlicht, übersprungen`); continue }
    const nr = +id.slice(1)
    const out = path.join(ROOT, 'out', id)
    let dateien
    try {
      if (item.typ === 'karussell') {
        const post = posts.find((p) => +p.nr === nr)
        if (!post) { console.log(`${id}: Text nicht gefunden`); continue }
        fs.rmSync(out, { recursive: true, force: true })
        dateien = (await buildCarousel(eng, post, out)).files
      } else if (item.typ === 'story') {
        const st = stories.find((s) => +s.nr === nr)
        if (!st) { console.log(`${id}: Story nicht gefunden`); continue }
        fs.rmSync(out, { recursive: true, force: true })
        const r = await renderStory(eng, st, out)
        dateien = r.dateien || r.files || [r.datei]
      } else { console.log(`${id}: Typ ${item.typ} wird hier nicht neu gebaut`); continue }
    } catch (e) { console.log(`${id}: Fehler ${e.message}`); process.exitCode = 1; continue }
    Object.assign(item, { dateien: dateien.map(rel), status: 'neu', qa: null, fehler: null, versuche: 0 })
    await speichereQueue(q)
    console.log(`${id}: neu gebaut (${dateien.length} Bilder), wartet auf Prüfung`)
  }
} finally { await eng.close?.() }
