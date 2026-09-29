// Tests für das automatische Nachschreiben der Stories, ganz ohne Claude:
// Parser (readStories/alleStories), Plan, harte Formregeln und der ganze Ablauf von neu-schreiben.mjs --typ story
// mit einem falschen "claude" (CLAUDE_BIN), dazu vorrat.mjs ohne erreichbares Claude.
// Aufruf: node --test automatik/test/stories.test.mjs
// Schreibt nur in temporäre Ordner; plan/, out/ und data/ werden nur gelesen.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { readStories, alleStories, STORIES_BASIS } from '../../render/story.mjs'
import { ladeQueue } from '../queue.mjs'
import {
  planeStories, naechsteStoryNr, pruefeStories, textProbleme, hintergrundProbleme, beispielBlock, baueStoryPrompt,
  aehnlichkeit, SCHLUSSSATZ, INTERAKTIONEN,
} from '../story-regeln.mjs'

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname)
const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'story-test-'))

// --- Beispielblöcke im Format von docs/content-posts.md -------------------------------------------------------------

const block = ({ nr, titel, interaktion, kern, text, hg = 'Foto von Nina (Porträt)', aufl = null, textHg, sticker }) => `## Story ${nr}: ${titel}
- Interaktion: ${interaktion}
- Kernthema: ${kern}
- Ziel: Ein Satz, der beschreibt, was die Story bewirkt.
- Text auf dem Hintergrund: „${textHg ?? text}“
- Sticker (von Hand in der App, freiwillig für Nina): ${sticker ?? `${interaktion}. Frage: „Was meinst du?“`}
${aufl ? `- Auflösung (zweite Story, einige Stunden später, in beiden Fassungen gleich): „${aufl}“\n` : ''}- Hintergrund: ${hg}
- Automatik-Fassung (ohne Sticker): „${text}“`

const SCHIEBER = block({
  nr: 16, titel: 'Wie laut ist es in dir', interaktion: 'Schieberegler', kern: 2,
  text: `Wie laut sind deine Gedanken heute, leise oder laut? Lärm im Kopf heißt nicht, dass etwas falsch läuft. Atme einmal tief aus. ${SCHLUSSSATZ}`,
  textHg: 'Wie laut sind deine Gedanken heute? Lärm im Kopf heißt nicht, dass etwas falsch läuft. Unter dem Reglerbereich links „leise“, rechts „laut“.',
  sticker: 'Schieberegler. Frage: „Wie laut sind deine Gedanken heute?“ Emoji des Reglers: 🤍',
})
const QUIZ = block({
  nr: 17, titel: 'Warum du dich rechtfertigst', interaktion: 'Quiz', kern: 3,
  text: `Was glaubst du: Warum erklärst du dich so oft, obwohl niemand fragt, aus Gewohnheit, aus Angst vor Streit oder aus Höflichkeit? ${SCHLUSSSATZ}`,
  aufl: 'Meine Sicht: Wer sich früh erklären musste, um in Ruhe gelassen zu werden, erklärt sich später von selbst. Das ist gelernt und keine Schwäche. Du darfst öfter einfach Nein sagen.',
  sticker: 'Quiz. Frage: „Was glaubst du?“ Antworten: „Gewohnheit“ / „Angst vor Streit“ / „Höflichkeit“. Als richtig markieren: „Angst vor Streit“.',
})

const mitKopf = (...bloecke) => `# Automatisch geschriebene Stories\n\nVom Neuschreib-Lauf.\n\n# Stories\n\n${bloecke.join('\n\n---\n\n')}\n\n---\n\n`

// --- Parser -----------------------------------------------------------------------------------------------------------

test('readStories liest Auto-Datei: Schieberegler und Quiz mit Auflösung', () => {
  const f = path.join(tmpDir(), 'stories-auto.md')
  fs.writeFileSync(f, mitKopf(SCHIEBER, QUIZ))
  const s = readStories(f)
  assert.equal(s.length, 2)
  assert.equal(s[0].nr, 16)
  assert.equal(s[0].id, 's16')
  assert.equal(s[0].titel, 'Wie laut ist es in dir')
  assert.equal(s[0].interaktion, 'Schieberegler')
  assert.equal(s[0].kernthema, 2)
  assert.match(s[0].text, /^Wie laut sind deine Gedanken heute, leise oder laut\?/)
  assert.ok(s[0].text.endsWith(SCHLUSSSATZ))
  assert.equal(s[0].aufloesung, null)
  assert.match(s[0].sticker, /^Schieberegler\./)
  assert.equal(s[1].interaktion, 'Quiz')
  assert.match(s[1].aufloesung, /^Meine Sicht:/)
  assert.equal(s[1].hintergrund, 'Foto von Nina (Porträt)')
})

test('readStories: Datei ohne Abschnitt "# Stories" ist leer, Block ohne Automatik-Fassung wirft', () => {
  const d = tmpDir()
  fs.writeFileSync(path.join(d, 'leer.md'), '# Automatisch geschriebene Stories\n\nNoch nichts.\n')
  assert.deepEqual(readStories(path.join(d, 'leer.md')), [])
  fs.writeFileSync(path.join(d, 'kaputt.md'), '# Stories\n\n## Story 3: Ohne Text\n- Interaktion: Quiz\n')
  assert.throws(() => readStories(path.join(d, 'kaputt.md')), /keine Automatik-Fassung/)
})

test('alleStories: Basis und Auto zusammen, Nummern nie doppelt, kaputte Auto-Datei wird übersprungen', () => {
  const d = tmpDir()
  const basis = path.join(d, 'basis.md'), auto = path.join(d, 'auto.md')
  fs.writeFileSync(basis, `# Karussells\n\n# Stories\n\n${SCHIEBER.replace('Story 16', 'Story 1')}\n\n# Übersicht\n\nEnde\n`)
  assert.deepEqual(alleStories({ basis, auto }).map((s) => [s.nr, s.datei]), [[1, 'docs/content-posts.md']])
  fs.writeFileSync(auto, mitKopf(SCHIEBER.replace('Story 16', 'Story 1'), QUIZ))
  const warnungen = []
  const alt = console.warn
  console.warn = (m) => warnungen.push(m)
  try {
    assert.deepEqual(alleStories({ basis, auto }).map((s) => [s.nr, s.datei]), [[1, 'docs/content-posts.md'], [17, 'docs/content-stories-auto.md']])
    assert.equal(warnungen.length, 1)
    fs.writeFileSync(auto, '# Stories\n\n## Story 20: Kaputt\n- Interaktion: Quiz\n')
    assert.deepEqual(alleStories({ basis, auto }).map((s) => s.nr), [1])
    assert.equal(warnungen.length, 2)
  } finally { console.warn = alt }
})

test('die echten Stories aus docs/content-posts.md werden gelesen und bestehen die Textregeln', () => {
  const s = readStories(STORIES_BASIS)
  assert.ok(s.length >= 15)
  for (const x of s) {
    assert.ok(x.text, `Story ${x.nr} ohne Text`)
    if (x.interaktion === 'Quiz') assert.ok(x.aufloesung, `Story ${x.nr} ohne Auflösung`)
    // Story 15 nennt auf der Sticker-Fassung das Buch mit „Link in der Bio“; die neuen Stories bewerben nichts.
    const p = textProbleme(x).filter((m) => !(x.nr === 15 && /Link in der Bio/.test(m)))
    assert.deepEqual(p, [], `Story ${x.nr}: ${p}`)
  }
})

// --- Plan -------------------------------------------------------------------------------------------------------------

const vorh = (n, letzte = { interaktion: 'Schieberegler', kernthema: 1 }) => Array.from({ length: n }, (_, i) => ({ nr: i + 1, ...(i === n - 1 ? letzte : { interaktion: 'Umfrage', kernthema: 2 }) }))

test('naechsteStoryNr: höher als Dateien und Queue-IDs', () => {
  assert.equal(naechsteStoryNr([], []), 1)
  assert.equal(naechsteStoryNr(vorh(15)), 16)
  assert.equal(naechsteStoryNr(vorh(15), ['k03', 's09', 's18', 'r05']), 19)
})

test('planeStories: fortlaufend, Interaktion weiter nach der letzten, Kernthema 1 bis 4 ohne Wiederholung', () => {
  const plan = planeStories(vorh(15), 4, ['s01', 's15'])
  assert.deepEqual(plan.map((p) => p.nr), [16, 17, 18, 19])
  assert.deepEqual(plan.map((p) => p.interaktion), ['Umfrage', 'Fragebox', 'Quiz', 'Schieberegler'])
  const viele = planeStories(vorh(15), 32)
  for (const [i, p] of viele.entries()) {
    assert.ok([1, 2, 3, 4].includes(p.kernthema))
    assert.notEqual(p.kernthema, i ? viele[i - 1].kernthema : 1, `Kernthema doppelt bei Story ${p.nr}`)
  }
  const paare = new Set(viele.map((p) => `${p.interaktion}/${p.kernthema}`))
  assert.equal(paare.size, 16, 'jede Interaktion trifft jedes Kernthema')
  assert.deepEqual(planeStories([], 2).map((p) => [p.nr, p.interaktion]), [[1, 'Umfrage'], [2, 'Fragebox']])
})

// --- Formregeln -------------------------------------------------------------------------------------------------------

const parse = (...bloecke) => {
  const f = path.join(tmpDir(), 'x.md')
  fs.writeFileSync(f, '# Stories\n\n' + bloecke.join('\n\n---\n\n'))
  return readStories(f)
}
const PLAN = [{ nr: 16, interaktion: 'Schieberegler', kernthema: 2 }, { nr: 17, interaktion: 'Quiz', kernthema: 3 }]

test('pruefeStories: gültige Blöcke bestehen', () => {
  assert.equal(pruefeStories(parse(SCHIEBER, QUIZ), PLAN, { titel: ['Anderes Thema'], texte: ['Ein ganz anderer Text über Kaffee und Regen am Morgen.'] }), null)
})

test('pruefeStories: jede harte Regel schlägt an', () => {
  const schlecht = (ersatz, plan = PLAN) => pruefeStories(parse(...ersatz), plan, {})
  const s16 = (t) => SCHIEBER.replace(/Automatik-Fassung \(ohne Sticker\): „[^\n]*“/, `Automatik-Fassung (ohne Sticker): „${t}“`)
  const ok = `Wie laut sind deine Gedanken heute, leise oder laut? Lärm im Kopf heißt nicht, dass etwas falsch läuft. ${SCHLUSSSATZ}`
  const faelle = [
    [[SCHIEBER], /1 statt 2 lesbare/],
    [[s16(ok.replace(SCHLUSSSATZ, 'Sag mir Bescheid.')), QUIZ], /muss mit „Schreib mir ein Wort als Nachricht\.“ enden/],
    [[s16(ok.replace('heute', '3 Stunden')), QUIZ], /Zahl/],
    [[s16(ok.replace('deine Gedanken', 'deine Gedanken für 20 €')), QUIZ], /Zahl|Preis/],
    [[s16(ok.replace('Lärm im Kopf', 'Frauen kennen Lärm im Kopf')), QUIZ], /Ansprache als Frauen/],
    [[s16(ok.replace('Lärm im Kopf', 'Lärm im Kopf 😊')), QUIZ], /Emoji/],
    [[s16(ok.replace('Lärm im Kopf', 'Studien zeigen, Lärm im Kopf')), QUIZ], /Studie/],
    [[s16(ok.replace('läuft', 'läuft, und das heilt nie wieder')), QUIZ], /Heilversprechen/],
    [[s16(ok.replace('Lärm im Kopf', 'Das ist eine Depression, Lärm im Kopf')), QUIZ], /Diagnose/],
    [[s16(ok.replace('Lärm im Kopf', 'Lärm im Kopf. Alles Info: Link in der Bio')), QUIZ], /Link in der Bio/],
    [[s16('Wie laut sind die Gedanken heute? Lärm heißt nicht, dass etwas falsch läuft. ' + SCHLUSSSATZ), QUIZ], /Du-Form/],
    [[s16('Kurz. ' + SCHLUSSSATZ), QUIZ], /Zeichen, erlaubt sind/],
    [[s16(ok.replace('Lärm im Kopf', 'Verzeih dir und bleib, wenn Lärm im Kopf ist')), QUIZ], /ohne Grenze/],
    [[s16(ok.replace('Lärm im Kopf', 'Gewalt und Lärm im Kopf')), QUIZ], /Hilfetelefon/],
    [[SCHIEBER.replace('Interaktion: Schieberegler', 'Interaktion: Umfrage'), QUIZ], /Interaktion ist „Umfrage“/],
    [[SCHIEBER.replace('Kernthema: 2', 'Kernthema: 4'), QUIZ], /Kernthema ist 4/],
    [[SCHIEBER.replace('Hintergrund: Foto von Nina (Porträt)', 'Hintergrund: Salbei #6d7965, Schrift Creme'), QUIZ], /Salbei|Farbfläche/],
    [[SCHIEBER.replace('Hintergrund: Foto von Nina (Porträt)', 'Hintergrund: Foto von Nina mit Buch'), QUIZ], /kein Buch-Foto/],
    [[SCHIEBER.replace(/^- Sticker.*$/m, '- Sticker (von Hand in der App, freiwillig für Nina): Quiz. Frage: „x“'), QUIZ], /Sticker/],
    [[SCHIEBER, QUIZ.replace(/^- Auflösung.*\n/m, '')], /Quiz braucht die Zeile/],
    [[SCHIEBER, QUIZ.replace('„Meine Sicht:', '„Ich denke:')], /Meine Sicht/],
    [[SCHIEBER.replace('- Hintergrund', '- Auflösung (zweite Story, einige Stunden später): „Meine Sicht: doch.“\n- Hintergrund'), QUIZ], /nur Quiz-Stories/],
    [[SCHIEBER, QUIZ.replace('Story 17', 'Story 16')], /doppelt|unerwartete/],
    [[SCHIEBER, QUIZ.replace('Story 17', 'Story 30')], /unerwartete Nummer 30/],
  ]
  for (const [bloecke, muster] of faelle) assert.match(schlecht(bloecke) ?? 'null', muster)
})

test('pruefeStories: Titel und Text dürfen nicht wiederholt werden', () => {
  const s = parse(SCHIEBER, QUIZ)
  assert.match(pruefeStories(s, PLAN, { titel: ['Wie LAUT ist es in dir!'] }), /Titel „Wie laut ist es in dir“ gibt es schon/)
  assert.match(pruefeStories(s, PLAN, { texte: [s[0].text.replace('heute', 'morgen')] }), /ähnelt einer vorhandenen Story/)
  assert.ok(aehnlichkeit(s[0].text, s[1].text) < 0.5)
})

test('hintergrundProbleme', () => {
  for (const ok of ['Foto von Nina (Porträt)', 'Foto von Nina (Natur/Alltag)', 'Foto von Nina am See (von hinten)']) assert.deepEqual(hintergrundProbleme(ok), [])
  assert.ok(hintergrundProbleme('').length)
  assert.ok(hintergrundProbleme('Creme #f9f7f4').length)
  assert.ok(hintergrundProbleme('Foto von Nina mit Buch').length)
})

test('Prompt: Nummern, Formregeln, Beispiele ohne veraltete Hintergründe, Korrekturhinweis', () => {
  const md = fs.readFileSync(STORIES_BASIS, 'utf8')
  const beispiele = INTERAKTIONEN.map((i) => beispielBlock(md, i))
  for (const b of beispiele) {
    assert.ok(b && b.startsWith('## Story '), 'Beispielblock fehlt')
    assert.match(b, /^- Hintergrund: Foto von Nina \(Porträt\)$/m)
    assert.doesNotMatch(b, /Salbei/)
    assert.match(b, /^- Automatik-Fassung \(ohne Sticker\): „/m)
  }
  assert.match(beispiele[2], /^- Auflösung \(zweite Story/m)
  assert.equal(beispiele[0].includes('## Story 6'), false)
  const p = baueStoryPrompt({ regeln: 'REGELN', strategie: 'STRATEGIE', learnings: 'LERNEN', themen: ['A', 'B'], plan: PLAN, beispiele, fehler: 'Story 16: Zahl' })
  assert.match(p, /Story 16 \(Interaktion: Schieberegler, Kernthema: 2\); Story 17 \(Interaktion: Quiz, Kernthema: 3\)/)
  assert.match(p, /DEIN LETZTER VERSUCH WURDE ABGELEHNT WEGEN: Story 16: Zahl/)
  assert.match(p, /Automatik-Fassung \(ohne Sticker\)/)
  assert.match(p, /Auflösung \(zweite Story/)
  assert.match(p, /BEREITS VERWENDETE THEMEN\/TITEL[^\n]*: A \| B/)
  assert.doesNotMatch(baueStoryPrompt({ plan: PLAN, beispiele }), /ABGELEHNT/)
})

// --- neu-schreiben.mjs --typ story mit falschem claude -----------------------------------------------------------------

// Der falsche "claude" liest den Prompt, holt die Nummern aus "Story N (Interaktion: X, Kernthema: K)" und schreibt
// passende, frische Blöcke (jede Story mit eigenen Wörtern, damit die Ähnlichkeitsprüfung nicht anschlägt).
const FAKE = `#!/usr/bin/env node
import fs from 'node:fs'
const dir = process.env.FAKE_DIR
const prompt = fs.readFileSync(0, 'utf8')
const n = fs.readdirSync(dir).filter((f) => f.startsWith('prompt-')).length + 1
fs.writeFileSync(dir + '/prompt-' + n + '.txt', prompt)
if (process.env.FAKE_MODE === 'nicht-angemeldet') { console.log(JSON.stringify({ is_error: true, result: 'Not logged in' })); process.exit(1) }
const S = ${JSON.stringify(SCHLUSSSATZ)}
const buchst = (x) => String(x).replace(/\\d/g, (d) => 'abcdefghij'[d])
const wort = (nr, k) => 'Wolke' + buchst(nr * 10 + k)
const plan = [...prompt.matchAll(/Story (\\d+) \\(Interaktion: (\\w+), Kernthema: (\\d)\\)/g)].map((m) => ({ nr: +m[1], i: m[2], k: m[3] }))
const bloecke = plan.map(({ nr, i, k }) => {
  const [a, b, c, d, e, f, g, h, x, y] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((z) => wort(nr, z))
  const text = 'Spürst du heute ' + a + ', ' + b + ', ' + c + ', ' + d + ' oder ' + e + '? Beides darf da sein. ' + S
  const aufl = i === 'Quiz' ? '- Auflösung (zweite Story, einige Stunden später, in beiden Fassungen gleich): „Meine Sicht: ' + [f, g, h, x, y, a, b].join(', ') + ' waren ein kluger Schutz für dich.“\\n' : ''
  const sticker = i + '. Frage: „Was meinst du?“' + (i === 'Schieberegler' ? ' Emoji des Reglers: 🤍' : '')
  return '## Story ' + nr + ': Testthema ' + buchst(nr) + '\\n- Interaktion: ' + i + '\\n- Kernthema: ' + k + '\\n- Ziel: Ein Satz, der beschreibt, was die Story bewirkt.\\n- Text auf dem Hintergrund: „Spürst du heute ' + a + ' oder ' + b + '?“\\n- Sticker (von Hand in der App, freiwillig für Nina): ' + sticker + '\\n' + aufl + '- Hintergrund: Foto von Nina (Natur/Alltag)\\n- Automatik-Fassung (ohne Sticker): „' + text + '“'
})
const antwort = process.env.FAKE_MODE === 'erst-falsch' && n === 1 ? bloecke.slice(0, 1) : bloecke
console.log(JSON.stringify({ is_error: false, result: antwort.join('\\n\\n---\\n\\n') }))
`

function fakeClaude(modus = '') {
  const dir = tmpDir()
  const bin = path.join(dir, 'claude')
  fs.writeFileSync(bin, FAKE, { mode: 0o755 })
  const state = path.join(dir, 'state')
  fs.mkdirSync(state)
  return { bin, state, env: { CLAUDE_BIN: bin, FAKE_DIR: state, FAKE_MODE: modus } }
}
const laufe = (skript, argv, env) => spawnSync(process.execPath, [path.join(ROOT, skript), ...argv], { cwd: ROOT, env: { ...process.env, ...env }, encoding: 'utf8', timeout: 120_000 })

test('neu-schreiben --typ story: schreibt Auto-Datei, die readStories liest; zweiter Lauf hängt an und zählt weiter', async () => {
  const f = fakeClaude()
  const auto = path.join(tmpDir(), 'stories-auto.md')
  const queueIds = (await ladeQueue()).map((x) => x.id)
  const basis = readStories(STORIES_BASIS)

  const erste = naechsteStoryNr(basis, queueIds)
  const r1 = laufe('automatik/neu-schreiben.mjs', ['--typ', 'story', '--anzahl', '4', '--auto', auto], f.env)
  assert.equal(r1.status, 0, r1.stdout + r1.stderr)
  assert.match(r1.stdout, /Versuch 1: ok/)
  assert.match(r1.stdout, /4 neue Story-Beiträge/)
  const s1 = readStories(auto)
  assert.deepEqual(s1.map((s) => s.nr), [erste, erste + 1, erste + 2, erste + 3])
  assert.deepEqual(s1.map((s) => s.interaktion), ['Umfrage', 'Fragebox', 'Quiz', 'Schieberegler'])
  assert.ok(s1[2].aufloesung)
  const roh = fs.readFileSync(auto, 'utf8')
  assert.match(roh, /^# Automatisch geschriebene Stories/)
  assert.equal(roh.match(/^# Stories$/gm).length, 1)
  // der Prompt enthielt Regeln, Plan und die vorhandenen Titel
  const prompt = fs.readFileSync(path.join(f.state, 'prompt-1.txt'), 'utf8')
  assert.match(prompt, new RegExp(`Story ${erste} \\(Interaktion: Umfrage`))
  assert.match(prompt, /Das Unklare oder das Verlässliche/)
  assert.match(prompt, /Traumasensibel/)

  const zweite = s1.at(-1).nr + 1
  const r2 = laufe('automatik/neu-schreiben.mjs', ['--typ', 'story', '--anzahl', '2', '--auto', auto], f.env)
  assert.equal(r2.status, 0, r2.stdout + r2.stderr)
  const s2 = readStories(auto)
  assert.deepEqual(s2.map((s) => s.nr), [...s1.map((s) => s.nr), zweite, zweite + 1])
  assert.equal(s2[4].interaktion, 'Umfrage', 'Interaktion läuft nach Schieberegler wieder bei Umfrage weiter')
  assert.equal(fs.readFileSync(auto, 'utf8').match(/^# Stories$/gm).length, 1, 'Kopf nur einmal')
  // alle zusammen für den Produzenten lesbar, ohne doppelte Nummern
  const alle = alleStories({ basis: STORIES_BASIS, auto })
  assert.equal(new Set(alle.map((s) => s.nr)).size, alle.length)
  assert.ok(alle.some((s) => s.datei === 'docs/content-stories-auto.md'))
})

test('neu-schreiben --typ story: abgelehnter Versuch bekommt den Grund, zweiter Versuch gelingt', () => {
  const f = fakeClaude('erst-falsch')
  const auto = path.join(tmpDir(), 'stories-auto.md')
  const r = laufe('automatik/neu-schreiben.mjs', ['--typ', 'story', '--anzahl', '2', '--auto', auto], f.env)
  assert.equal(r.status, 0, r.stdout + r.stderr)
  assert.match(r.stdout, /Versuch 1: 1 statt 2 lesbare/)
  assert.match(r.stdout, /Versuch 2: ok/)
  assert.match(fs.readFileSync(path.join(f.state, 'prompt-2.txt'), 'utf8'), /DEIN LETZTER VERSUCH WURDE ABGELEHNT WEGEN: 1 statt 2 lesbare/)
  assert.equal(readStories(auto).length, 2)
})

test('neu-schreiben --typ story ohne Claude: eine Meldung, Exit 2, nichts geschrieben', () => {
  for (const env of [{ CLAUDE_BIN: path.join(tmpDir(), 'gibt-es-nicht') }, fakeClaude('nicht-angemeldet').env]) {
    const auto = path.join(tmpDir(), 'stories-auto.md')
    const r = laufe('automatik/neu-schreiben.mjs', ['--typ', 'story', '--anzahl', '2', '--auto', auto], env)
    assert.equal(r.status, 2)
    assert.match(r.stdout, /Neuschreiben story übersprungen, Claude nicht verfügbar/)
    assert.doesNotMatch(r.stdout + r.stderr, /\n\s+at /, 'kein Stacktrace')
    assert.equal(fs.existsSync(auto), false)
  }
})

test('neu-schreiben --typ story bricht ab, statt auf eine kaputte Auto-Datei zu schreiben', () => {
  const f = fakeClaude()
  const auto = path.join(tmpDir(), 'stories-auto.md')
  fs.writeFileSync(auto, '# Stories\n\n## Story 40: Kaputt\n- Interaktion: Quiz\n')
  const r = laufe('automatik/neu-schreiben.mjs', ['--typ', 'story', '--anzahl', '1', '--auto', auto], f.env)
  assert.equal(r.status, 1)
  assert.match(r.stdout, /Vorrat nicht lesbar/)
  assert.equal(fs.readdirSync(f.state).length, 0, 'Claude wurde nicht einmal gefragt')
})

// --- vorrat.mjs ohne Claude ---------------------------------------------------------------------------------------------

test('vorrat.mjs stürzt ohne erreichbares Claude nicht ab und schreibt nichts in docs/', () => {
  const autoDateien = ['content-posts-auto.md', 'content-reels-auto.md', 'content-stories-auto.md'].map((n) => path.join(ROOT, 'docs', n))
  const stand = () => autoDateien.map((p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null))
  const vorher = stand()
  const r = laufe('automatik/vorrat.mjs', [], { CLAUDE_BIN: path.join(tmpDir(), 'gibt-es-nicht') })
  assert.equal(r.status, 0, r.stdout + r.stderr)
  assert.match(r.stdout, /Vorrat: \d+ Karussells, \d+ Reels \(ohne Ton\), \d+ Stories unproduziert/)
  assert.doesNotMatch(r.stdout + r.stderr, /\n\s+at /, 'kein Stacktrace')
  for (const m of r.stdout.matchAll(/Neuschreiben (\w+) übersprungen/g)) assert.ok(['karussell', 'story', 'reel'].includes(m[1]))
  assert.doesNotMatch(r.stdout, /fehlgeschlagen/, 'nur die eine Meldung von neu-schreiben.mjs')
  assert.deepEqual(stand(), vorher)
})
