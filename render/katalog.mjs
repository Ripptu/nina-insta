// Fotokatalog: Größe, Gesichter (YuNet), Helligkeit je Foto. Ergebnis: data/fotos.json
// Aufruf: node katalog.mjs [Fotoordner]   (Standard ~/NINA, in der Action der Drive-Ordner)
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const HERE = new URL('.', import.meta.url).pathname
const dir = process.argv[2] || process.env.HOME + '/NINA'
const sheet = JSON.parse(fs.readFileSync(HERE + 'sheet.json', 'utf8'))
// Von Hand ergänzt: Fotos ohne erkennbares Gesicht. keepout in Bruchteilen [x,y,w,h].
const MANUELL = {
  // ruhige Fotos mit Nina: gute Textfläche (tier 1)
  ...Object.fromEntries([2, 5, 8, 9, 11, 12, 13, 14, 16, 18, 21, 22, 27, 36].map((i) => [i, { tier: 1 }])),
  1: { kind: 'ruecken', keepout: [[0.1, 0.05, 0.7, 0.55]] },
  2: { kind: 'ruecken', keepout: [[0.25, 0.15, 0.42, 0.32]], tier: 1 },
  // Nina mit Buch in der Hand
  31: { tier: 1, buch: true }, 32: { tier: 1, buch: true },
  // Veranstaltungs- und Tischbilder ohne Gesicht
  17: { kind: 'ereignis' }, 26: { kind: 'ereignis' }, 28: { kind: 'ereignis' }, 29: { kind: 'ereignis' }, 30: { kind: 'ereignis' },
  // nicht verwenden: andere Personen erkennbar oder Unschärfe
  19: { kind: 'ausgeschlossen' }, 20: { kind: 'ausgeschlossen' }, 24: { kind: 'ausgeschlossen' }, 25: { kind: 'ausgeschlossen' },
  33: { kind: 'buch' }, 34: { kind: 'buch' }, 35: { kind: 'buch' }, 37: { kind: 'buch' },
  38: { kind: 'buch' }, 39: { kind: 'buch' }, 40: { kind: 'buch' }, 41: { kind: 'buch' }, 42: { kind: 'buch' },
}

const paths = sheet.map((f) => path.join(dir, f))
const faces = JSON.parse(execFileSync(process.env.PYTHON_BIN || (fs.existsSync(HERE + 'py/.venv/bin/python') ? HERE + 'py/.venv/bin/python' : 'python3'), [HERE + 'py/faces.py', ...paths], { maxBuffer: 1e8, stdio: ['ignore', 'pipe', 'ignore'] }).toString())

const out = []
for (let i = 0; i < sheet.length; i++) {
  const p = paths[i]
  const meta = await sharp(p).metadata()
  const swap = meta.orientation && meta.orientation >= 5
  const w = swap ? meta.height : meta.width
  const h = swap ? meta.width : meta.height
  const st = await sharp(p).rotate().resize(64, 64, { fit: 'inside' }).greyscale().stats()
  const fs_ = []
  for (const [x, y, fw, fh, sc] of faces[p]) {
    if (!fs_.some((o) => Math.abs(o[0] - x) < fw * 0.5 && Math.abs(o[1] - y) < fh * 0.5)) fs_.push([x, y, fw, fh])
  }
  const m = MANUELL[i] || {}
  out.push({
    id: i, file: sheet[i], w, h, luma: Math.round(st.channels[0].mean),
    kind: m.kind || (fs_.length ? 'portrait' : 'objekt'), tier: m.tier || 2, buch: !!m.buch,
    faces: fs_.map((f) => f.map(Math.round)),
    keepout: (m.keepout || []).map(([x, y, kw, kh]) => [x * w, y * h, kw * w, kh * h].map(Math.round)),
  })
}
fs.writeFileSync(new URL('../data/fotos.json', import.meta.url), JSON.stringify(out, null, 1))
console.log(out.length, 'Fotos;', out.filter((f) => f.kind === 'portrait').length, 'Porträts;', out.filter((f) => f.kind === 'buch').length, 'Buch')
console.log(out.map((f) => `${f.id}:${f.w}x${f.h}:${f.faces.length}f:l${f.luma}`).join(' '))
