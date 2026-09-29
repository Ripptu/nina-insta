import * as T from './templates.mjs'
import { renderPages } from './render.mjs'
import sharp from 'sharp'
const F = (n) => process.cwd() + '/../material/freisteller/' + n
const base = [
  T.coverFoto({ script: 'Früher', headline: 'dachte ich, Liebe sei einfach.', subline: 'Wer hier schreibt und warum ich Frauen begleite.', foto: F('10-modnet.png') }),
  T.zitat({ quote: 'Ich fragte mich, warum ich mich nicht wirklich öffnen konnte.', foto: F('22-modnet.png') }),
]
const V = {
  a: { ink: '#3f5237', main: '#a9c29a', light: '#e4ecd9', paper: '#fbfaf5', onMain: '#3f5237' },   // frisches Grün
  b: { ink: '#7a4e48', main: '#e2b7ab', light: '#f0dcd3', paper: '#fbf7f3', onMain: '#7a4e48' },   // Altrosa
  c: { ink: '#56654f', main: '#c3d0b8', light: '#e6ece1', paper: '#faf8f4', onMain: '#56654f' },   // Salbei hell
}
const layers = []
let col = 0
for (const [k, v] of Object.entries(V)) {
  const pages = base.map((h) => T.applyPalette(h, v))
  const files = await renderPages(pages, `../material/var-${k}`)
  for (let r = 0; r < files.length; r++) layers.push({ input: await sharp(files[r]).resize(400, 500).toBuffer(), left: col * 406, top: r * 506 })
  col++
}
await sharp({ create: { width: 3 * 406, height: 2 * 506, channels: 3, background: '#333' } }).composite(layers).jpeg({ quality: 88 }).toFile('../material/farben-vorschau.jpg')
