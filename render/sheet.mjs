import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
const src = process.env.HOME + '/NINA'
const files = fs.readdirSync(src).filter(f => /\.jpe?g$/i.test(f)).sort()
const W = 260, H = 340, cols = 8
const rows = Math.ceil(files.length / cols)
const layers = []
for (let i = 0; i < files.length; i++) {
  const buf = await sharp(path.join(src, files[i])).rotate().resize(W, H, { fit: 'cover' }).jpeg().toBuffer()
  const x = (i % cols) * (W + 6), y = Math.floor(i / cols) * (H + 6)
  layers.push({ input: buf, left: x, top: y })
  const svg = `<svg width="60" height="34" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="34" fill="black"/><text x="8" y="25" font-size="24" fill="yellow" font-family="Helvetica" font-weight="bold">${i}</text></svg>`
  layers.push({ input: Buffer.from(svg), left: x, top: y })
}
await sharp({ create: { width: cols * (W + 6), height: rows * (H + 6), channels: 3, background: '#222' } }).composite(layers).jpeg({ quality: 80 }).toFile('sheet.jpg')
fs.writeFileSync('sheet.json', JSON.stringify(files, null, 1))
console.log(files.length, 'Fotos')
