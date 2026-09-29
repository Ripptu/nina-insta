// Ninas Logo: dunkle Linien in Alpha umrechnen und in Salbei bzw. Creme einfärben.
import sharp from 'sharp'
const src = '../assets/logo-original.png'
const meta = await sharp(src).metadata()
console.log(meta.width, meta.height, meta.channels, meta.hasAlpha)
const SCALE = 3 // Linien bleiben beim Verkleinern scharf, dafür vorher hochrechnen
const grey = await sharp(src).flatten({ background: '#fff' }).resize(meta.width * SCALE, meta.height * SCALE, { kernel: 'lanczos3' }).greyscale().raw().toBuffer({ resolveWithObject: true })
const { data, info } = grey
const make = async (rgb, file, crop) => {
  const out = Buffer.alloc(info.width * info.height * 4)
  for (let k = 0; k < info.width * info.height; k++) {
    const a = Math.min(255, Math.max(0, (255 - data[k]) * 4)) // Linienstärke etwas anheben
    out[k * 4] = rgb[0]; out[k * 4 + 1] = rgb[1]; out[k * 4 + 2] = rgb[2]; out[k * 4 + 3] = a
  }
  let img = sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
  if (crop) img = img.extract({ left: crop[0] * SCALE, top: crop[1] * SCALE, width: crop[2] * SCALE, height: crop[3] * SCALE })
  await img.png().toFile(file)
}
await make([109, 121, 101], '../assets/logo-sage.png')
await make([249, 247, 244], '../assets/logo-creme.png')
// Nur die Blume als Doodle (ohne Ring und Schrift)
await make([109, 121, 101], '../assets/doodle-sage.png', [108, 88, 184, 248])
await make([249, 247, 244], '../assets/doodle-creme.png', [108, 88, 184, 248])
