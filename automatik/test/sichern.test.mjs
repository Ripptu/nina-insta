import test from 'node:test'
import assert from 'node:assert/strict'
import { mergeQueue } from '../queue-merge.mjs'
import { waehle } from '../auswahl.mjs'

const it = (id, status, extra = {}) => ({ id, typ: 'karussell', status, ...extra })

test('mergeQueue: eigene Änderung bleibt, fremde bleiben', () => {
  const basis = [it('k01', 'geprueft'), it('k02', 'neu')]
  const meine = [it('k01', 'veroeffentlicht', { ig: { id: 'x' } }), it('k02', 'neu')]
  const gegen = [it('k01', 'geprueft'), it('k02', 'geprueft', { qa: { verdikt: 'ok' } }), it('k03', 'neu')]
  const m = mergeQueue(basis, meine, gegen)
  assert.equal(m.find((x) => x.id === 'k01').status, 'veroeffentlicht')
  assert.equal(m.find((x) => x.id === 'k02').status, 'geprueft')
  assert.ok(m.find((x) => x.id === 'k03'))
})
test('mergeQueue: neue Beiträge von mir kommen dazu, gelöschte gehen', () => {
  const basis = [it('k01', 'neu'), it('k02', 'abgelehnt')]
  const meine = [it('k01', 'neu'), it('k03', 'neu')]
  const gegen = [it('k01', 'neu'), it('k02', 'abgelehnt')]
  const m = mergeQueue(basis, meine, gegen).map((x) => x.id)
  assert.deepEqual(m, ['k01', 'k03'])
})
test('waehle: Wer ich bin zuerst, keine Werbung unter den ersten drei, Frühestens', () => {
  const q = [it('k12', 'geprueft', { format: 'Werbung', angebot: 'Coaching', kernthema: 3 }), it('k01', 'geprueft', { angebot: 'Coaching', kernthema: 3 }), it('k13', 'geprueft', { fruehestens: '2099-01-01' })]
  assert.equal(waehle(q, { typ: 'karussell' }).id, 'k01')
})
test('waehle: numerische Sortierung und Angebotsschreibweise', () => {
  const q = [it('k100', 'geprueft'), it('k11', 'geprueft')]
  assert.equal(waehle(q, { typ: 'karussell' }).id, 'k11')
})
test('waehle: Regeln werden gelockert statt keinen Beitrag zu wählen', () => {
  const v = (id, am) => it(id, 'veroeffentlicht', { ig: { am }, angebot: 'Buch', kernthema: 1 })
  const q = [v('k01', '2026-10-01'), v('k02', '2026-10-02'), v('k03', '2026-10-03'), it('k04', 'geprueft', { angebot: 'Buch', kernthema: 1 })]
  const meldungen = []
  assert.equal(waehle(q, { typ: 'karussell', log: (m) => meldungen.push(m) }).id, 'k04')
  assert.ok(meldungen.length >= 1)
})
