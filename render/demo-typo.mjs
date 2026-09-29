import * as Y from './typo.mjs'
import { renderPages } from './render.mjs'
import fs from 'node:fs'
const files = JSON.parse(fs.readFileSync('sheet.json', 'utf8'))
const P = (i) => process.env.HOME + '/NINA/' + files[i]
const pages = [
  Y.photoPage(
    Y.big('Früher<br>dachte ich,', { x: 56, y: 70, size: 168, color: '#fff' }) +
    Y.big('Liebe sei einfach.', { x: 56, y: 395, size: 140, color: Y.PINK, width: 560 }) +
    Y.script('wer ich bin und warum ich begleite', { x: 560, y: 1020, size: 100, rot: -4, width: 480 }) +
    Y.arrow(400, 1100, { w: 150, rot: 10 }),
    { photo: P(11), pos: '50% 100%', size: 'auto 122%', dark: 0.2, bottom: 0.35 }),
  Y.textDark({ photo: P(36), pos: '50% 30%', dark: 0.6, y: 420, size: 68,
    html: `Meine erste Beziehung war von ${Y.hl('Drama, Eifersucht und Schmerz')} geprägt. Später sahen meine Beziehungen von außen gut aus. Innen fühlte ich mich oft leer und unsicher.` }),
  Y.photoPage(Y.big('„Ich fragte mich, warum ich mich nicht wirklich öffnen konnte.“', { x: 60, y: 560, size: 112, color: Y.BUTTER, width: 960 }) + Y.script('Nina', { x: 760, y: 1120, size: 120, rot: -5, width: 260 }) + Y.curl(700, 1200, { w: 220 }), { photo: P(5), pos: '50% 20%', dark: 0.3 }),
  Y.photoPage(Y.big('about me', { x: 0, y: 1050, size: 220, color: Y.PINK, width: 1080, align: 'center' }) +
    Y.pill('aufgewachsen im Emsland', { x: 60, y: 520 }) + Y.pill('seit 2008 in Oldenburg', { x: 610, y: 600 }) +
    Y.pill('Kraft tanken in Dänemark', { x: 50, y: 760 }) + Y.pill('Pferde & Hunde', { x: 700, y: 840 }) + Y.pill('tiefe Gespräche', { x: 80, y: 930 }), { photo: P(22), pos: '50% 20%', dark: 0.1, bottom: 0.5, logo: false }),
  Y.photoPage(Y.bubble('Und wie fange ich an?', { x: 60, y: 780, width: 560 }) +
    Y.bubble('Mit einem kostenfreien Erstgespräch. Link in der Bio.', { x: 380, y: 930, width: 640, kind: 'white' }) +
    Y.script('heute begleite ich dich', { x: 50, y: 70, size: 120, rot: -4, width: 460 }),
    { photo: P(16), pos: '50% 35%', dark: 0.15, bottom: 0.4 }),
]
const out = await renderPages(pages, '../material/typo-k1', { palette: false })
console.log(out.length)
