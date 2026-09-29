// Erzeugt pro Foto eine Freistell-Maske (Graustufen-PNG, gleiche Größe wie das Foto) in data/masken/<id>.png.
// Wird lokal einmal ausgeführt; die Masken liegen im Repo, die Action braucht kein Modell.
//   node maske.mjs [id ...]   (ohne Argument alle Porträts)
import { AutoModel, AutoProcessor, RawImage } from '@huggingface/transformers'
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const HERE = new URL('.', import.meta.url).pathname
const cat = JSON.parse(fs.readFileSync(HERE + '../../data/fotos.json', 'utf8'))
const SRC = process.env.FOTO_DIR || process.env.HOME + '/NINA'
const OUT = HERE + '../../data/masken'
fs.mkdirSync(OUT, { recursive: true })
const ids = process.argv.slice(2).length ? process.argv.slice(2).map(Number) : cat.filter((p) => p.kind === 'portrait' || p.kind === 'ruecken').map((p) => p.id)

const model = await AutoModel.from_pretrained('Xenova/modnet', { dtype: 'fp32' })
const processor = await AutoProcessor.from_pretrained('Xenova/modnet')
for (const i of ids) {
  const p = cat[i]
  const base = sharp(path.join(SRC, p.file)).rotate()
  const { data, info } = await base.clone().removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const raw = new RawImage(new Uint8ClampedArray(data), info.width, info.height, 3)
  const { pixel_values } = await processor(raw)
  const out = await model({ input: pixel_values })
  const alpha = out.output ?? out.alphas ?? Object.values(out)[0]
  const mask = await RawImage.fromTensor(alpha[0].mul(255).to('uint8')).resize(info.width, info.height)
  const a = await sharp(Buffer.from(mask.data), { raw: { width: info.width, height: info.height, channels: 1 } }).blur(1.0).linear(1.2, -20).extractChannel(0).raw().toBuffer()
  const white = Buffer.alloc(info.width * info.height * 4, 255)
  for (let k = 0; k < a.length; k++) white[k * 4 + 3] = a[k]
  const buf = await sharp(white, { raw: { width: info.width, height: info.height, channels: 4 } }).png({ compressionLevel: 9 }).toBuffer()
  fs.writeFileSync(path.join(OUT, `${i}.png`), buf)
  console.log(i, info.width + 'x' + info.height, (buf.length / 1024) | 0, 'KB')
}
