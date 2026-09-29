// Vorschau für Stories (Kontaktbogen) und Reels (Bild mit Frames aus dem Video). Aufruf:
//   node vorschau-auto.mjs stories <dir> <out.jpg>     |     node vorschau-auto.mjs reels <dir> <out.jpg>
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFileSync } from 'node:child_process'

const [mode, dir, out] = process.argv.slice(2)
const FFMPEG = path.join(os.homedir(), '.local/ffmpeg/bin/ffmpeg')
const w = 270, h = 480
const label = (t) => Buffer.from(`<svg width="${w}" height="26" xmlns="http://www.w3.org/2000/svg"><rect width="${w}" height="26" fill="#111"/><text x="6" y="18" font-size="15" fill="#fff" font-family="Helvetica">${t}</text></svg>`)
const sheet = async (cells, cols) => {
  const rows = Math.ceil(cells.length / cols)
  await sharp({ create: { width: w * cols, height: (h + 26) * rows, channels: 3, background: '#111' } })
    .composite(cells.flatMap((c, i) => [
      { input: c.buf, left: (i % cols) * w, top: Math.floor(i / cols) * (h + 26) },
      { input: label(c.t), left: (i % cols) * w, top: Math.floor(i / cols) * (h + 26) + h },
    ])).jpeg({ quality: 88 }).toFile(out)
  console.log(out)
}
if (mode === 'stories') {
  const fl = fs.readdirSync(dir).filter((f) => /^s\d+(-aufloesung)?\.jpg$/.test(f)).sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)) || a.length - b.length)
  const cells = await Promise.all(fl.map(async (f) => ({ t: f, buf: await sharp(path.join(dir, f)).resize(w, h, { fit: 'cover' }).toBuffer() })))
  await sheet(cells, 6)
} else {
  // je Reel 6 Frames (gleichmäßig verteilt), Zeile pro Reel
  const vids = fs.readdirSync(dir).filter((f) => /^r\d+\.mp4$/.test(f)).sort()
  const cells = []
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'reelprev-'))
  const cols = 6
  for (const v of vids) {
    const d = +execFileSync(path.join(os.homedir(), '.local/ffmpeg/bin/ffprobe'), ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path.join(dir, v)]).toString()
    for (let k = 0; k < cols; k++) {
      const t = ((k + 0.5) / cols) * d
      const f = path.join(tmp, `${v}-${k}.jpg`)
      execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-ss', t.toFixed(2), '-i', path.join(dir, v), '-frames:v', '1', '-q:v', '3', f])
      cells.push({ t: `${v} ${t.toFixed(1)} s`, buf: await sharp(f).resize(w, h, { fit: 'cover' }).toBuffer() })
    }
  }
  await sheet(cells, cols)
}
