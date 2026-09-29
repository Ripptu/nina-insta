import sharp from 'sharp'
import fs from 'node:fs'
const dir = '../material/freisteller'
const files = fs.readdirSync(dir).filter(f => f.endsWith('.png')).sort().slice(0, 6)
const W = 520, H = 640
const layers = []
for (let i = 0; i < files.length; i++) {
  const b = await sharp(`${dir}/${files[i]}`).resize(W - 30, H - 30, { fit: 'inside' }).toBuffer()
  layers.push({ input: b, left: i * W + 15, top: 15 })
}
await sharp({ create: { width: W * files.length, height: H, channels: 3, background: '#6d7965' } }).composite(layers).jpeg().toFile('cut-preview.jpg')
console.log(files.join(' '))
