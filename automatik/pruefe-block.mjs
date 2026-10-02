// Prüft Karussell-Blöcke (Markdown-Dateien im Format von docs/content-posts.md) gegen die 6-Seiten-Regel und die Formregeln.
// Aufruf: node automatik/pruefe-block.mjs datei1.md [datei2.md …]   (Exit 1 bei Verstößen)
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { readPosts } from '../render/inhalt.mjs'
import { pruefeStruktur } from './karussell-regeln.mjs'

let schlecht = 0
for (const f of process.argv.slice(2)) {
  const tmp = path.join(os.tmpdir(), `block-${process.pid}.md`)
  fs.writeFileSync(tmp, '# Karussells\n\n' + fs.readFileSync(f, 'utf8').replace(/^# .*\n/m, '') + '\n# Stories\n')
  let posts = []
  try { posts = readPosts(tmp) } catch (e) { console.log(`${f}: nicht lesbar (${e.message})`); schlecht++; continue } finally { fs.rmSync(tmp, { force: true }) }
  if (!posts.length) { console.log(`${f}: kein Block gelesen`); schlecht++; continue }
  for (const p of posts) {
    const fehler = pruefeStruktur(p)
    const tags = (p.hashtags || '').split(/\s+/).filter((x) => x.startsWith('#'))
    if (tags.length < 1 || tags.length > 5) fehler.push(`${tags.length} Hashtags`)
    if (!p.caption || p.caption.length > 2100) fehler.push('Caption fehlt oder zu lang')
    const hatAngebot = p.angebot && !/^keins?$/i.test(p.angebot)
    if (hatAngebot && !/link in der bio/i.test(p.caption)) fehler.push('Caption: Angebot ohne „Link in der Bio“')
    if (!hatAngebot && /link in der bio/i.test(p.caption)) fehler.push('Caption: Link in der Bio ohne Angebot')
    if (/Aufgabe\s*[12]/i.test(JSON.stringify(p) + p.caption)) fehler.push('Aufgabe-Schema')
    if (fehler.length) { schlecht++; console.log(`Karussell ${p.nr} ${p.titel}: ${fehler.join(' | ')}`) } else console.log(`Karussell ${p.nr} ${p.titel}: ok`)
  }
}
process.exit(schlecht ? 1 : 0)
