// Rendert Seiten (HTML) mit Chromium zu JPG. Läuft lokal und später in der Action.
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const CHROME = process.env.CHROME_PATH || path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1134/chrome-mac/Chromium.app/Contents/MacOS/Chromium')

export async function renderPages(pages, outDir, { height = 1350, prefix = 'seite' } = {}) {
  fs.mkdirSync(outDir, { recursive: true })
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--allow-file-access-from-files'] })
  const ctx = await browser.newContext({ viewport: { width: 1080, height }, deviceScaleFactor: 1 })
  const files = []
  for (let i = 0; i < pages.length; i++) {
    const tmp = path.join(outDir, `.${prefix}-${i + 1}.html`)
    // Schriften liegen relativ zu render/, deshalb die Datei dorthin schreiben.
    const html = pages[i].replace(/url\('fonts\//g, `url('file://${path.resolve('fonts')}/`)
    fs.writeFileSync(tmp, html)
    const page = await ctx.newPage()
    await page.goto('file://' + path.resolve(tmp))
    await page.evaluate(() => document.fonts.ready)
    await page.waitForFunction(() => [...document.images].every((im) => im.complete))
    const file = path.join(outDir, `${prefix}-${String(i + 1).padStart(2, '0')}.jpg`)
    await page.screenshot({ path: file, type: 'jpeg', quality: 92 })
    await page.close()
    fs.rmSync(tmp)
    files.push(file)
  }
  await browser.close()
  return files
}
