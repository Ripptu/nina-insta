import test from 'node:test'
import assert from 'node:assert/strict'
import { pruefeStruktur } from '../karussell-regeln.mjs'

const seite = (n, role, text) => ({ n, role, text })
const gut = () => ({
  angebot: 'keins',
  pages: [
    { n: 1, role: 'cover', head: 'Nach dem Date fragst du: Hab ich gefallen?', sub: '' },
    seite(2, 'text', 'Die Frage ist verständlich. Nur schaut sie auf die andere Person.'),
    seite(3, 'text', 'Wie war dein Körper auf dem Heimweg?'),
    seite(4, 'text', 'Warst du du selbst?'),
    seite(5, 'quote', '„Die Antwort gehört dir, auch wenn sie leise ist.“'),
    seite(6, 'close', 'Speichere dir den Beitrag für dein nächstes Date.'),
  ],
})
test('gültiges Karussell', () => assert.deepEqual(pruefeStruktur(gut()), []))
test('zu viele Seiten und langer Hook', () => {
  const p = gut(); p.pages.push(seite(7, 'close', 'Speichern.')); p.pages[0].head = 'Das ist ein sehr langer Hook mit viel zu vielen Wörtern für eine Titelseite'
  const f = pruefeStruktur(p)
  assert.ok(f.some((x) => /7 statt 6/.test(x)))
})
test('Textwüste und Satzzahl', () => {
  const p = gut(); p.pages[1].text = 'Eins. Zwei. Drei sind zu viel für eine Seite, denn ein Kerngedanke pro Seite ist die Regel.'
  assert.ok(pruefeStruktur(p).some((x) => /mehr als zwei Sätze/.test(x)))
})
test('CTA: Angebot braucht Link in der Bio, ohne Angebot nicht', () => {
  const a = gut(); a.angebot = 'Buch'
  assert.ok(pruefeStruktur(a).some((x) => /Angebot ohne/.test(x)))
  const b = gut(); b.pages[5].text = 'Mehr dazu: Link in der Bio.'
  assert.ok(pruefeStruktur(b).some((x) => /ohne Angebot/.test(x)))
})
