import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ladeQueue, speichereQueue, naechster } from '../queue.mjs';

const e = (id, o = {}) => ({ id, typ: 'karussell', kernthema: 1, fruehestens: null, status: 'geprueft', ...o });

test('ladeQueue legt fehlende Datei als leeres Array an, speichern/laden Hin und Zurück', async () => {
  const p = join(await mkdtemp(join(tmpdir(), 'q-')), 'plan', 'queue.json');
  assert.deepEqual(await ladeQueue(p), []);
  assert.equal((await readFile(p, 'utf8')).trim(), '[]');
  await speichereQueue([e('a')], p);
  assert.equal((await ladeQueue(p))[0].id, 'a');
});

test('naechster: Status, Typ, fruehestens', () => {
  const q = [e('a', { status: 'neu' }), e('b', { typ: 'story' }), e('c', { fruehestens: '2026-11-08' }), e('d')];
  assert.equal(naechster(q, 'karussell', '2026-10-01T18:00:00Z').id, 'd');
  assert.equal(naechster(q, 'karussell', new Date('2026-11-08T10:00:00Z')).id, 'c');
  assert.equal(naechster(q, 'reel', new Date()), null);
});

test('naechster: nicht zweimal dasselbe Kernthema, außer es gibt keine Alternative', () => {
  const q = [
    e('v', { status: 'veroeffentlicht', kernthema: 3, ig: { am: '2026-10-01T18:00:00Z' } }),
    e('a', { kernthema: 3 }),
    e('b', { kernthema: 5 }),
  ];
  assert.equal(naechster(q, 'karussell', new Date()).id, 'b');
  assert.equal(naechster(q.slice(0, 2), 'karussell', new Date()).id, 'a');
});
