// Layout-Engine: wählt pro Seite Foto und Ausschnitt so, dass kein Gesicht unter Text liegt, passt die Schriftgröße an
// und rendert. Ergebnis wird zusätzlich vom Gesichtsschutz in render.mjs geprüft.
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import * as Y from './typo.mjs'
import { findFaces, COLLECT, overlap } from './render.mjs'

const HERE = new URL('.', import.meta.url).pathname
export const CAT = JSON.parse(fs.readFileSync(HERE + '../data/fotos.json', 'utf8'))
const FOTO_DIR = process.env.FOTO_DIR || path.join(os.homedir(), 'NINA')
const MAC_CHROME = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1134/chrome-mac/Chromium.app/Contents/MacOS/Chromium')
const PUP = path.join(os.homedir(), '.cache/puppeteer/chrome-headless-shell')
const pupChrome = () => { try { const v = fs.readdirSync(PUP).sort().pop(); const f = path.join(PUP, v, 'chrome-headless-shell-mac-arm64/chrome-headless-shell'); return fs.existsSync(f) ? f : undefined } catch { return undefined } }
const CHROME = process.env.CHROME_PATH || (fs.existsSync(MAC_CHROME) ? MAC_CHROME : pupChrome())
const W = 1080
const INK = 'rgba(12,14,12,'

const EXTRA = `
.hd{font-weight:700;letter-spacing:-.04em;line-height:1.04;text-shadow:0 2px 24px rgba(0,0,0,.3)}
.tx{font-weight:500;letter-spacing:-.02em;line-height:1.16;text-shadow:0 1px 14px rgba(0,0,0,.35)}
.cta{display:inline-block;background:#fff;color:#1c1c1c;font-weight:600;letter-spacing:-.02em;border-radius:60px;box-shadow:0 3px 14px rgba(0,0,0,.25)}
`
const CSS = Y.CSS.replace(/url\('fonts\//g, `url('file://${HERE}fonts/`) + EXTRA

export const fotoUrl = (p) => 'file://' + path.join(FOTO_DIR, p.file)

// ---------- Geometrie ----------
export function place(p, PW, PH, zoom, ax, ay) {
  const s = Math.max(PW / p.w, PH / p.h) * zoom
  const dw = p.w * s, dh = p.h * s
  const x = (PW - dw) * ax, y = (PH - dh) * ay
  const f = (b) => [b[0] * s + x, b[1] * s + y, b[2] * s, b[3] * s]
  return { dw, dh, x, y, faces: p.faces.map(f), keep: p.keepout.map(f) }
}
// gleiche Erweiterung wie im Gesichtsschutz (Stirn, Haare, Kinn), dazu Sicherheitsrand
export const pad = (b, m = 16) => [b[0] - b[2] * 0.22 - m, b[1] - b[3] * 0.35 - m, b[2] * 1.44 + 2 * m, b[3] * 1.55 + 2 * m]
export const inside = (b, PW, PH) => {
  const w = Math.min(b[0] + b[2], PW) - Math.max(b[0], 0), h = Math.min(b[1] + b[3], PH) - Math.max(b[1], 0)
  return w > 0 && h > 0 ? (w * h) / (b[2] * b[3]) : 0
}

/** Größtes freies Band (volle Breite) zwischen lo und hi bei gegebenem Ausschnitt. */
export function freeBand(pl, PW, PH, lo, hi) {
  const occ = [...pl.faces.map((f) => pad(f)), ...pl.keep.map((k) => [k[0] - 12, k[1] - 12, k[2] + 24, k[3] + 24])]
    .map((b) => [Math.max(lo, b[1]), Math.min(hi, b[1] + b[3])])
    .filter((v) => v[1] > v[0])
    .sort((a, b) => a[0] - b[0])
  const merged = []
  for (const v of occ) {
    if (merged.length && v[0] <= merged[merged.length - 1][1]) merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], v[1])
    else merged.push([...v])
  }
  const free = []
  let cur = lo
  for (const v of merged) { if (v[0] > cur) free.push([cur, v[0]]); cur = Math.max(cur, v[1]) }
  if (cur < hi) free.push([cur, hi])
  return free
}

/** Sucht einen Ausschnitt, in dem ein Textblock der Höhe need frei liegt. */
export function pickCrop(p, need, { PW = W, PH = 1350, lo = 70, hi = PH - 210, prefer = 'any' } = {}) {
  let best = null
  for (const zoom of [1, 1.1, 1.2, 1.35, 1.5])
    for (const ay of [1, 0.75, 0.5, 0.25, 0])
      for (const ax of [0.5, 0.3, 0.7, 0.1, 0.9]) {
        const pl = place(p, PW, PH, zoom, ax, ay)
        if (pl.faces.some((f) => inside(f, PW, PH) < 0.9) || pl.keep.some((k) => inside(k, PW, PH) < 0.7)) continue
        const band = freeBand(pl, PW, PH, lo, hi).filter((b) => b[1] - b[0] >= need).sort((a, b) => b[1] - b[0] - (a[1] - a[0]))[0]
        if (!band) continue
        const top = band[0] < PH / 2 && band[1] < PH * 0.7
        let score = -(zoom - 1) * 60 - Math.abs(ax - 0.5) * 12 - (1 - ay) * 0 + Math.min(band[1] - band[0] - need, 200) * 0.02
        if (prefer === 'top' && top) score += 8
        if (prefer === 'bottom' && !top) score += 8
        if (!best || score > best.score) best = { pl, band, score, zoom, ax, ay, top }
      }
  return best
}

// ---------- Engine ----------
export async function createEngine() {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--allow-file-access-from-files'] })
  const ctx = await browser.newContext({ viewport: { width: W, height: 1920 }, deviceScaleFactor: 1 })
  const mp = await ctx.newPage()
  const mfile = HERE + '.measure.html'
  fs.writeFileSync(mfile, `<!doctype html><meta charset="utf-8"><style>${CSS}body{font-family:'Inter Tight',sans-serif;color:#fff}</style><body><div id="m" style="position:absolute;left:0;top:0"></div>`)
  await mp.goto('file://' + mfile)

  const measure = (html, width, style) =>
    mp.evaluate(async ([h, w, st]) => {
      const m = document.getElementById('m')
      m.style.width = w + 'px'
      m.innerHTML = `<div style="${st}">${h}</div>`
      m.offsetHeight // Layout erzwingen, damit die Schriften anfangen zu laden
      await document.fonts.ready
      m.offsetHeight
      const el = m.firstChild
      // Wort breiter als die Box (ragt über den Rand): als „passt nicht“ melden, damit eine kleinere Größe gewählt wird
      const zuBreit = [el, ...el.querySelectorAll('*')].some((x) => x.scrollWidth > x.clientWidth + 1 && x.clientWidth > 0)
      return zuBreit ? 1e6 : el.getBoundingClientRect().height
    }, [html, width, style])

  /** Größte Schriftgröße aus sizes, bei der Text in maxH passt. */
  async function fit(html, width, cls, sizes, extra = '', maxH = 1e9) {
    for (const s of sizes) {
      const h = await measure(html, width, `font-size:${s}px;${extra}`.replace(/^/, '') , cls)
      if (h <= maxH) return { size: s, h }
    }
    return null
  }
  const meas = async (html, width, cls, size, extra = '') => measure(`<div class="${cls}" style="font-size:${size}px;${extra}">${html}</div>`, width, '')

  async function renderHtml(html, file, PH, guard = true) {
    const tmp = path.join(path.dirname(file), '.t-' + path.basename(file) + '.html')
    fs.writeFileSync(tmp, html)
    const page = await ctx.newPage()
    await page.setViewportSize({ width: W, height: PH })
    await page.goto('file://' + path.resolve(tmp))
    await page.evaluate(() => document.fonts.ready)
    await page.waitForFunction(() => [...document.images].every((im) => im.complete))
    const problems = []
    if (guard && html.includes('class="photo"')) {
      const rects = await page.evaluate(COLLECT)
      const bare = file + '.bare.png'
      const hide = await page.addStyleTag({ content: '.page > *:not(.photo){visibility:hidden!important}' })
      await page.screenshot({ path: bare, type: 'png' })
      const faces = findFaces(bare)
      fs.rmSync(bare)
      for (const f of faces) for (const { label, r } of rects) if (overlap(f, r) > 0) problems.push(`„${label}“ über Gesicht`)
      await hide.evaluate((el) => el.remove())
    }
    if (!problems.length) await page.screenshot({ path: file, type: 'jpeg', quality: 92 })
    await page.close()
    fs.rmSync(tmp)
    return problems
  }

  // ---------- Seitenbauer ----------
  const pageHtml = (body, PH, bg) => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}html,body{height:${PH}px}.page{height:${PH}px}</style></head><body><div class="page">${bg}${body}</div></body></html>`
  const bgFull = (p, crop, PH, dark = 0.14) =>
    `<div class="photo" style="background-image:url('${fotoUrl(p)}');background-size:${crop.pl.dw}px ${crop.pl.dh}px;background-position:${crop.pl.x}px ${crop.pl.y}px;filter:saturate(.86) contrast(1.06) brightness(.92)"></div>` +
    `<div class="shade" style="background:rgba(12,14,12,${dark})"></div>`
  const bandShade = (y0, y1, a) => `<div class="shade" style="background:linear-gradient(rgba(12,14,12,0) ${Math.max(0, y0 - 140)}px,${INK}${a}) ${y0}px,${INK}${a}) ${y1}px,rgba(12,14,12,0) ${y1 + 140}px)"></div>`
  const logo = (PH, x = 44) => `<img class="logo" src="file://${HERE}../assets/logo-creme.png" style="width:150px;left:${x}px;top:${PH - 190}px">`

  const esc = Y.esc
  const sentences = (t) => t.match(/(?:[^.!?]|[.!?](?=[^\s"“”.!?]))+[.!?]+["“”]*\s*|.+$/g)?.map((s) => s.trim()) ?? [t]

  /** Cover: große Überschrift (letzter Teil rosa) und Handschrift-Zeile. */
  async function cover(spec, p, { PH = 1350, lo = 70, hi } = {}) {
    hi = hi ?? PH - 210
    const head = spec.head.replace(/\s+/g, ' ').trim()
    let a = head, b = ''
    const m = head.match(/^(.*[,:;.!?][“”"]?)\s+(.+)$/)
    if (m) { a = m[1]; b = m[2] } else { const w = head.split(' '); if (w.length >= 5) { a = w.slice(0, -2).join(' '); b = w.slice(-2).join(' ') } }
    const hh = `${esc(a)}${b ? `${m ? '<br>' : ' '}<span style="color:${Y.PINK}">${esc(b)}</span>` : ''}`
    for (const size of [172, 152, 134, 118, 104, 92]) {
      const hHead = await meas(hh, 960, 'hd', size, 'color:#fff')
      const sub = spec.sub ? await meas(esc(spec.sub), 700, 'hand', 66, 'position:static;line-height:1.02') : 0
      const need = hHead + (sub ? sub + 36 : 0)
      const crop = pickCrop(p, need, { PH, lo, hi, prefer: 'top' })
      if (!crop) continue
      const y = crop.top ? crop.band[0] : crop.band[1] - need
      let body = bandShade(y, y + need, 0.3) + `<div class="abs hd" style="left:60px;top:${y}px;width:960px;font-size:${size}px;color:#fff">${hh}</div>`
      if (sub) body += `<div class="hand" style="left:64px;top:${y + hHead + 30}px;width:700px;font-size:66px;line-height:1.02;transform:rotate(-2deg)">${esc(spec.sub)}</div>`
      return { html: pageHtml(body + logo(PH), PH, bgFull(p, crop, PH)), crop }
    }
    return null
  }

  /** Text: erster Satz in Butter, Rest weiß. Optional Zitat-Modus (nur Butter, größer). */
  async function text(spec, p, { PH = 1350, lo = 70, hi, quote = false, cta = false } = {}) {
    hi = hi ?? PH - 210
    let t = spec.text.replace(/\s+/g, ' ').trim()
    let pillText = ''
    if (cta) { const m = t.match(/\s*Link in der Bio\.?/i); if (m) { t = t.replace(m[0], '').trim(); pillText = 'Link in der Bio' } }
    const ss = sentences(t)
    const first = quote ? t.replace(/^„/, '“').replace(/“$/, '”') : ss[0]
    const rest = quote ? '' : ss.slice(1).join(' ')
    const sizes = quote ? [124, 112, 100, 90, 80, 72] : [74, 68, 62, 58, 54, 50, 46]
    for (const hs of sizes) {
      const bs = Math.round(hs * 0.82)
      const h1 = await meas(esc(first), 960, quote ? 'hd' : 'hd', hs, `color:${Y.BUTTER};line-height:${quote ? 1 : 1};letter-spacing:-.035em`)
      const h2 = rest ? await meas(esc(rest), 960, 'tx', bs, 'color:#fff') : 0
      const hp = pillText ? 96 : 0
      const need = h1 + (rest ? h2 + 28 : 0) + (pillText ? hp + 34 : 0)
      const crop = pickCrop(p, need, { PH, lo, hi, prefer: 'bottom' })
      if (!crop) continue
      const y = crop.top ? crop.band[0] : crop.band[1] - need
      let yy = y
      let body = bandShade(y, y + need, 0.5) + `<div class="abs hd" style="left:60px;top:${yy}px;width:960px;font-size:${hs}px;color:${Y.BUTTER};line-height:${quote ? 1 : 1};letter-spacing:-.035em">${esc(first)}</div>`
      yy += h1 + 28
      if (rest) { body += `<div class="abs tx" style="left:60px;top:${yy}px;width:960px;font-size:${bs}px;color:#fff">${esc(rest)}</div>`; yy += h2 + 34 }
      if (pillText) body += `<div class="abs cta" style="left:60px;top:${yy}px;font-size:46px;padding:16px 40px">${pillText}</div>`
      return { html: pageHtml(body + logo(PH), PH, bgFull(p, crop, PH, 0.2)), crop }
    }
    return null
  }

  /** Geteilt: oben Foto, unten Textfläche. Für Buch- und Objektfotos. */
  async function split(spec, p, { PH = 1350, cta = true } = {}) {
    let t = spec.text.replace(/\s+/g, ' ').trim()
    let pillText = ''
    if (cta) { const m = t.match(/\s*Link in der Bio\.?/i); if (m) { t = t.replace(m[0], '').trim(); pillText = 'Link in der Bio' } }
    const photoH = Math.round(PH * 0.5)
    const top = photoH + 40, bottom = PH - 200
    for (const size of [60, 56, 52, 48, 44]) {
      const h = await meas(esc(t), 960, 'tx', size, 'color:#fff')
      const need = h + (pillText ? 130 : 0)
      if (top + need > bottom) continue
      const s = Math.max(W / p.w, photoH / p.h)
      const dw = p.w * s, dh = p.h * s
      const bg = `<div class="shade" style="background:#ffc4e4"></div><div class="photo" style="bottom:auto;height:${photoH}px;background-image:url('${fotoUrl(p)}');background-size:${dw}px ${dh}px;background-position:${(W - dw) / 2}px ${(photoH - dh) * 0.55}px;filter:saturate(.9) contrast(1.05)"></div>` +
        `<div class="shade" style="top:${photoH - 220}px;bottom:auto;height:220px;background:linear-gradient(rgba(255,196,228,0),#ffc4e4)"></div>`
      let body = `<div class="abs tx" style="left:60px;top:${top}px;width:960px;font-size:${size}px;color:#33402f;text-shadow:none">${esc(t)}</div>`
      if (pillText) body += `<div class="abs cta" style="left:60px;top:${top + h + 34}px;font-size:46px;padding:16px 40px;background:#33402f;color:#fff">${pillText}</div>`
      return { html: pageHtml(body + logo(PH), PH, bg), crop: { zoom: 1 } }
    }
    return null
  }


  /** Reines Textcover ohne Foto (wenn alle Fotos schon Cover waren). variant 0..2. */
  async function coverText(spec, { PH = 1350, variant = 0 } = {}) {
    const V = [
      { bg: Y.PINK, c: '#33402f', acc: '#d4147a', logo: 'logo-ink.png' },
      { bg: Y.BUTTER, c: '#33402f', acc: '#d4147a', logo: 'logo-ink.png' },
      { bg: '#f6efe6', c: '#33402f', acc: '#d4147a', logo: 'logo-ink.png' },
    ][variant % 3]
    const head = spec.head.replace(/\s+/g, ' ').trim()
    let a = head, b = ''
    const m = head.match(/^(.*[,:;.!?][“”"]?)\s+(.+)$/)
    if (m) { a = m[1]; b = m[2] } else { const w = head.split(' '); if (w.length >= 5) { a = w.slice(0, -2).join(' '); b = w.slice(-2).join(' ') } }
    const hh = `${esc(a)}${b ? `${m ? '<br>' : ' '}<span style="color:${V.acc}">${esc(b)}</span>` : ''}`
    const lo = 110, hi = PH - 230
    for (const size of [190, 168, 148, 130, 114, 100, 88]) {
      const hHead = await meas(hh, 960, 'hd', size, `color:${V.c}`)
      const sub = spec.sub ? await meas(esc(spec.sub), 760, 'hand', 70, 'position:static;line-height:1.02') : 0
      const need = hHead + (sub ? sub + 40 : 0)
      if (need > hi - lo) continue
      const y = lo + (hi - lo - need) / 2
      let body = `<div class="abs hd" style="left:60px;top:${y}px;width:960px;font-size:${size}px;color:${V.c};text-shadow:none">${hh}</div>`
      if (sub) body += `<div class="hand" style="left:64px;top:${y + hHead + 34}px;width:760px;font-size:70px;line-height:1.02;transform:rotate(-2deg);color:${V.c};text-shadow:none">${esc(spec.sub)}</div>`
      const lg = `<img class="logo" src="file://${HERE}../assets/${V.logo}" style="width:150px;left:44px;top:${PH - 190}px">`
      return { html: pageHtml(body + lg, PH, `<div class="shade" style="background:${V.bg}"></div>`), crop: { text: true } }
    }
    return null
  }

  /** Zeilenrechtecke eines Textblocks (für Verdeckungsrechnung) und optional eines Teilelements #kb. */
  const rects = (html, width, cls, size, extra = '') =>
    mp.evaluate(async ([h, w, c, s, x]) => {
      const m = document.getElementById('m')
      m.style.width = w + 'px'
      m.innerHTML = `<div class="${c}" style="font-size:${s}px;${x}">${h}</div>`
      m.offsetHeight
      await document.fonts.ready
      m.innerHTML = `<div class="${c}" style="font-size:${s}px;${x}">${h}</div>`
      const el = m.firstChild
      const base = el.getBoundingClientRect()
      const range = document.createRange()
      range.selectNodeContents(el)
      const lines = [...range.getClientRects()].filter((r) => r.width > 2).map((r) => [r.left - base.left, r.top - base.top, r.width, r.height])
      const words = []
      const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      while (tw.nextNode()) {
        const n = tw.currentNode, re = /\S+/g
        let m
        while ((m = re.exec(n.nodeValue))) {
          const rg = document.createRange(); rg.setStart(n, m.index); rg.setEnd(n, m.index + m[0].length)
          const rr = rg.getBoundingClientRect()
          if (rr.width <= 1) continue
          const chars = []
          for (let k = 0; k < m[0].length; k++) { const cr = document.createRange(); cr.setStart(n, m.index + k); cr.setEnd(n, m.index + k + 1); const c = cr.getBoundingClientRect(); if (c.width > 1) chars.push([c.left - base.left, c.top - base.top, c.width, c.height, m[0][k]]) }
          words.push([rr.left - base.left, rr.top - base.top, rr.width, rr.height, m[0], chars])
        }
      }
      const kb = el.querySelector('#kb')
      let span = null
      if (kb) { const rr = [...kb.getClientRects()].map((r) => [r.left - base.left, r.top - base.top, r.width, r.height]); span = rr }
      const zuBreit = el.scrollWidth > el.clientWidth + 1
      return { h: zuBreit ? 1e6 : base.height, lines: zuBreit ? [[0, 0, 1e6, 1e6]] : lines, span, words }
    }, [html, width, cls, size, extra])
  return { renderHtml, cover, coverText, text, split, close: () => browser.close(), _i: { ctx, meas, rects, pageHtml, bgFull, bandShade, logo, CSS, W } }
}

// ---------- Fotoauswahl ----------
const BUCH_ORDER = [38, 39, 42, 35]
/** Kandidaten für eine Seite, unbenutzte zuerst, ruhige Fotos (tier 1) vor unruhigen. */
export function ranked(kind, used, seed = 0, ohneBuch = false) {
  if (kind === 'buch') {
    const o = BUCH_ORDER.map((i) => CAT[i])
    return [...o.filter((p) => !used.has(p.id)), ...o.filter((p) => used.has(p.id))]
  }
  const pool = CAT.filter((p) => (p.kind === 'portrait' || p.kind === 'ruecken' || (kind === 'innen' && p.kind === 'buch')) && !(ohneBuch && (p.kind === 'buch' || [31, 32].includes(p.id))))
  const n = pool.length
  const order = pool.map((p, i) => ({ p, k: p.tier * 1000 + ((i * 7 + seed * 5) % n) })).sort((a, b) => a.k - b.k).map((x) => x.p)
  return [...order.filter((p) => !used.has(p.id)), ...order.filter((p) => used.has(p.id))]
}
