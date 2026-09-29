// Schreibt neue Karussells, Reels oder Stories, wenn der Vorrat zur Neige geht. Claude über das Abo.
// Aufruf: node automatik/neu-schreiben.mjs --typ karussell|reel|story [--anzahl 3] [--auto <Datei>]
// Ergebnis wird an docs/content-posts-auto.md, docs/content-reels-auto.md bzw. docs/content-stories-auto.md angehängt (--auto
// nennt eine andere Zieldatei), nachdem der Parser es lesen konnte und die harten Formregeln erfüllt sind. Die inhaltliche
// Prüfung macht danach der Prüf-Agent (qa.mjs). Stories: Regeln, Plan und Prompt stehen in automatik/story-regeln.mjs.
// Ist Claude nicht erreichbar (lokal nicht angemeldet), gibt es eine Meldung und Exit-Code 2, sonst nichts; vorrat.mjs macht dann
// weiter. Exit-Code 1: Neuschreiben gescheitert oder Vorrat nicht lesbar.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { frageClaude } from './claude.mjs'
import { ladeQueue } from './queue.mjs'
import { readPosts } from '../render/inhalt.mjs'
import { readReels } from '../render/reel.mjs'
import { readStories } from '../render/story.mjs'
import { planeStories, pruefeStories, baueStoryPrompt, beispielBlock } from './story-regeln.mjs'

const ROOT = path.resolve(new URL('..', import.meta.url).pathname)
const args = process.argv.slice(2)
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d)
const typ = opt('--typ', 'karussell')
const anzahl = +opt('--anzahl', 3)
const lies = (f) => (fs.existsSync(path.join(ROOT, f)) ? fs.readFileSync(path.join(ROOT, f), 'utf8') : '')
const cfg = typ === 'reel'
  ? { basis: 'docs/content-reels.md', auto: opt('--auto', 'docs/content-reels-auto.md'), parse: readReels, wort: 'Reel', beispiel: (md) => md.match(/## Reel 3:[\s\S]*?(?=\n---\n)/)?.[0] }
  : typ === 'story'
    ? { basis: 'docs/content-posts.md', auto: opt('--auto', 'docs/content-stories-auto.md'), parse: readStories, wort: 'Story' }
    : { basis: 'docs/content-posts.md', auto: opt('--auto', 'docs/content-posts-auto.md'), parse: readPosts, wort: 'Karussell', beispiel: (md) => md.match(/## Karussell 2:[\s\S]*?(?=\n## )/)?.[0] }
const story = typ === 'story'
if (!['karussell', 'reel', 'story'].includes(typ)) { console.log(`Unbekannter Typ „${typ}“ (karussell, reel oder story).`); process.exit(1) }

const autoPfad = path.resolve(ROOT, cfg.auto)
let vorhanden
try {
  vorhanden = [...cfg.parse(path.join(ROOT, cfg.basis)), ...(fs.existsSync(autoPfad) ? cfg.parse(autoPfad) : [])]
} catch (e) {
  // Nie auf eine kaputte Datei aufschreiben: erst reparieren, dann neu schreiben.
  console.log(`Neuschreiben ${typ} abgebrochen: Vorrat nicht lesbar (${e.message})`)
  process.exit(1)
}
const q = await ladeQueue()
const themen = [...new Set([...vorhanden.map((p) => p.titel), ...q.map((x) => x.titel)])].slice(story ? -80 : -60)
const angebotsFolge = ['Coaching', 'Buch', 'keins', 'Veranstaltungen', 'Shop', 'keins']
const start = vorhanden.length
const werbeAngebote = ['Buch', 'Coaching', 'Shop', 'Veranstaltungen']
// Bei Karussells ist jeder vierte Beitrag ein Werbe-Beitrag (Format: Werbung), der ein Angebot ausführlich vorstellt.
// Stories: fortlaufende Nummern (auch über die Queue-IDs hinaus), Interaktion und Kernthema im Wechsel, nie ein Angebot.
const plan = story
  ? planeStories(vorhanden, anzahl, q.map((x) => x.id))
  : (() => {
      const naechsteNr = Math.max(...vorhanden.map((p) => p.nr)) + 1
      return Array.from({ length: anzahl }, (_, i) => {
        const werbung = cfg.wort === 'Karussell' && (start + i) % 4 === 3
        return { nr: naechsteNr + i, werbung, angebot: werbung ? werbeAngebote[Math.floor((start + i) / 4) % 4] : angebotsFolge[(start + i) % 6] }
      })
    })()

const basisText = lies(cfg.basis)
const beispiel = story ? null : cfg.beispiel(basisText)
const beispiele = story ? [...new Set(plan.map((p) => p.interaktion))].map((i) => beispielBlock(basisText, i)).filter(Boolean) : []
if (story ? !beispiele.length : !beispiel) throw new Error('Beispielblock nicht gefunden.')

const grund = (fehler) => (story
  ? baueStoryPrompt({ regeln: lies('CLAUDE.md'), strategie: lies('docs/strategie.md').slice(0, 14000), learnings: lies('learnings.md').slice(-2500), themen, plan, beispiele, fehler })
  : `Du schreibst neue ${cfg.wort === 'Reel' ? 'Reels' : 'Karussell-Beiträge'} für den Instagram-Account @ninahoemmencoaching (Nina Hömmen, traumasensible Single- und Beziehungscoachin, Oldenburg und online).

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

Gib NUR die neuen Blöcke aus, ohne Vorwort und ohne Codeblock, getrennt durch eine Zeile "---".`)

// Kopf, den der Parser für den Abschnitt braucht (readPosts sucht "# Karussells", readStories "# Stories")
const ABSCHNITT = { karussell: '# Karussells\n\n', story: '# Stories\n\n', reel: '' }[typ]

function pruefe(text) {
  const tmp = path.join(os.tmpdir(), `neu-${process.pid}-${Date.now()}.md`)
  let gelesen
  try {
    fs.writeFileSync(tmp, ABSCHNITT + text)
    gelesen = cfg.parse(tmp)
  } catch (e) { return `Parser: ${e.message}` } finally { fs.rmSync(tmp, { force: true }) }
  if (story) return pruefeStories(gelesen, plan, { titel: vorhanden.map((s) => s.titel), texte: vorhanden.flatMap((s) => [s.text, s.aufloesung]).filter(Boolean) })
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
  try {
    text = (await frageClaude(grund(fehler), { modell: 'sonnet', timeoutMs: 1_200_000 })).trim().replace(/^```\w*\n?|```$/g, '').trim()
  } catch (e) {
    // Claude fehlt oder ist nicht angemeldet (lokal): kein Stacktrace, nichts geschrieben, der Aufrufer macht weiter.
    console.log(`Neuschreiben ${typ} übersprungen, Claude nicht verfügbar: ${e.message}`)
    process.exit(2)
  }
  fehler = pruefe(text)
  console.log(`Versuch ${versuch}: ${fehler || 'ok'}`)
  if (!fehler) break
}
if (fehler) { console.log('Neuschreiben gescheitert:', fehler); process.exit(1) }
const titelWort = { Reel: 'Reels', Karussell: 'Karussells', Story: 'Stories' }[cfg.wort]
const kopf = fs.existsSync(autoPfad) ? '' : `# Automatisch geschriebene ${titelWort}\n\nVom Neuschreib-Lauf (neu-schreiben.mjs), vor der Veröffentlichung vom Prüf-Agenten kontrolliert.\n\n${ABSCHNITT}`
fs.appendFileSync(autoPfad, kopf + text + '\n\n---\n\n')
console.log(`${anzahl} neue ${cfg.wort}-Beiträge in ${cfg.auto}`)
