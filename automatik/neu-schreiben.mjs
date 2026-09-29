// Schreibt neue Karussells oder Reels, wenn der Vorrat zur Neige geht. Claude über das Abo.
// Aufruf: node automatik/neu-schreiben.mjs --typ karussell|reel [--anzahl 3]
// Ergebnis wird an docs/content-posts-auto.md bzw. docs/content-reels-auto.md angehängt, nachdem der Parser es lesen konnte
// und die harten Formregeln erfüllt sind. Die inhaltliche Prüfung macht danach der Prüf-Agent (qa.mjs).
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { frageClaude } from './claude.mjs'
import { ladeQueue } from './queue.mjs'
import { readPosts } from '../render/inhalt.mjs'
import { readReels } from '../render/reel.mjs'

const ROOT = path.resolve(new URL('..', import.meta.url).pathname)
const args = process.argv.slice(2)
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d)
const typ = opt('--typ', 'karussell')
const anzahl = +opt('--anzahl', 3)
const lies = (f) => (fs.existsSync(path.join(ROOT, f)) ? fs.readFileSync(path.join(ROOT, f), 'utf8') : '')
const cfg = typ === 'reel'
  ? { basis: 'docs/content-reels.md', auto: 'docs/content-reels-auto.md', parse: readReels, wort: 'Reel', beispiel: (md) => md.match(/## Reel 3:[\s\S]*?(?=\n---\n)/)?.[0] }
  : { basis: 'docs/content-posts.md', auto: 'docs/content-posts-auto.md', parse: readPosts, wort: 'Karussell', beispiel: (md) => md.match(/## Karussell 2:[\s\S]*?(?=\n## )/)?.[0] }

const autoPfad = path.join(ROOT, cfg.auto)
const vorhanden = [...cfg.parse(path.join(ROOT, cfg.basis)), ...(fs.existsSync(autoPfad) ? cfg.parse(autoPfad) : [])]
const naechsteNr = Math.max(...vorhanden.map((p) => p.nr)) + 1
const q = await ladeQueue()
const themen = [...new Set([...vorhanden.map((p) => p.titel), ...q.map((x) => x.titel)])].slice(-60)
const angebotsFolge = ['Coaching', 'Buch', 'keins', 'Veranstaltungen', 'Shop', 'keins']
const start = vorhanden.length
const werbeAngebote = ['Buch', 'Coaching', 'Shop', 'Veranstaltungen']
// Bei Karussells ist jeder vierte Beitrag ein Werbe-Beitrag (Format: Werbung), der ein Angebot ausführlich vorstellt
const plan = Array.from({ length: anzahl }, (_, i) => {
  const werbung = cfg.wort === 'Karussell' && (start + i) % 4 === 3
  return { nr: naechsteNr + i, werbung, angebot: werbung ? werbeAngebote[Math.floor((start + i) / 4) % 4] : angebotsFolge[(start + i) % 6] }
})

const basisText = lies(cfg.basis)
const beispiel = cfg.beispiel(basisText)
if (!beispiel) throw new Error('Beispielblock nicht gefunden.')

const grund = (fehler) => `Du schreibst neue ${cfg.wort === 'Reel' ? 'Reels' : 'Karussell-Beiträge'} für den Instagram-Account @ninahoemmencoaching (Nina Hömmen, traumasensible Single- und Beziehungscoachin, Oldenburg und online).

VERBINDLICHE REGELN (CLAUDE.md):
${lies('CLAUDE.md')}

STRATEGIE (Kernthemen, Caption-Aufbau, Wochenmodell):
${lies('docs/strategie.md').slice(0, 14000)}

ERLAUBTE ANGEBOTE (nur so, ohne Preise und Termine):
${lies('data/angebote.json')}

BISHERIGE ERKENNTNISSE:
${lies('learnings.md').slice(-2500)}

BEREITS VERWENDETE THEMEN/TITEL (nicht wiederholen, auch nicht sinngemäß): ${themen.join(' | ')}

AUFGABE: Schreibe ${anzahl} neue ${cfg.wort}-Blöcke mit diesen Nummern und Angeboten: ${plan.map((p) => `${cfg.wort} ${p.nr} (Angebot: ${p.angebot}${p.werbung ? ', Format: Werbung' : ''})`).join('; ')}.\nBei "Format: Werbung" stellt der ganze Beitrag das Angebot vor (Cover-Hook zum Nutzen, 4 bis 6 Seiten mit dem, was auf der Homepage oder in data/angebote.json steht, Schlussseite mit "Link in der Bio"), ohne Preise, Termine und erfundene Details; Vorbild sind Karussell 11 bis 14 in docs/content-posts.md. Metazeile "- Format: Werbung".
Halte dich EXAKT an das Format des Beispielblocks (Überschrift "## ${cfg.wort} N: Titel", Metazeilen mit "- Schlüssel: Wert", Tabelle, Caption mit "**Caption:**", "**Hashtags:**"). Jeder Beitrag hat einen Mitnahme-Satz, eine Frage am Ende der Caption, höchstens 5 Hashtags, "Link in der Bio" nur bei Angebot, keine erfundenen Zahlen, Studien, Kundenstimmen, Preise oder Termine, keine Diagnosen oder Heilversprechen, niemanden als "Frauen" ansprechen (Angebote für Frauen ausgenommen), Du-Form, kein Emoji auf Slides. Bei Themen, die riskant gelesen werden können (bleiben, verzeihen, Nähe zulassen), gehört die Grenze (Respektlosigkeit, Kontrolle, Gewalt) und das Hilfetelefon hinein. Neue Themen aus den vier Kernthemen, mit einem frischen Hook.
${fehler ? `\nDEIN LETZTER VERSUCH WURDE ABGELEHNT WEGEN: ${fehler}\nKorrigiere genau das.\n` : ''}
BEISPIELBLOCK (Format!):
${beispiel}

Gib NUR die neuen Blöcke aus, ohne Vorwort und ohne Codeblock, getrennt durch eine Zeile "---".`

function pruefe(text) {
  const tmp = path.join(os.tmpdir(), `neu-${Date.now()}.md`)
  fs.writeFileSync(tmp, (typ === 'karussell' ? '# Karussells\n\n' : '') + text)
  let gelesen
  try { gelesen = cfg.parse(tmp) } catch (e) { return `Parser: ${e.message}` }
  fs.rmSync(tmp)
  if (gelesen.length !== anzahl) return `${gelesen.length} statt ${anzahl} lesbare Blöcke`
  for (const g of gelesen) {
    const tags = (g.hashtags || '').split(/\s+/).filter((x) => x.startsWith('#'))
    if (tags.length > 5 || !tags.length) return `${cfg.wort} ${g.nr}: Hashtags ${tags.length}`
    if (!g.caption || g.caption.length > 2100) return `${cfg.wort} ${g.nr}: Caption fehlt oder zu lang`
    if (typ === 'karussell') {
      if (g.pages.length < 6 || g.pages.length > 10) return `Karussell ${g.nr}: ${g.pages.length} Seiten`
      if (g.pages[0].role !== 'cover') return `Karussell ${g.nr}: Seite 1 ist kein Cover`
      if (g.pages.some((p) => (p.text || p.head || '').split(/\s+/).length > 48)) return `Karussell ${g.nr}: eine Seite hat mehr als 48 Wörter`
    } else if (!g.ablauf?.length) return `Reel ${g.nr}: kein Ablauf`
    const alles = JSON.stringify(g) + g.caption
    if (/Aufgabe\s*[12]/i.test(alles)) return `${cfg.wort} ${g.nr}: Aufgabe-Schema`
    const p = plan.find((x) => x.nr === g.nr)
    if (!p) return `unerwartete Nummer ${g.nr}`
    if (p.angebot !== 'keins' && !/Link in der Bio/i.test(g.caption)) return `${cfg.wort} ${g.nr}: Angebot ohne „Link in der Bio“`
    if (p.angebot === 'keins' && /Link in der Bio/i.test(g.caption)) return `${cfg.wort} ${g.nr}: sollte ohne Angebot sein`
  }
  return null
}

let text = '', fehler = null
for (let versuch = 1; versuch <= 3; versuch++) {
  text = (await frageClaude(grund(fehler), { modell: 'sonnet', timeoutMs: 1_200_000 })).trim().replace(/^```\w*\n?|```$/g, '').trim()
  fehler = pruefe(text)
  console.log(`Versuch ${versuch}: ${fehler || 'ok'}`)
  if (!fehler) break
}
if (fehler) { console.log('Neuschreiben gescheitert:', fehler); process.exit(1) }
const kopf = fs.existsSync(autoPfad) ? '' : `# Automatisch geschriebene ${cfg.wort === 'Reel' ? 'Reels' : 'Karussells'}\n\nVom Neuschreib-Lauf (neu-schreiben.mjs), vor der Veröffentlichung vom Prüf-Agenten kontrolliert.\n\n${typ === 'karussell' ? '# Karussells\n\n' : ''}`
fs.appendFileSync(autoPfad, kopf + text + '\n\n---\n\n')
console.log(`${anzahl} neue ${cfg.wort}-Beiträge in ${cfg.auto}`)
