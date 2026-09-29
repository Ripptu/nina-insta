// Rendert Seiten (HTML) mit Chromium zu JPG. Läuft lokal und später in der Action.
// Gesichtsschutz: Vor dem Speichern wird das nackte Foto nach Gesichtern durchsucht. Liegt irgendein Text,
// Pfeil, Pille oder das Logo über einem Gesicht, bricht das Rendern mit einem Fehler ab.
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFileSync } from 'node:child_process'
import { applyPalette } from './templates.mjs'

const PALETTE = JSON.parse(fs.readFileSync(new URL('./palette.json', import.meta.url), 'utf8'))
const HERE = new URL('.', import.meta.url).pathname
const CHROME = process.env.CHROME_PATH || path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1134/chrome-mac/Chromium.app/Contents/MacOS/Chromium')

/** Gesichtsboxen [x,y,w,h] in Seitenkoordinaten, mit Rand (Haare, Kinn, Stirn). */
export function findFaces(png) {
  const out = JSON.parse(execFileSync(path.join(HERE, 'py/.venv/bin/python'), [path.join(HERE, 'py/faces.py'), png], { maxBuffer: 1e8, stdio: ['ignore', 'pipe', 'ignore'] }).toString())
  const boxes = []
  for (const [x, y, w, h] of out[png]) {
    // Gesicht großzügig erweitern: Stirn und Haaransatz oben, Kinn unten, seitlich etwas
    const px = w * 0.22, top = h * 0.35, bottom = h * 0.2
    const b = [x - px, y - top, w + 2 * px, h + top + bottom]
    // doppelte Treffer (zwei Größen) zusammenführen
    if (!boxes.some((o) => Math.abs(o[0] - b[0]) < w * 0.5 && Math.abs(o[1] - b[1]) < h * 0.5)) boxes.push(b)
  }
  return boxes
}

/** Rechtecke aller Elemente über dem Foto. Text zählt zeilengenau, Kästen (Pille, Blase) als Ganzes. */
export const COLLECT = () => {
  const rects = []
  const els = [...document.querySelectorAll('.page > *')].filter((e) => !e.classList.contains('photo') && !e.classList.contains('shade') && !e.classList.contains('person') && !e.classList.contains('behind'))
  for (const el of els) {
    const label = (el.textContent || el.className.baseVal || el.className || el.tagName).toString().trim().slice(0, 40)
    const boxed = el.classList.contains('pill') || el.classList.contains('bubble') || el.tagName === 'svg' || el.tagName === 'IMG'
    if (boxed) {
      const r = el.getBoundingClientRect()
      rects.push({ label, r: [r.left, r.top, r.width, r.height] })
    } else {
      const range = document.createRange()
      range.selectNodeContents(el)
      for (const r of range.getClientRects()) if (r.width > 2 && r.height > 2) rects.push({ label, r: [r.left, r.top, r.width, r.height] })
    }
  }
  return rects
}

export const overlap = (a, b) => {
  const w = Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0])
  const h = Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1])
  return w > 0 && h > 0 ? w * h : 0
}

export async function renderPages(pages, outDir, { height = 1350, prefix = 'seite', palette = true, faceGuard = true } = {}) {
  fs.mkdirSync(outDir, { recursive: true })
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--allow-file-access-from-files'] })
  const ctx = await browser.newContext({ viewport: { width: 1080, height }, deviceScaleFactor: 1 })
  const files = []
  const problems = []
  for (let i = 0; i < pages.length; i++) {
    const tmp = path.join(outDir, `.${prefix}-${i + 1}.html`)
    // Schriften liegen relativ zu render/, deshalb die Datei dorthin schreiben.
    const html = (palette ? applyPalette(pages[i], PALETTE) : pages[i]).replace(/url\('fonts\//g, `url('file://${path.resolve('fonts')}/`)
    fs.writeFileSync(tmp, html)
    const page = await ctx.newPage()
    await page.goto('file://' + path.resolve(tmp))
    await page.evaluate(() => document.fonts.ready)
    await page.waitForFunction(() => [...document.images].every((im) => im.complete))
    const file = path.join(outDir, `${prefix}-${String(i + 1).padStart(2, '0')}.jpg`)
    if (faceGuard && html.includes('class="photo"')) {
      const rects = await page.evaluate(COLLECT)
      const bare = path.join(outDir, `.bare-${i + 1}.png`)
      const hide = await page.addStyleTag({ content: '.page > *:not(.photo){visibility:hidden!important}' })
      await page.screenshot({ path: bare, type: 'png' })
      const faces = findFaces(bare)
      if (process.env.FACE_DEBUG) {
        const { default: sharp } = await import('sharp')
        const svg = `<svg width="1080" height="${height}" xmlns="http://www.w3.org/2000/svg">${faces.map((f) => `<rect x="${f[0]}" y="${f[1]}" width="${f[2]}" height="${f[3]}" fill="none" stroke="red" stroke-width="5"/>`).join('')}${rects.map(({ r }) => `<rect x="${r[0]}" y="${r[1]}" width="${r[2]}" height="${r[3]}" fill="none" stroke="lime" stroke-width="2"/>`).join('')}</svg>`
        await sharp(bare).composite([{ input: Buffer.from(svg) }]).jpeg({ quality: 80 }).toFile(path.join(outDir, `debug-${i + 1}.jpg`))
      }
      fs.rmSync(bare)
      for (const f of faces) {
        for (const { label, r } of rects) {
          const o = overlap(f, r)
          if (o > 0) problems.push(`Seite ${i + 1}: „${label}“ liegt über einem Gesicht (${Math.round(o)} px²)`)
        }
      }
      await hide.evaluate((el) => el.remove())
    }
    await page.screenshot({ path: file, type: 'jpeg', quality: 92 })
    await page.close()
    fs.rmSync(tmp)
    files.push(file)
  }
  await browser.close()
  if (problems.length) throw Object.assign(new Error('Gesichtsschutz verletzt:\n' + problems.join('\n')), { files, problems })
  return files
}
