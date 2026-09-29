// Veröffentlicht den fälligen Beitrag. Aufruf: node automatik/publish.mjs [--trocken] [--jetzt] [--typ karussell|reel|story]
// Läuft per Cron in GitHub Actions. Ohne --jetzt nur im Zeitfenster laut plan/params.json (Berliner Zeit).
import fs from 'node:fs'
import path from 'node:path'
import { ladeQueue, speichereQueue } from './queue.mjs'
import * as ig from './instagram.mjs'
import { waehle, veroeffentlichteFeed } from './auswahl.mjs'
import { berlin, inFenster } from './zeit.mjs'

const ROOT = path.resolve(new URL('..', import.meta.url).pathname)
const args = process.argv.slice(2)
const trocken = args.includes('--trocken')
const jetzt = args.includes('--jetzt')
const typArg = args.includes('--typ') ? args[args.indexOf('--typ') + 1] : null
const log = (...a) => console.log(new Date().toISOString(), ...a)

if (fs.existsSync(path.join(ROOT, 'PAUSE'))) { log('PAUSE vorhanden, nichts veröffentlicht.'); process.exit(0) }

const params = JSON.parse(fs.readFileSync(path.join(ROOT, 'plan/params.json'), 'utf8'))
const jetztZeit = new Date()
const b = berlin(jetztZeit)
const q = await ladeQueue()
const heuteVeroeffentlicht = (typen) => q.some((x) => x.status === 'veroeffentlicht' && typen.includes(x.typ) && x.ig?.am && berlin(new Date(x.ig.am)).datum === b.datum)

const jobs = []
// Feed
const feedArt = params.feed.tage[String(b.wochentag)]
if ((!typArg || typArg !== 'story') && feedArt && (jetzt || inFenster(jetztZeit, params.feed.uhrzeit, params.feed.fenster_min))) {
  const monat = b.datum.slice(0, 7)
  const imMonat = veroeffentlichteFeed(q).filter((x) => berlin(new Date(x.ig.am)).datum.startsWith(monat)).length
  if (heuteVeroeffentlicht(['karussell', 'reel']) && !jetzt) log('Heute schon ein Feed-Beitrag veröffentlicht.')
  else if (imMonat >= params.feed.max_pro_monat) log(`Monatsgrenze ${params.feed.max_pro_monat} erreicht.`)
  else jobs.push({ typ: typArg && typArg !== 'story' ? typArg : feedArt, serie: b.wochentag === params.reel_serie_tag })
}
// Stories
if ((!typArg || typArg === 'story') && params.stories.tage.includes(b.wochentag) && (jetzt || inFenster(jetztZeit, params.stories.uhrzeit, params.stories.fenster_min))) {
  if (heuteVeroeffentlicht(['story']) && !jetzt) log('Heute schon eine Story veröffentlicht.')
  else jobs.push({ typ: 'story' })
}
if (!jobs.length) { log('Nichts fällig.'); process.exit(0) }

let fehler = 0
for (const job of jobs) {
  const item = waehle(q, { typ: job.typ, serie: !!job.serie, jetzt: jetztZeit })
  if (!item) { log(`Kein geprüfter Beitrag für ${job.typ}${job.serie ? ' (Serie)' : ''}: Puffer leer.`); fehler++; continue }
  const dateien = item.dateien.map((f) => path.join(ROOT, f))
  const fehlt = dateien.filter((f) => !fs.existsSync(f))
  if (fehlt.length) { item.status = 'fehler'; item.fehler = 'Dateien fehlen: ' + fehlt.map((f) => path.basename(f)).join(', '); await speichereQueue(q); fehler++; continue }
  const caption = item.caption + (item.hashtags?.length ? '\n\n' + (Array.isArray(item.hashtags) ? item.hashtags.join(' ') : item.hashtags) : '')
  log(`${trocken ? '[trocken] ' : ''}Veröffentliche ${item.id} (${item.typ}) ${item.titel}`)
  try {
    const opts = { trocken }
    let r
    if (item.typ === 'karussell') r = await ig.veroeffentlicheKarussell({ dateien, caption }, opts)
    else if (item.typ === 'reel') r = await ig.veroeffentlicheReel({ video: dateien.find((f) => f.endsWith('.mp4')), caption, cover: dateien.find((f) => f.endsWith('.jpg')) }, opts)
    else r = await ig.veroeffentlicheStory({ datei: dateien[0] }, opts)
    if (!trocken) {
      item.status = 'veroeffentlicht'
      item.ig = { id: r.id, permalink: r.permalink, am: new Date().toISOString() }
      item.fehler = null
      await speichereQueue(q)
      log(`Veröffentlicht: ${r.permalink}`)
      // Bilder werden nicht mehr gebraucht; sie bleiben nur in der Git-Historie
      try { fs.rmSync(path.dirname(dateien[0]), { recursive: true, force: true }) } catch {}
    } else log('Trockenlauf ok', JSON.stringify(r).slice(0, 300))
  } catch (e) {
    item.versuche = (item.versuche || 0) + 1
    item.fehler = String(e.message || e).slice(0, 500)
    if (item.versuche >= 3) item.status = 'fehler'
    if (!trocken) await speichereQueue(q)
    log(`FEHLER bei ${item.id}: ${item.fehler}`)
    fehler++
  }
}
process.exit(fehler ? 1 : 0)
