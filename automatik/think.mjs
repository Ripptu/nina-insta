// Wöchentlicher Denk-Lauf: liest Messwerte und learnings.md, schreibt einen Eintrag und ändert höchstens
// EINE freie Variable in plan/params.json. Die festen Regeln aus CLAUDE.md bleiben unberührt (Whitelist im Code).
import fs from 'node:fs'
import path from 'node:path'
import { frageClaude, extrahiereJson } from './claude.mjs'
import { berlin } from './zeit.mjs'

const ROOT = path.resolve(new URL('..', import.meta.url).pathname)
const lies = (f) => (fs.existsSync(path.join(ROOT, f)) ? fs.readFileSync(path.join(ROOT, f), 'utf8') : '')
const params = JSON.parse(lies('plan/params.json'))
const mw = lies('data/messwerte.json') ? JSON.parse(lies('data/messwerte.json')) : { konto: [], beitraege: {} }
const posts = Object.values(mw.beitraege).map((b) => ({ id: b.id, titel: b.titel, typ: b.typ, kernthema: b.kernthema, angebot: b.angebot, zeit: b.zeit, ...b.verlauf[b.verlauf.length - 1] }))
const datum = berlin().datum
const trocken = process.argv.includes('--trocken')

if (posts.length < 8) {
  const eintrag = `\n## ${datum}: Zu wenig Daten\n- Beobachtung: ${posts.length} gemessene Beiträge, für eine Aussage braucht der Denk-Lauf mindestens 8.\n- Beleg: ${posts.length} von 8 nötigen Beiträgen.\n- Entscheidung: Keine Änderung, Ausgangswerte bleiben (${JSON.stringify(params.feed.tage)}, Uhrzeit ${params.feed.uhrzeit}).\n`
  console.log(eintrag)
  if (!trocken) fs.appendFileSync(path.join(ROOT, 'learnings.md'), eintrag)
  process.exit(0)
}

const prompt = `Du wertest die Instagram-Leistung von @ninahoemmencoaching aus. Heute ist ${datum}.

AKTUELLE STELLGRÖSSEN (plan/params.json):
${JSON.stringify(params, null, 1)}

BISHERIGE ERKENNTNISSE (learnings.md):
${lies('learnings.md').slice(-6000)}

FOLLOWER-VERLAUF: ${JSON.stringify(mw.konto.slice(-30))}

BEITRÄGE MIT KENNZAHLEN (letzter Messwert):
${JSON.stringify(posts)}

AUFGABE: Finde genau ein Muster, das die Zahlen belegen (Format, Wochentag, Thema, Angebot, Hook-Art), und entscheide, ob eine einzige Stellgröße geändert wird. Erlaubte Änderungen, nur diese:
- feed.uhrzeit (Format "HH:MM", zwischen 17:00 und 21:30)
- feed.tage (Objekt Wochentag 1-5 -> "reel" oder "karussell"; mindestens 2 Karussells und 2 Reels pro Woche)
- stories.uhrzeit (Format "HH:MM", zwischen 09:00 und 20:00)
Nicht erlaubt und nicht deine Aufgabe: Marke, Schutzregeln, Angebotsregeln, Themenverbote, alles aus CLAUDE.md. Ändere nichts, wenn die Daten kein klares Muster zeigen (kleine Stichprobe, Streuung). Behaupte nichts ohne Zahl.

Antworte NUR mit einem JSON-Objekt:
{"beobachtung": "...", "beleg": "mit konkreten Zahlen aus den Daten", "entscheidung": "...", "aenderung": null oder {"pfad": "feed.uhrzeit", "wert": "19:30"}, "naechster_test": "was in den nächsten zwei Wochen geprüft wird"}`

const antwort = extrahiereJson(await frageClaude(prompt))
if (!antwort || !antwort.beobachtung || !/\d/.test(antwort.beleg || '')) throw new Error('Denk-Lauf: Antwort unbrauchbar (ohne Beleg mit Zahlen).')

const ERLAUBT = {
  'feed.uhrzeit': (v) => /^(1[7-9]|2[0-1]):[0-5]\d$/.test(v) && v <= '21:30',
  'stories.uhrzeit': (v) => /^(09|1\d):[0-5]\d$/.test(v) && v <= '20:00',
  'feed.tage': (v) => v && typeof v === 'object' && ['1', '2', '3', '4', '5'].every((t) => ['reel', 'karussell'].includes(v[t])) && Object.values(v).filter((x) => x === 'karussell').length >= 2 && Object.values(v).filter((x) => x === 'reel').length >= 2,
}
let angewendet = 'keine Änderung'
if (antwort.aenderung) {
  const { pfad, wert } = antwort.aenderung
  if (!ERLAUBT[pfad] || !ERLAUBT[pfad](wert)) console.log(`Änderung ${pfad} abgelehnt (nicht erlaubt oder ungültig).`)
  else {
    const [a, b] = pfad.split('.')
    params[a][b] = wert
    angewendet = `${pfad} = ${JSON.stringify(wert)}`
    if (!trocken) fs.writeFileSync(path.join(ROOT, 'plan/params.json'), JSON.stringify(params, null, 2) + '\n')
  }
}
const eintrag = `\n## ${datum}: ${antwort.beobachtung.slice(0, 80)}\n- Beobachtung: ${antwort.beobachtung}\n- Beleg: ${antwort.beleg}\n- Entscheidung: ${antwort.entscheidung} (${angewendet})\n- Nächster Test: ${antwort.naechster_test || 'offen'}\n`
console.log(eintrag)
if (!trocken) fs.appendFileSync(path.join(ROOT, 'learnings.md'), eintrag)
