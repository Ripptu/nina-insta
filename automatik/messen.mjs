// Holt täglich Kennzahlen der letzten Beiträge und die Followerzahl. Schreibt data/messwerte.json.
import fs from 'node:fs'
import path from 'node:path'
import { ladeQueue, speichereQueue } from './queue.mjs'
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
let zugeordnet = 0
for (const m of liste) {
  // Von Hand (Business Suite) veröffentlichte Beiträge haben keine ig.id: über den Caption-Anfang zuordnen und die ID nachtragen.
  const anfang = (t) => String(t || '').replace(/\s+/g, ' ').trim().slice(0, 60)
  let item = q.find((x) => x.ig?.id === m.id)
  if (!item && m.caption) {
    item = q.find((x) => x.ig?.manuell && !x.ig.id && x.caption && anfang(x.caption) === anfang(m.caption))
    if (item) { item.ig.id = m.id; item.ig.permalink ||= m.permalink; zugeordnet++ }
  }
  const typ = m.media_product_type === 'REELS' ? 'reel' : m.media_product_type === 'STORY' ? 'story' : 'feed'
  let ins = { werte: {}, nichtVerfuegbar: [] }
  try { ins = await ig.insights(m.id, { typ }) } catch (e) { console.log(`Insights ${m.id}:`, e.message) }
  const b = (daten.beitraege[m.id] ||= { id: item?.id || null, titel: item?.titel || null, typ, permalink: m.permalink, zeit: m.timestamp, kernthema: item?.kernthema ?? null, angebot: item?.angebot ?? null, verlauf: [] })
  if (item && !b.id) Object.assign(b, { id: item.id, titel: item.titel, kernthema: item.kernthema ?? null, angebot: item.angebot ?? null })
  b.verlauf = b.verlauf.filter((v) => v.datum !== heute)
  b.verlauf.push({ datum: heute, likes: m.like_count, kommentare: m.comments_count, ...ins.werte })
}
fs.mkdirSync(path.dirname(FILE), { recursive: true })
fs.writeFileSync(FILE, JSON.stringify(daten, null, 1))
if (zugeordnet) { await speichereQueue(q); console.log(`${zugeordnet} von Hand veröffentlichte Beiträge zugeordnet.`) }
console.log(`${liste.length} Beiträge gemessen.`)
