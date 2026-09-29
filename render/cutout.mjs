// Stellt Ninas Fotos frei und baut den Aufkleber-Rand (weiß, wie in der Referenz).
//   node cutout.mjs <modell: modnet|rmbg> <index> [index ...]
import { AutoModel, AutoProcessor, RawImage } from '@huggingface/transformers'
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const [, , which, ...idx] = process.argv
const MODEL = which === 'rmbg' ? 'briaai/RMBG-1.4' : 'Xenova/modnet'
const files = JSON.parse(fs.readFileSync('sheet.json', 'utf8'))
const SRC = process.env.HOME + '/NINA'
const OUT = '../material/freisteller'
fs.mkdirSync(OUT, { recursive: true })
const LONG = 1600 // längste Kante, reicht für 1080er Beiträge
const BORDER = 26

const model = await AutoModel.from_pretrained(MODEL, { dtype: 'fp32' })
const processor = await AutoProcessor.from_pretrained(MODEL)

for (const i of idx.map(Number)) {
  const name = files[i]
  const base = sharp(path.join(SRC, name)).rotate().resize({ width: LONG, height: LONG, fit: 'inside' })
  const { data, info } = await base.clone().removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const raw = new RawImage(new Uint8ClampedArray(data), info.width, info.height, 3)
  const { pixel_values } = await processor(raw)
  const out = await model({ input: pixel_values })
  const alpha = out.output ?? out.alphas ?? Object.values(out)[0]
  const mask = await RawImage.fromTensor(alpha[0].mul(255).to('uint8')).resize(info.width, info.height)
  const m = Buffer.from(mask.data)
  // Maske glätten, damit die Kante nicht treppt.
  const alphaBuf = await sharp(m, { raw: { width: info.width, height: info.height, channels: 1 } }).blur(1.2).linear(1.25, -30).extractChannel(0).raw().toBuffer()
  const W = info.width, H = info.height
  const rgba = (rgb, a, fill) => {
    const out = Buffer.alloc(W * H * 4)
    for (let k = 0; k < W * H; k++) {
      out[k * 4] = fill ? 255 : rgb[k * 3]
      out[k * 4 + 1] = fill ? 255 : rgb[k * 3 + 1]
      out[k * 4 + 2] = fill ? 255 : rgb[k * 3 + 2]
      out[k * 4 + 3] = a[k]
    }
    return sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer()
  }
  const person = await rgba(data, alphaBuf, false)
  // Weißer Rand: Maske aufweiten (blur + Schwelle), dann weiß einfärben.
  const grown = await sharp(alphaBuf, { raw: { width: W, height: H, channels: 1 } }).blur(BORDER).threshold(24).blur(1.5).extractChannel(0).raw().toBuffer()
  const white = await rgba(data, grown, true)
  const pad = BORDER * 2
  const final = await sharp(white).extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .composite([{ input: person, left: pad, top: pad }]).png({ compressionLevel: 9 }).toBuffer()
  const trimmed = await sharp(final).trim().png().toBuffer()
  const target = path.join(OUT, `${String(i).padStart(2, '0')}-${which}.png`)
  fs.writeFileSync(target, trimmed)
  console.log(target, (trimmed.length / 1024) | 0, 'KB')
}
