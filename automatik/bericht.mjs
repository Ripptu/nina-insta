// Wochenbericht per Gmail (SMTP, App-Passwort). Aufruf: node automatik/bericht.mjs [--trocken]
import fs from 'node:fs'
import path from 'node:path'
import nodemailer from 'nodemailer'
import { ladeQueue } from './queue.mjs'
import { zaehlePuffer } from './puffer-zaehlen.mjs'
import { berlin } from './zeit.mjs'

const ROOT = path.resolve(new URL('..', import.meta.url).pathname)
const trocken = process.argv.includes('--trocken')
const q = await ladeQueue()
const mw = fs.existsSync(path.join(ROOT, 'data/messwerte.json')) ? JSON.parse(fs.readFileSync(path.join(ROOT, 'data/messwerte.json'), 'utf8')) : { konto: [], beitraege: {} }
const cov = fs.existsSync(path.join(ROOT, 'data/cover-nutzung.json')) ? JSON.parse(fs.readFileSync(path.join(ROOT, 'data/cover-nutzung.json'), 'utf8')) : {}
const vor7 = new Date(Date.now() - 7 * 864e5).toISOString()
const woche = q.filter((x) => x.status === 'veroeffentlicht' && x.ig?.am >= vor7)
const letzter = (b) => b.verlauf[b.verlauf.length - 1] || {}
const zeile = (x) => {
  const b = Object.values(mw.beitraege).find((m) => m.id === x.id)
  const l = b ? letzter(b) : {}
  const kennz = ['views', 'reach', 'likes', 'saved', 'shares', 'kommentare'].filter((k) => l[k] != null).map((k) => `${k} ${l[k]}`).join(', ')
  return `- ${x.titel} (${x.typ}, ${x.ig.permalink})${kennz ? ': ' + kennz : ''}`
}
const k = mw.konto
const fol = k.length ? k[k.length - 1].follower : null
const fol7 = k.length > 1 ? k[Math.max(0, k.length - 8)].follower : null
const params = JSON.parse(fs.readFileSync(path.join(ROOT, 'plan/params.json'), 'utf8'))
const bereit = zaehlePuffer(q, params).feed
const fehler = q.filter((x) => ['fehler', 'abgelehnt', 'unklar'].includes(x.status))
const fbFehler = q.filter((x) => x.fb?.fehler && !x.fb?.id && x.ig?.am && Date.now() - new Date(x.ig.am).getTime() < 7 * 864e5)
const textCover =Object.values(cov).filter((v) => v === 'text').length
const naechste = q.filter((x) => x.status === 'geprueft').slice(0, 5)
const learn = fs.readFileSync(path.join(ROOT, 'learnings.md'), 'utf8').split('\n## ').slice(-1)[0].slice(0, 900)
const zeilen = [
  `Wochenbericht @ninahoemmencoaching, ${berlin().datum}`,
  '',
  `Follower: ${fol ?? 'noch keine Messung'}${fol != null && fol7 != null ? ` (${fol - fol7 >= 0 ? '+' : ''}${fol - fol7} in 7 Tagen)` : ''}`,
  `Veröffentlicht in den letzten 7 Tagen: ${woche.length}`,
  ...woche.map(zeile),
  '',
  `Puffer: ${bereit} geprüfte Beiträge bereit.`,
  ...(bereit < 10 ? ['ACHTUNG: Puffer unter 10, der Vorrat wird knapp.'] : []),
  ...(textCover ? [`Hinweis: ${textCover} Cover sind reine Textcover, weil alle Fotos schon Cover waren. Neue Fotos von Nina würden helfen.`] : []),
  ...(fbFehler.length ? ['', 'Facebook: nicht gespiegelt (Seiten-Token prüfen, siehe CLAUDE.md, Abschnitt Facebook-Spiegelung):', ...fbFehler.map((x) => `- ${x.id} ${x.titel}: ${x.fb.fehler}`)] : []),
  ...(fehler.length ? ['', 'Probleme:', ...fehler.map((x) => `- ${x.id} ${x.titel}: ${x.status} ${x.fehler || (x.qa?.gruende || []).join('; ')}`)] : []),
  '',
  'Als Nächstes geplant:',
  ...naechste.map((x) => `- ${x.titel} (${x.typ})`),
  '',
  'Letzte Erkenntnis:',
  learn.trim(),
]
const text = zeilen.join('\n')
console.log(text)
if (!trocken) {
  // Kopie für die App (Ansicht „Berichte“)
  const dir = path.join(ROOT, 'data/berichte')
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, `${berlin().datum}.txt`), text)
  const idxF = path.join(dir, 'index.json')
  const idx = fs.existsSync(idxF) ? JSON.parse(fs.readFileSync(idxF, 'utf8')) : []
  if (!idx.includes(berlin().datum)) idx.push(berlin().datum)
  fs.writeFileSync(idxF, JSON.stringify(idx))
}
if (trocken) process.exit(0)
const { GMAIL_USER, GMAIL_APP_PASSWORD, REPORT_TO } = process.env
if (!GMAIL_USER || !GMAIL_APP_PASSWORD || !REPORT_TO) { console.log('Mail-Zugang fehlt, kein Versand.'); process.exit(1) }
const t = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD.replace(/\s/g, '') } })
await t.sendMail({ from: `Nina Insta <${GMAIL_USER}>`, to: REPORT_TO, subject: `Nina Insta: Wochenbericht ${berlin().datum}`, text })
console.log('Bericht gesendet.')
