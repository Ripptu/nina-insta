// Testlauf für den QA-Agenten: ruft pruefe() für vier Beiträge auf (echte Claude-Aufrufe über die CLI und das Abo).
//   node automatik/qa/test/lauf.mjs            (baut die Testbeiträge bei Bedarf mit bauen.mjs)
//   node automatik/qa/test/lauf.mjs a c        (nur einzelne Fälle)
// Ausgabe: Tabelle erwartet / tatsächlich / Dauer, darunter die Gründe. Exit-Code 1, wenn ein Fall abweicht.
//
// Erwartung: a, b, c abgelehnt (mit den unten genannten Gründen), gut ok.
//
// FEHLALARME UND SCHWÄCHEN (Stand 29.09.2026, bitte bei jedem Lauf nachtragen):
// - Der Prompt wurde mit einem Ersatzprüfer abgestimmt (Claude-Subagent, gleicher Prompt, gleiche Bilder, Modell Sonnet),
//   weil die Claude-CLI in der Entwicklungsumgebung nicht angemeldet war („Not logged in“, `claude auth status` → loggedIn: false).
//   Der erste echte CLI-Lauf steht aus. Ohne Anmeldung liefert pruefe() „Prüfung nicht durchführbar“ und diese
//   Testtabelle zählt das nie als bestanden.
// - Ergebnis mit dem Ersatzprüfer, zweite Runde: a abgelehnt (GESICHT), b abgelehnt (SCHEMA, ERFUNDEN, SCHUTZ, ZIELGRUPPE, GRENZE),
//   c abgelehnt (GESICHT, LESBAR, BILD, COVER, SCHUTZ, HASHTAGS), gut ok.
// - Fehlalarme der ersten Runde, inzwischen behoben:
//   1. GRENZE auf dem guten Beitrag („Wer ich bin“ handelt von „sich nicht öffnen können“). Die Regel gilt jetzt nur für Beiträge,
//      die zum Bleiben, Verzeihen, Aushalten oder Öffnen gegenüber einem Gegenüber raten oder davon handeln.
//   2. Die Markierungs-Leiste „Kopieren / Alles auswählen / Nachschlagen“ und die starke Abdunklung wurden als Render-Artefakt
//      gemeldet. Sie gehören zum Stil und stehen jetzt als Ausnahme in regeln.md.
// - Weiter möglich: Ninas Biografie („seit 2008 in Oldenburg“) als ERFUNDEN, „Frauen in Frauenkreisen“ als ZIELGRUPPE (beides
//   erlaubt die Prüfliste ausdrücklich); LOGO bei sehr hellen Fotos (Seite 6 von Karussell 1: schwach, aber vorhanden).
// - Fall b wird zusätzlich wegen GRENZE (Thema „zu lange bleiben“) abgelehnt; das ist gewollt, nicht der Kernfehler des Falls.
// - Verzerrung (Fall c, Seite 2) erkennt der Prüfer nur bei starker Streckung; leichte Verzerrung (< ca. 10 %) entgeht ihm.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { pruefe } from '../../qa.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '../../..')
const DIR = path.join(ROOT, 'material/qa-test')

const FAELLE = [
  { name: 'a', erwartet: 'abgelehnt', beschreibung: 'Überschrift über Ninas Gesicht', schluessel: ['GESICHT'] },
  { name: 'b', erwartet: 'abgelehnt', beschreibung: '„Aufgabe 1/2“, erfundene Zahl, Diagnose', schluessel: ['SCHEMA', 'ERFUNDEN', 'SCHUTZ'] },
  { name: 'c', erwartet: 'abgelehnt', beschreibung: 'Heilversprechen, 8 Hashtags, abgeschnitten, verzerrt', schluessel: ['SCHUTZ', 'HASHTAGS', 'LESBAR', 'BILD'] },
  { name: 'gut', erwartet: 'ok', beschreibung: 'Karussell 1 (Wer ich bin)', schluessel: [] },
]
const wahl = process.argv.slice(2)
const faelle = FAELLE.filter((f) => !wahl.length || wahl.includes(f.name))

if (!faelle.every((f) => fs.existsSync(path.join(DIR, f.name, 'item.json')))) {
  console.log('Baue Testbeiträge …')
  execFileSync(process.execPath, [path.join(HERE, 'bauen.mjs')], { stdio: 'inherit' })
}

const zeilen = []
let abweichungen = 0
for (const f of faelle) {
  const d = path.join(DIR, f.name)
  const item = JSON.parse(fs.readFileSync(path.join(d, 'item.json'), 'utf8'))
  const t = Date.now()
  const r = await pruefe(item, d)
  const sek = ((Date.now() - t) / 1000).toFixed(0)
  const gefunden = f.schluessel.filter((k) => r.gruende.some((g) => g.startsWith(k)))
  const technisch = r.gruende.some((g) => g.startsWith('Prüfung nicht durchführbar')) // zählt nie als bestanden
  const passt = r.verdikt === f.erwartet && !technisch && (f.erwartet === 'ok' || gefunden.length > 0)
  if (!passt) abweichungen++
  zeilen.push({ f, r, sek, passt, gefunden })
}

const pad = (s, n) => String(s).padEnd(n)
console.log('\n' + pad('Fall', 6) + pad('erwartet', 11) + pad('tatsächlich', 13) + pad('passt', 7) + pad('Dauer', 8) + 'erwartete Gründe gefunden')
for (const { f, r, sek, passt, gefunden } of zeilen)
  console.log(pad(f.name, 6) + pad(f.erwartet, 11) + pad(r.verdikt, 13) + pad(passt ? 'ja' : 'NEIN', 7) + pad(sek + ' s', 8) + (f.schluessel.length ? `${gefunden.length}/${f.schluessel.length} (${gefunden.join(', ') || '-'})` : '-'))
for (const { f, r } of zeilen) {
  console.log(`\n[${f.name}] ${f.beschreibung}`)
  for (const g of r.gruende) console.log('  - ' + g)
  for (const h of r.hinweise || []) console.log('  (Hinweis) ' + h)
}
console.log(abweichungen ? `\n${abweichungen} Abweichung(en).` : '\nAlle Fälle wie erwartet.')
process.exit(abweichungen ? 1 : 0)
