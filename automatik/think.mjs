// Wöchentlicher Denk-Lauf: liest Messwerte und learnings.md, schreibt einen Eintrag und ändert höchstens
// EINE freie Variable in plan/params.json. Die festen Regeln aus CLAUDE.md bleiben unberührt (Whitelist im Code).
import fs from 'node:fs'
import path from 'node:path'
import { frageClaude, extrahiereJson } from './claude.mjs'
import { berlin } from './zeit.mjs'
import { ladeQueue } from './queue.mjs'
import { erfolgsmuster } from './lernen.mjs'

const ROOT = path.resolve(new URL('..', import.meta.url).pathname)
const lies = (f) => (fs.existsSync(path.join(ROOT, f)) ? fs.readFileSync(path.join(ROOT, f), 'utf8') : '')
const params = JSON.parse(lies('plan/params.json'))
const mw = lies('data/messwerte.json') ? JSON.parse(lies('data/messwerte.json')) : { konto: [], beitraege: {} }
const posts = Object.values(mw.beitraege).map((b) => ({ id: b.id, titel: b.titel, typ: b.typ, kernthema: b.kernthema, angebot: b.angebot, zeit: b.zeit, ...b.verlauf[b.verlauf.length - 1] }))
const datum = berlin().datum
const trocken = process.argv.includes('--trocken')

const muster = erfolgsmuster(mw, await ladeQueue())
if (!trocken) fs.writeFileSync(path.join(ROOT, 'data/erfolgsmuster.md'), `Stand ${datum}\n\n${muster}\n`)

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

ERFOLGSMUSTER NACH INHALT (berechnet aus denselben Zahlen):
${muster}

NINAS WÜNSCHE (gelten immer, nicht verhandelbar):
${lies('docs/nina-wuensche.md')}

BISHERIGE SCHREIBREGELN (data/schreib-lernen.md, aus der Vorwoche):
${lies('data/schreib-lernen.md') || 'noch keine'}

AUFGABE: Finde genau ein Muster, das die Zahlen belegen (Format, Wochentag, Thema, Angebot, Hook-Art), und entscheide, ob eine einzige Stellgröße geändert wird. Erlaubte Änderungen, nur diese:
- feed.uhrzeit (Format "HH:MM", zwischen 19:00 und 21:30; das Veröffentlichen läuft per Cron erst ab 20:05 Berliner Sommerzeit, frühere Zeiten würden nie treffen)
${params.reels_aktiv ? '- feed.tage (Objekt Wochentag 1-5 -> "reel" oder "karussell"; mindestens 2 Karussells und 2 Reels pro Woche)\n' : '(feed.tage bleibt unverändert: Reels sind pausiert, es gibt nur Karussells.)\n'}- stories.uhrzeit (Format "HH:MM", zwischen 11:00 und 14:00; der Cron für Stories läuft nur zwischen 11:35 und 15:05 Berliner Zeit)
ZWEITE AUFGABE (Inhalt): Leite aus dem Erfolgsmuster höchstens 5 Schreibregeln ab, nach denen die nächsten Beiträge geschrieben werden (Hook-Art, Kernthema, Bezug zum Buch, Format, Schlussseite, Reel-Art). Jede Regel braucht einen Beleg mit Zahlen aus den Daten und darf Ninas Wünschen und CLAUDE.md nie widersprechen. Behalte Regeln aus der Vorwoche, die die Zahlen weiter stützen, streiche die, die nicht mehr halten. Bei zu kleiner Stichprobe schreibe die Regel als Test ("testen: …") statt als Gesetz.
Nicht erlaubt und nicht deine Aufgabe: Marke, Schutzregeln, Angebotsregeln, Themenverbote, alles aus CLAUDE.md. Ändere nichts, wenn die Daten kein klares Muster zeigen (kleine Stichprobe, Streuung). Behaupte nichts ohne Zahl.

Antworte NUR mit einem JSON-Objekt:
{"beobachtung": "...", "beleg": "mit konkreten Zahlen aus den Daten", "entscheidung": "...", "aenderung": null oder {"pfad": "feed.uhrzeit", "wert": "19:30"}, "naechster_test": "was in den nächsten zwei Wochen geprüft wird", "schreibregeln": [{"regel": "...", "beleg": "mit Zahlen"}]}`

const antwort = extrahiereJson(await frageClaude(prompt))
if (!antwort || !antwort.beobachtung || !/\d/.test(antwort.beleg || '')) throw new Error('Denk-Lauf: Antwort unbrauchbar (ohne Beleg mit Zahlen).')

// feed.uhrzeit: nicht vor 19:00, weil der Cron in veroeffentlichen.yml erst ab 20:05 (Sommerzeit) bzw. 19:05 (Winterzeit) läuft;
// eine frühere Zeit ließe das Fenster (uhrzeit + fenster_min) an allen Cron-Läufen vorbeigehen und nichts würde veröffentlicht.
// stories.uhrzeit: nur 11:00 bis 14:00, weil die Story-Crons (10:35/11:05 bis 12:35/13:05 UTC) nur diesen Bereich abdecken.
// feed.tage: nur mit aktiven Reels, sonst würde die Vorgabe „mindestens 2 Reels“ die pausierten Reels wieder einschalten.
const ERLAUBT = {
  'feed.uhrzeit': (v) => /^(19|20|21):[0-5]\d$/.test(v) && v <= '21:30',
  'stories.uhrzeit': (v) => /^1[1-4]:[0-5]\d$/.test(v) && v <= '14:00',
  'feed.tage': (v) => params.reels_aktiv && v && typeof v === 'object' && ['1', '2', '3', '4', '5'].every((t) => ['reel', 'karussell'].includes(v[t])) && Object.values(v).filter((x) => x === 'karussell').length >= 2 && Object.values(v).filter((x) => x === 'reel').length >= 2,
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
// Schreibregeln: nur solche mit Zahlenbeleg, höchstens 5, ersetzen jede Woche die alte Fassung.
const regeln = (Array.isArray(antwort.schreibregeln) ? antwort.schreibregeln : []).filter((r) => r?.regel && /\d/.test(r.beleg || '')).slice(0, 5)
if (regeln.length && !trocken) fs.writeFileSync(path.join(ROOT, 'data/schreib-lernen.md'), `Stand ${datum} (Denk-Lauf, aus den eigenen Zahlen)\n\n${regeln.map((r) => `- ${r.regel}\n  Beleg: ${r.beleg}`).join('\n')}\n`)

const eintrag = `\n## ${datum}: ${antwort.beobachtung.slice(0, 80)}\n- Beobachtung: ${antwort.beobachtung}\n- Beleg: ${antwort.beleg}\n- Entscheidung: ${antwort.entscheidung} (${angewendet})\n- Nächster Test: ${antwort.naechster_test || 'offen'}\n${regeln.length ? `- Schreibregeln: ${regeln.map((r) => r.regel).join(' | ')}\n` : ''}`
console.log(eintrag)
if (!trocken) fs.appendFileSync(path.join(ROOT, 'learnings.md'), eintrag)
