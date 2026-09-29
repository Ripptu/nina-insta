// Baut die vier Testbeiträge für den QA-Agenten nach material/qa-test/<fall>/ (gitignored).
//   node automatik/qa/test/bauen.mjs
// a = Text über Ninas Gesicht (Gesichtsschutz absichtlich umgangen)
// b = „Aufgabe 1/2“, erfundene Zahl, Diagnose
// c = Heilversprechen, 8 Hashtags, abgeschnittener Text, verzerrtes Bild
// gut = Karussell 1 aus material/auto/k1 mit Caption aus docs/content-posts.md
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
process.chdir(path.join(ROOT, 'render')) // renderPages löst Schriften relativ zu render/ auf
const Y = await import(path.join(ROOT, 'render/typo.mjs'))
const { renderPages } = await import(path.join(ROOT, 'render/render.mjs'))
const { readPosts } = await import(path.join(ROOT, 'render/inhalt.mjs'))

const OUT = path.join(ROOT, 'material/qa-test')
const foto = (id) => {
  const cat = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/fotos.json'), 'utf8'))
  return path.join(process.env.FOTO_DIR || path.join(os.homedir(), 'NINA'), cat[id].file)
}
const speichere = (name, item) => fs.writeFileSync(path.join(OUT, name, 'item.json'), JSON.stringify(item, null, 2))
const dateien = (name, n) => Array.from({ length: n }, (_, i) => `seite-${String(i + 1).padStart(2, '0')}.jpg`)

// ---------- a: Text über dem Gesicht ----------
{
  const pages = [
    // Foto 13: Gesicht bei x 474–643, y 210–440 (nach Skalierung auf 1080 × 1350). Überschrift liegt genau darüber.
    Y.photoPage(Y.big('Immer wieder<br>dieselben<br>Falschen?', { x: 50, y: 200, size: 150, color: Y.BUTTER, width: 980 }) +
      Y.script('woran das liegen kann', { x: 400, y: 900, size: 96, width: 600 }), { photo: foto(13), pos: '50% 50%', dark: 0.25 }),
    Y.textDark({ photo: foto(22), pos: '50% 0%', dark: 0.6, y: 700, size: 62,
      html: `Vielleicht ist es kein Zufall, sondern ein ${Y.hl('Muster')}. Muster kannst du verstehen und Schritt für Schritt verändern.` }),
    Y.photoPage(Y.big('Nimm mit: Was fühlte sich bei deinem letzten „Ja“ eigentlich nach „Nein“ an?', { x: 60, y: 640, size: 78, color: Y.WHITE, width: 960 }) +
      Y.bubble('Wenn dich jemand klein macht oder kontrolliert, musst du das nicht aushalten. Hilfetelefon: 116 016', { x: 60, y: 900, width: 900, kind: 'white' }),
      { photo: foto(16), pos: '50% 20%', dark: 0.5 }),
  ]
  fs.mkdirSync(path.join(OUT, 'a'), { recursive: true })
  await renderPages(pages, path.join(OUT, 'a'), { palette: false, faceGuard: false, prefix: 'seite' })
  speichere('a', {
    id: 'qa-a', typ: 'karussell', titel: 'Immer wieder dieselben Falschen', angebot: 'keins', dateien: dateien('a', 3),
    caption: 'Immer wieder dieselben Falschen?\n\nVielleicht ist es kein Zufall, sondern ein Muster. Muster kannst du verstehen und Schritt für Schritt verändern.\n\nNimm diesen Satz mit: Was fühlte sich bei deinem letzten „Ja“ eigentlich nach „Nein“ an?\n\nWenn dich jemand klein macht, kontrolliert oder verletzt, ist das kein Muster, das du aushalten musst. Hilfetelefon „Gewalt gegen Frauen“: 116 016.\n\nFolge @ninahoemmencoaching, wenn du verstehen willst, warum sich in deiner Liebe manches wiederholt.\n\nWas hat sich bei dir zuletzt nach „Nein“ angefühlt?',
    hashtags: ['#beziehungsmuster', '#traumasensibel', '#coachingoldenburg'],
  })
}

// ---------- b: „Aufgabe 1/2“, erfundene Zahl, Diagnose ----------
{
  const pages = [
    Y.photoPage(Y.big('87 % der<br>Frauen<br>bleiben<br>zu lange.', { x: 50, y: 60, size: 130, color: Y.BUTTER, width: 470 }), { photo: foto(11), pos: '50% 100%', size: 'auto 122%', dark: 0.2, bottom: 0.35 }),
    Y.textDark({ photo: foto(3), pos: '50% 40%', dark: 0.6, y: 760, size: 60,
      html: `${Y.hl('Du hast eine Bindungsstörung.')} Das erkennst du daran, dass du klammerst, sobald jemand Nähe zeigt.` }),
    Y.photoPage(Y.big('Aufgabe 1: Schreibe drei Sätze auf.<br>Aufgabe 2: Sprich sie laut aus.', { x: 60, y: 740, size: 76, color: Y.WHITE, width: 960 }) +
      Y.pill('Link in der Bio', { x: 260, y: 1230 }), { photo: foto(5), pos: '50% 20%', dark: 0.5 }),
  ]
  fs.mkdirSync(path.join(OUT, 'b'), { recursive: true })
  await renderPages(pages, path.join(OUT, 'b'), { palette: false, prefix: 'seite' })
  speichere('b', {
    id: 'qa-b', typ: 'karussell', titel: 'Zu lange geblieben', angebot: 'Coaching', dateien: dateien('b', 3),
    caption: '87 % der Frauen bleiben zu lange.\n\nDu hast eine Bindungsstörung, deshalb klammerst du, sobald jemand Nähe zeigt. Mach zwei Aufgaben: Aufgabe 1: Schreibe drei Sätze auf. Aufgabe 2: Sprich sie laut aus.\n\nWenn du mit mir daran arbeiten willst: Das Erstgespräch ist kostenfrei, Link in der Bio.\n\nWas denkst du dazu?',
    hashtags: ['#beziehungscoach', '#bindungsstoerung', '#coachingoldenburg'],
  })
}

// ---------- c: Heilversprechen, 8 Hashtags, abgeschnitten, verzerrt ----------
{
  const pages = [
    // Seite 1: Text ragt links und rechts aus dem Bild
    Y.photoPage(Y.big('Nie wieder<br>Liebeskummer', { x: -180, y: 80, size: 210, color: Y.BUTTER, width: 1500 }), { photo: foto(0), pos: '50% 100%', size: 'auto 122%', dark: 0.25 }),
    // Seite 2: Foto stark verzerrt (in die Breite gezogen)
    Y.textDark({ photo: foto(3), pos: '50% 50%', dark: 0.45, y: 800, size: 62,
      html: `Mit meiner Methode bist du nach diesem Beitrag ${Y.hl('geheilt')}, garantiert.` }).replace('background-size:cover', 'background-size:100% 100%').replace(/background-size:cover;/, 'background-size:190% 100%;'),
    Y.photoPage(Y.big('Du wirst nie wieder<br>an den Falschen<br>geraten.', { x: 60, y: 700, size: 96, color: Y.WHITE, width: 960 }) +
      Y.pill('Link in der Bio', { x: 260, y: 1230 }), { photo: foto(5), pos: '50% 20%', dark: 0.5 }),
  ]
  fs.mkdirSync(path.join(OUT, 'c'), { recursive: true })
  await renderPages(pages, path.join(OUT, 'c'), { palette: false, faceGuard: false, prefix: 'seite' })
  speichere('c', {
    id: 'qa-c', typ: 'karussell', titel: 'Nie wieder Liebeskummer', angebot: 'Coaching', dateien: dateien('c', 3),
    caption: 'Nie wieder Liebeskummer.\n\nMit meiner Methode bist du nach diesem Beitrag geheilt, garantiert. Du wirst nie wieder an den Falschen geraten.\n\nDas Erstgespräch ist kostenfrei, Link in der Bio.\n\nFolge @ninahoemmencoaching.',
    hashtags: ['#liebe', '#heilung', '#beziehung', '#coach', '#single', '#trauma', '#selbstliebe', '#oldenburg'],
  })
}

// ---------- gut: Karussell 1 ----------
{
  const post = readPosts().find((p) => p.nr === 1)
  const dir = path.join(OUT, 'gut')
  fs.mkdirSync(dir, { recursive: true })
  const quelle = path.join(ROOT, 'material/auto/k1')
  const files = fs.readdirSync(quelle).filter((f) => /^\d+\.jpg$/.test(f)).sort()
  for (const f of files) fs.copyFileSync(path.join(quelle, f), path.join(dir, f))
  speichere('gut', {
    id: 'qa-gut', typ: 'karussell', titel: post.titel, angebot: post.angebot, dateien: files,
    caption: post.caption, hashtags: post.hashtags.split(/\s+/).filter(Boolean),
  })
}
console.log('fertig:', OUT)
