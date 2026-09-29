// Holt täglich Kennzahlen der letzten Beiträge und die Followerzahl. Schreibt data/messwerte.json.
import fs from 'node:fs'
import path from 'node:path'
import { ladeQueue } from './queue.mjs'
import * as ig from './instagram.mjs'
import { berlin } from './zeit.mjs'

const ROOT = path.resolve(new URL('..', import.meta.url).pathname)
const FILE = path.join(ROOT, 'data/messwerte.json')
const daten = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : { konto: [], beitraege: {} }
const heute = berlin().datum
const q = await ladeQueue()

try {
  const k = await ig.kontoInfo()
  if (!daten.konto.some((x) => x.datum === heute)) daten.konto.push({ datum: heute, follower: k.followers_count, gefolgt: k.follows_count, beitraege: k.media_count })
  else Object.assign(daten.konto.find((x) => x.datum === heute), { follower: k.followers_count })
  console.log(`Follower ${k.followers_count}`)
} catch (e) { console.log('Kontodaten nicht abrufbar:', e.message) }

const liste = await ig.mediaListe(30)
for (const m of liste) {
  const item = q.find((x) => x.ig?.id === m.id)
  const typ = m.media_product_type === 'REELS' ? 'reel' : m.media_product_type === 'STORY' ? 'story' : 'feed'
  let ins = { werte: {}, nichtVerfuegbar: [] }
  try { ins = await ig.insights(m.id, { typ }) } catch (e) { console.log(`Insights ${m.id}:`, e.message) }
  const b = (daten.beitraege[m.id] ||= { id: item?.id || null, titel: item?.titel || null, typ, permalink: m.permalink, zeit: m.timestamp, kernthema: item?.kernthema ?? null, angebot: item?.angebot ?? null, verlauf: [] })
  b.verlauf = b.verlauf.filter((v) => v.datum !== heute)
  b.verlauf.push({ datum: heute, likes: m.like_count, kommentare: m.comments_count, ...ins.werte })
}
fs.mkdirSync(path.dirname(FILE), { recursive: true })
fs.writeFileSync(FILE, JSON.stringify(daten, null, 1))
console.log(`${liste.length} Beiträge gemessen.`)
