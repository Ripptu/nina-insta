import sharp from 'sharp'
import fs from 'node:fs'
const dir = process.argv[2], out = process.argv[3] || dir + '/../vorschau.jpg'
const fl = fs.readdirSync(dir).filter((f) => /^\d+\.jpg$/.test(f)).sort()
const w = 360, h = Math.round((w * 1350) / 1080)
const bufs = await Promise.all(fl.map((f) => sharp(dir + '/' + f).resize(w, h, { fit: 'cover' }).toBuffer()))
const cols = 4, rows = Math.ceil(fl.length / cols)
await sharp({ create: { width: w * cols, height: h * rows, channels: 3, background: '#111' } }).composite(bufs.map((b, i) => ({ input: b, left: (i % cols) * w, top: Math.floor(i / cols) * h }))).jpeg({ quality: 88 }).toFile(out)
console.log(out)
