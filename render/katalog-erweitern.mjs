// Nimmt neue Fotos aus einem Ordner (Standard $FOTO_DIR) in data/fotos.json auf: Größe, Gesichter, Helligkeit.
// Neue Fotos mit Gesicht gelten als Porträt (ruhigkeit unbekannt), ohne Gesicht als Objekt. Vorhandene Einträge bleiben unverändert.
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const HERE = new URL('.', import.meta.url).pathname
const dir = process.argv[2] || process.env.FOTO_DIR || path.join(HERE, '../fotos')
const FILE = path.join(HERE, '../data/fotos.json')
const cat = JSON.parse(fs.readFileSync(FILE, 'utf8'))
const bekannt = new Set(cat.map((p) => p.file))
const neu = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /\.(jpe?g|png)$/i.test(f) && !bekannt.has(f) && !f.startsWith('.')) : []
if (!neu.length) { console.log('Keine neuen Fotos.'); process.exit(0) }
const VENV = path.join(HERE, 'py/.venv/bin/python')
const PY = process.env.PYTHON_BIN || (fs.existsSync(VENV) ? VENV : 'python3')
const paths = neu.map((f) => path.join(dir, f))
const faces = JSON.parse(execFileSync(PY, [path.join(HERE, 'py/faces.py'), ...paths], { maxBuffer: 1e8, stdio: ['ignore', 'pipe', 'ignore'] }).toString())
let id = Math.max(...cat.map((p) => p.id)) + 1
for (const f of neu) {
  const p = path.join(dir, f)
  const meta = await sharp(p).metadata()
  const swap = meta.orientation && meta.orientation >= 5
  const w = swap ? meta.height : meta.width, h = swap ? meta.width : meta.height
  const st = await sharp(p).rotate().resize(64, 64, { fit: 'inside' }).greyscale().stats()
  const fs_ = []
  for (const [x, y, fw, fh] of faces[p]) if (!fs_.some((o) => Math.abs(o[0] - x) < fw * 0.5 && Math.abs(o[1] - y) < fh * 0.5)) fs_.push([x, y, fw, fh].map(Math.round))
  cat.push({ id: id++, file: f, w, h, luma: Math.round(st.channels[0].mean), kind: fs_.length ? 'portrait' : 'objekt', tier: 2, buch: false, faces: fs_, keepout: [] })
  console.log(`Neu: ${f} (${fs_.length ? 'Porträt' : 'Objekt'})`)
}
fs.writeFileSync(FILE, JSON.stringify(cat, null, 1))
