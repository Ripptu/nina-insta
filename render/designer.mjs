// Designer-Stil für Karussells (Referenz: Panorama-Karussell einer Designerin, Christian 29.09.2026).
// Alle Seiten eines Beitrags liegen auf EINER breiten Leinwand; jede Seite ist ein Ausschnitt davon. Dadurch laufen
// Sticker und Papierschnipsel über die Seitenkanten und beim Wischen entsteht ein durchgehendes Bild.
// Bausteine: Serifenschrift (Playfair) mit kursivem Akzent, Papier mit gerissenen Kanten, Klebeband, Beschriftungsboxen,
// Sticker mit weißem Rand, Kopfzeile mit Name und Handle. Ninas Foto nur auf dem Cover, als Freisteller mit weißem Rand.
// Gesichtsschutz wie überall: Nichts, was nach der Person gezeichnet wird, darf ein Gesicht berühren.
import sharp from 'sharp'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fotoUrl, pad, ranked } from './engine.mjs'
import { findFaces, overlap } from './render.mjs'
import { teile } from './viral.mjs'
import { benutzteCoverFotos, registriereCover } from './covers.mjs'
import { esc } from './typo.mjs'

const HERE = new URL('.', import.meta.url).pathname
const FOTO_DIR = process.env.FOTO_DIR || path.join(os.homedir(), 'NINA')
const W = 1080
export const C = { rosa: '#ffc4e4', rose: '#f28dbb', beere: '#d4147a', dunkel: '#33402f', creme: '#f6efe6', butter: '#fff0a6', ink: '#1c1c1c' }
const SERIF = "'Playfair Display',serif"
const SANS = "'Inter Tight',sans-serif"

// Farbwelt (Christian, 29.09.2026): keine dunklen Flächen (weder Dunkelrot noch Schwarz), Referenz „Your Template Club“:
// durchgehender Himmel als Panorama in Pastell, weiße Karten, gelbe Klebezettel, Nina als Freisteller. Schrift in Tannengrün.
const TH = { bg: C.rosa, fg: C.dunkel, it: C.beere, body: C.dunkel, lab: '#fff', labT: C.dunkel, mark: '#fff', papier: C.rose, papierT: C.dunkel, logo: 'logo-ink.png' }
export const THEMEN = { rosa: TH, butter: TH, creme: TH }
export const HIMMEL = ['abend', 'himmel', 'meer', 'sand']
export const himmelFuer = (nr) => HIMMEL[nr % HIMMEL.length]
/** Themenfolge: für alle Seiten dieselbe Farbwelt, der Himmel liefert die Abwechslung. */
export function themen(nr, n) { return Array.from({ length: n }, () => TH) }

// ---------- kleine Helfer ----------
const rng = (seed) => { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
const sentences = (t) => t.match(/(?:[^.!?]|[.!?](?=[^\s"“”.!?]))+[.!?]+["“”]*\s*|.+$/g)?.map((s) => s.trim()) ?? [t]
const serifCss = (color, w = 900) => `font-family:${SERIF};font-weight:${w};line-height:1.04;letter-spacing:-.02em;text-wrap:balance;color:${color}`
const sansCss = (color, w = 500) => `font-family:${SANS};font-weight:${w};line-height:1.28;letter-spacing:-.01em;color:${color}`

/** Polygon mit gerissenen Kanten (px), oben und unten. */
function torn(w, h, seed, { top = true, bottom = true, amp = 7, step = 24 } = {}) {
  const r = rng(seed)
  const pts = []
  const edge = (y0, dir) => { for (let x = 0; x <= w; x += step) pts.push([Math.min(x, w), y0 + dir * (r() * amp)]) }
  if (top) edge(0, 1); else pts.push([0, 0], [w, 0])
  if (bottom) { const b = []; for (let x = w; x >= 0; x -= step) b.push([Math.max(x, 0), h - r() * amp]); pts.push(...b) } else pts.push([w, h], [0, h])
  return pts.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(',')
}

const SHADOW = 'drop-shadow(0 10px 16px rgba(0,0,0,.26))'
/** Papier mit gerissenen Kanten und Klebeband. inner = HTML im Inneren (Position relativ). */
function papier(x, y, w, h, inner, { rot = -1.4, seed = 3, bg = '#fff', tape = true, tapeC = 'rgba(255,240,166,.92)', plain = false } = {}) {
  return `<div class="box" style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;transform:rotate(${rot}deg);filter:${SHADOW}"><div style="position:absolute;inset:0;background:${bg};${plain ? '' : `clip-path:polygon(${torn(w, h, seed)})`}"></div>${inner}${tape ? `<div style="position:absolute;left:${w / 2 - 95}px;top:-26px;width:190px;height:52px;background:${tapeC};transform:rotate(-3deg);box-shadow:0 2px 6px rgba(0,0,0,.12)"></div>` : ''}</div>`
}
const box = (html, x, y, w, extra = '') => `<div class="box" style="position:absolute;left:${x}px;top:${y}px;width:${w}px;${extra}">${html}</div>`

// ---------- Sticker (eigene Zeichnungen, weißer Rand) ----------
const STK = {
  herz: `<path d="M100 172 C 26 118, 12 64, 50 40 C 76 24, 98 42, 100 62 C 104 40, 130 22, 156 38 C 194 62, 176 118, 100 172Z" fill="#f28dbb"/><path d="M52 62 C 46 68, 44 76, 46 84" stroke="#fff" stroke-width="8" stroke-linecap="round" fill="none" opacity=".85"/>`,
  funke: `<path d="M100 8 C 108 66 134 92 192 100 C 134 108 108 134 100 192 C 92 134 66 108 8 100 C 66 92 92 66 100 8Z" fill="#fff0a6" stroke="#33402f" stroke-width="5" stroke-linejoin="round"/>`,
  blume: `<g transform="translate(100 100)" stroke="#33402f" stroke-width="4">${[0, 1, 2, 3, 4, 5].map((k) => `<ellipse rx="27" ry="46" cy="-48" transform="rotate(${k * 60})" fill="#ffc4e4"/>`).join('')}<circle r="25" fill="#fff0a6"/></g>`,
  tasse: `<ellipse cx="100" cy="164" rx="80" ry="17" fill="#fff" stroke="#33402f" stroke-width="5"/><path d="M42 72 H152 V108 C152 140 128 158 97 158 C66 158 42 140 42 108Z" fill="#f6efe6" stroke="#33402f" stroke-width="5" stroke-linejoin="round"/><path d="M152 86 H170 C190 86 190 128 160 128 H150" fill="none" stroke="#33402f" stroke-width="5" stroke-linecap="round"/><path d="M80 52 C70 40 90 32 80 18 M108 52 C98 40 118 32 108 18" fill="none" stroke="#33402f" stroke-width="5" stroke-linecap="round"/><path d="M97 132 C76 118 72 100 86 96 C92 94 97 99 97 102 C97 99 104 94 110 97 C124 104 118 120 97 132Z" fill="#f28dbb"/>`,
  buecher: `<g stroke="#33402f" stroke-width="5" stroke-linejoin="round"><rect x="18" y="132" width="164" height="42" rx="7" fill="#33402f"/><rect x="18" y="132" width="164" height="42" rx="7" fill="none" stroke="#fff" stroke-width="0"/><path d="M40 132 V174 M150 132 V174" stroke="#ffc4e4"/><rect x="34" y="90" width="140" height="42" rx="7" fill="#ffc4e4" transform="rotate(-3 104 111)"/><rect x="28" y="50" width="150" height="40" rx="7" fill="#fff0a6" transform="rotate(2 100 70)"/><path d="M52 70 H150" stroke="#33402f" stroke-width="4" transform="rotate(2 100 70)"/></g>`,
  blase: `<path d="M24 40 Q24 20 44 20 H156 Q176 20 176 40 V112 Q176 132 156 132 H88 L50 172 L56 132 H44 Q24 132 24 112Z" fill="#33402f"/><circle cx="66" cy="76" r="9" fill="#ffc4e4"/><circle cx="100" cy="76" r="9" fill="#ffc4e4"/><circle cx="134" cy="76" r="9" fill="#ffc4e4"/>`,
  brief: `<rect x="16" y="48" width="168" height="112" rx="12" fill="#f6efe6" stroke="#33402f" stroke-width="5"/><path d="M20 56 L100 116 L180 56" fill="none" stroke="#33402f" stroke-width="5" stroke-linejoin="round"/><path d="M100 150 C82 138 78 124 90 120 C96 118 100 122 100 125 C100 122 106 118 112 121 C124 126 118 138 100 150Z" fill="#f28dbb" stroke="#33402f" stroke-width="3"/>`,
  handy: `<rect x="56" y="10" width="88" height="180" rx="18" fill="#33402f"/><rect x="65" y="30" width="70" height="136" rx="6" fill="#ffc4e4"/><rect x="74" y="46" width="52" height="14" rx="7" fill="#fff"/><rect x="74" y="68" width="40" height="14" rx="7" fill="#33402f" opacity=".85"/><rect x="82" y="90" width="44" height="14" rx="7" fill="#fff"/><circle cx="100" cy="178" r="4" fill="#ffc4e4"/>`,
}
const OUTLINE = 'drop-shadow(4px 0 0 #fff) drop-shadow(-4px 0 0 #fff) drop-shadow(0 4px 0 #fff) drop-shadow(0 -4px 0 #fff) drop-shadow(3px 3px 0 #fff) drop-shadow(-3px -3px 0 #fff) drop-shadow(3px -3px 0 #fff) drop-shadow(-3px 3px 0 #fff) drop-shadow(0 10px 14px rgba(0,0,0,.3))'
export const sticker = (name, cx, cy, size, rot = 0) =>
  `<div class="box st" style="position:absolute;left:${cx - size / 2}px;top:${cy - size / 2}px;width:${size}px;height:${size}px;transform:rotate(${rot}deg);filter:${OUTLINE}"><svg viewBox="0 0 200 200" width="${size}" height="${size}" style="display:block">${STK[name]}</svg></div>`
const STICKER_KEYS = [
  [/buch|lesen|seite/i, 'buecher'], [/herz|liebe|verlieb|gefühl|nähe/i, 'herz'], [/nachricht|schreib|chat|sagst|antwort|frage/i, 'blase'],
  [/handy|app|scroll|match|date/i, 'handy'], [/zuhause|ruhe|allein|tee|abend|morgen/i, 'tasse'], [/brief|post|karte|journal/i, 'brief'],
]
export const stickerFuer = (text, k = 0) => { for (const [re, n] of STICKER_KEYS) if (re.test(text)) return n; return ['funke', 'blume', 'tasse', 'herz'][k % 4] }
const ANGEBOT_STICKER = { buch: 'buecher', coaching: 'blase', shop: 'brief', veranstaltungen: 'blume' }

// ---------- Freisteller mit weißem Rand ----------
const CUT_DIR = path.join(os.tmpdir(), 'nina-cutouts')
const CUT = new Map()
export async function freisteller(p) {
  if (CUT.has(p.id)) return CUT.get(p.id)
  const maskF = HERE + '../data/masken/' + p.id + '.png'
  if (!fs.existsSync(maskF) || !p.faces.length) { CUT.set(p.id, null); return null }
  fs.mkdirSync(CUT_DIR, { recursive: true })
  const H = 1300, s = H / p.h, Wd = Math.round(p.w * s), PAD = 26
  const rgb = await sharp(path.join(FOTO_DIR, p.file)).rotate().resize(Wd, H, { fit: 'fill' }).removeAlpha().png().toBuffer()
  const alpha = await sharp(maskF).ensureAlpha().extractChannel(3).resize(Wd, H, { fit: 'fill' }).raw().toBuffer()
  const person = await sharp(rgb).joinChannel(alpha, { raw: { width: Wd, height: H, channels: 1 } }).png().toBuffer()
  const W2 = Wd + 2 * PAD, H2 = H + 2 * PAD
  const personBig = await sharp(person).extend({ top: PAD, bottom: PAD, left: PAD, right: PAD, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
  const alphaBig = Buffer.alloc(W2 * H2)
  for (let y = 0; y < H; y++) alpha.copy(alphaBig, (y + PAD) * W2 + PAD, y * Wd, (y + 1) * Wd)
  const dil = await sharp(alphaBig, { raw: { width: W2, height: H2, channels: 1 } }).blur(8).threshold(14).extractChannel(0).raw().toBuffer()
  const white = await sharp({ create: { width: W2, height: H2, channels: 3, background: '#ffffff' } }).joinChannel(dil, { raw: { width: W2, height: H2, channels: 1 } }).png().toBuffer()
  const merged = await sharp(white).composite([{ input: personBig }]).png().toBuffer()
  // Zuschnitt auf den sichtbaren Bereich
  let x0 = W2, x1 = 0, y0 = H2, y1 = 0
  for (let y = 0; y < H2; y += 2) for (let x = 0; x < W2; x += 2) if (dil[y * W2 + x] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1
  const file = path.join(CUT_DIR, `c${p.id}.png`)
  await sharp(merged).extract({ left: x0, top: y0, width: cw, height: ch }).png().toFile(file)
  const faces = p.faces.map((f) => [f[0] * s + PAD - x0, f[1] * s + PAD - y0, f[2] * s, f[3] * s]).sort((a, b) => b[2] * b[3] - a[2] * a[3])
  const r = { file, w: cw, h: ch, faces }
  CUT.set(p.id, r)
  return r
}

// ---------- Rendern ----------
const CSS_EXTRA = `.cv{position:absolute;top:0;height:100%}.box,.st{white-space:normal}html,body{background:#000}`
const COLLECT_D = () => {
  const rects = []
  let danach = false
  for (const el of document.querySelector('.cv').children) {
    if (el.classList.contains('person')) { danach = true; continue }
    if (!danach || el.classList.contains('bgd')) continue
    const label = (el.textContent || el.className || el.tagName).toString().trim().slice(0, 40)
    if (el.classList.contains('box') || el.tagName === 'svg' || el.tagName === 'IMG') {
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

export function createDesigner(eng) {
  const { ctx, meas, CSS } = eng._i
  const ZDEF = { lo: 130, hiPad: 150, top: 96, botPad: 92, kopfY: 34, logoPad: 128, logoPadCover: 150, scale: 1, anchor: 0.16 }
  const Z = { ...ZDEF }
  const zone = (z) => Object.assign(Z, ZDEF, z || {})

  const doc = (i, N, PH, body) => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}${CSS_EXTRA}html,body{height:${PH}px;width:${W}px;overflow:hidden}.page{height:${PH}px;background:none}.cv{left:${-i * W}px;width:${N * W}px}</style></head><body><div class="page"><div class="cv">${body}</div></div></body></html>`

  async function renderSlide(html, file, i, N, PH, guard) {
    const page = await ctx.newPage()
    await page.setViewportSize({ width: W, height: PH })
    const tmp = path.join(path.dirname(file), '.d-' + path.basename(file) + '.html')
    fs.writeFileSync(tmp, doc(i, N, PH, html))
    await page.goto('file://' + path.resolve(tmp))
    await page.evaluate(() => document.fonts.ready)
    await page.waitForFunction(() => [...document.images].every((im) => im.complete))
    const problems = []
    if (guard) {
      const rects = await page.evaluate(COLLECT_D)
      const bare = file + '.bare.png'
      const hide = await page.addStyleTag({ content: '.cv > *:not(.person):not(.bgd){visibility:hidden!important}' })
      await page.screenshot({ path: bare, type: 'png' })
      const faces = findFaces(bare)
      fs.rmSync(bare)
      await hide.evaluate((el) => el.remove())
      for (const f of faces) for (const { label, r } of rects) if (overlap(f, r) > 0) problems.push(`„${label}“ über Gesicht`)
    }
    if (!problems.length) await page.screenshot({ path: file, type: 'jpeg', quality: 93 })
    await page.close()
    fs.rmSync(tmp)
    return problems
  }

  // ----- Grundbausteine je Seite -----
  /** Durchgehender Himmel über alle N Seiten (Wolken, Sonnenglühen, Meer oder Papier). */
  function himmel(N, PH, v, nr) {
    const w = N * W, r = rng(nr * 97 + N)
    const P = { abend: ['#f6b3cc', '#fbd0c0', '#ffeaa9'], himmel: ['#a7d0ec', '#d8e6f3', '#ffd6e8'], meer: ['#cfe6e2', '#f4cddb', '#fbe3c6'], sand: ['#f6efe6', '#f7e4ea', '#f6efe6'] }[v] || ['#ffc4e4', '#ffc4e4', '#ffc4e4']
    let h = `<div class="bgd" style="position:absolute;left:0;top:0;width:${w}px;height:${PH}px;background:linear-gradient(180deg,${P[0]} 0%,${P[1]} 58%,${P[2]} 100%)"></div>`
    if (v === 'abend' || v === 'meer') h += `<div class="bgd" style="position:absolute;left:${r() * w - 450}px;top:${PH * 0.48}px;width:900px;height:760px;background:radial-gradient(closest-side,rgba(255,246,200,.95),rgba(255,246,200,0))"></div>`
    const n = Math.round(N * 3.6)
    for (let i = 0; i < n; i++) {
      const cw = 380 + r() * 560, ch = 90 + r() * 140
      const farbe = v === 'sand' ? (i % 2 ? '#ffc4e4' : '#fff0a6') : '#fff'
      h += `<div class="bgd" style="position:absolute;left:${r() * w - cw / 2}px;top:${r() * PH * 0.85 - 40}px;width:${cw}px;height:${ch}px;border-radius:50%;background:${farbe};opacity:${(v === 'sand' ? 0.5 : 0.5) + r() * 0.35};filter:blur(${24 + r() * 24}px)"></div>`
    }
    if (v === 'meer' || v === 'himmel') {
      const wellen = Array.from({ length: Math.ceil(w / 160) }, (_, i) => `M${i * 160} 34 q40 -22 80 0 t80 0`).join(' ')
      h += `<div class="bgd" style="position:absolute;left:0;top:${Math.round(PH * 0.86)}px;width:${w}px;height:${Math.round(PH * 0.14)}px;background:linear-gradient(#bfe0dc,#8ec3c0)"></div>`
      h += `<svg class="bgd" style="position:absolute;left:0;top:${Math.round(PH * 0.86) + 10}px" width="${w}" height="70" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="4" stroke-linecap="round"><path d="${wellen}"/></svg>`
    }
    return h
  }
  const hintergrund = (i, th) => `<div class="bgd" style="position:absolute;left:${i * W}px;top:0;width:${W + 1}px;height:100%;background:${th.bg}"></div>`
  const kopf = (i, th, PH) => {
    const c = `position:absolute;top:${Z.kopfY}px;font:500 22px/1 ${SANS};color:${th.fg};opacity:.8;white-space:nowrap`
    return `<div style="${c};left:${i * W + 60}px">Nina Hömmen</div><div style="${c};left:${i * W + W / 2 - 90}px">traumasensibles Coaching</div><div style="${c};left:${i * W + W - 60 - 260}px;width:260px;text-align:right">@ninahoemmencoaching</div>`
  }
  const logoEl = (i, th, PH, cover, seite = 0) => `<img class="box" src="file://${HERE}../assets/${th.logo}" style="position:absolute;width:${cover ? 130 : 120}px;left:${i * W + (seite > 0 ? W - 130 - 34 : seite < 0 ? 34 : cover ? W - 130 - 34 : W / 2 - 60)}px;top:${PH - (cover ? Z.logoPadCover : Z.logoPad)}px;opacity:.95">`
  const marke = (th, t) => `<span style="background:linear-gradient(transparent 56%,${th.mark} 56%);padding:0 .06em">${esc(t)}</span>`
const laengstesWort = (t) => t.replace(/[.,!?„“"]/g, '').split(' ').filter((w) => !w.includes('-')).sort((a, b) => b.length - a.length)[0] || ''
  async function fit(sizes, fn) { for (const s of sizes) { const r = await fn(Math.round(s * Z.scale)); if (r) return r } return null }

  // ----- Textseiten -----
  async function textSeite(i, raw, th, PH, variant, k) {
    const o = i * W
    const ss = sentences(raw)
    const head = ss[0], rest = ss.slice(1).join(' ')
    const lo = Z.lo, hi = PH - Z.hiPad
    return fit(variant === 'label' ? [92, 84, 76, 68, 62, 56, 52] : [140, 124, 110, 100, 92, 84, 76, 68, 62, 56, 52], async (hs) => {
      const bs = variant === 'papier' ? Math.max(32, Math.min(Math.round(50 * Z.scale), Math.round(hs * 0.48))) : Math.max(34, Math.min(Math.round(54 * Z.scale), Math.round(hs * 0.5)))
      const headHtml = variant === 'label'
        ? `<span style="background:${th.lab};color:${th.labT};padding:.03em .3em;border-radius:.3em;-webkit-box-decoration-break:clone;box-decoration-break:clone;line-height:1.5">${esc(head)}</span>`
        : variant === 'statement' ? esc(head).replace(esc(laengstesWort(head)), (m) => marke(th, m)) : esc(head)
      const hH = await meas(headHtml, 900, '', hs, serifCss(th.fg) + (variant === 'label' ? ';line-height:1.5' : ''))
      const bw = variant === 'papier' || variant === 'notiz' ? 720 : 860
      const notizCss = `font-family:'Caveat',cursive;font-weight:700;line-height:1.08;color:${C.dunkel}`
      const bH = rest ? await meas(esc(rest), bw, '', variant === 'notiz' ? Math.round(bs * 1.32) : bs, variant === 'notiz' ? notizCss : sansCss(variant === 'papier' ? C.dunkel : th.body)) : 0
      const card = (variant === 'papier' || variant === 'notiz') && rest ? bH + 104 : 0
      const need = hH + (rest ? 50 + (card || bH) : 0)
      if (need > (hi - lo) * 0.74) return null
      const y = lo + (hi - lo - need) * Z.anchor
      let html = `<div style="position:absolute;left:${o + 90}px;top:${y}px;width:900px;${serifCss(th.fg)};font-size:${hs}px;${variant === 'label' ? 'line-height:1.5;transform:rotate(-1.4deg);transform-origin:left top' : ''}">${headHtml}</div>`
      let yy = y + hH + 50
      if (rest && variant === 'notiz') {
        html += papier(o + 110, yy, 820, card, `<div style="position:absolute;left:50px;top:52px;width:${bw}px;${notizCss};font-size:${Math.round(bs * 1.32)}px">${esc(rest)}</div>`, { rot: [1.6, -1.4, 2][k % 3], seed: 5 + i, bg: C.butter, plain: true, tapeC: 'rgba(255,196,228,.9)' })
      } else if (rest && variant === 'papier') {
        html += papier(o + 110, yy, 820, card, `<div style="position:absolute;left:50px;top:52px;width:${bw}px;${sansCss(C.dunkel)};font-size:${bs}px">${esc(rest)}</div>`, { rot: [-1.3, 1.1, -0.8][k % 3], seed: 11 + i * 5 + k })
      } else if (rest) {
        html += `<div style="position:absolute;left:${o + 90}px;top:${yy}px;width:${bw}px;${sansCss(th.body)};font-size:${bs}px">${esc(rest)}</div>`
      }
      return { html, zone: [y, y + need + 20] }
    })
  }

  async function zitatSeite(i, raw, th, PH, k) {
    const o = i * W
    const q = raw.replace(/^[„“"]|[“”"]$/g, '')
    const lo = Z.lo, hi = PH - Z.hiPad
    return fit([92, 84, 76, 68, 60, 54], async (hs) => {
      const h = await meas(esc(q), 860, '', hs, `${serifCss(th.fg, 700)};font-style:italic;line-height:1.14`)
      const need = h + 250
      if (need > hi - lo) return null
      const y = lo + (hi - lo - need) * Math.max(0.4, Z.anchor)
      const html = `<div style="position:absolute;left:${o + 74}px;top:${y - 40}px;font:900 380px/1 ${SERIF};color:${th.it === '#fff' ? C.rose : th.it}">“</div>` +
        `<div style="position:absolute;left:${o + 90}px;top:${y + 230}px;width:860px;${serifCss(th.fg, 700)};font-style:italic;line-height:1.14;font-size:${hs}px">${esc(q)}</div>`
      return { html, zone: [y, y + need] }
    })
  }

  async function chatSeite(i, a, b, th, PH) {
    const o = i * W
    const lo = Z.lo + 20, hi = PH - Z.hiPad - 20
    return fit([72, 66, 60, 54, 48, 44, 40], async (size) => {
      const st = `font-family:${SANS};font-weight:500;font-size:${size}px;line-height:1.16;letter-spacing:-.02em`
      const ha = await meas(esc(a), 780, '', size, st) + 70
      const hb = await meas(esc(b), 780, '', size, st) + 70
      const need = ha + hb + 60
      if (need > hi - lo) return null
      const y = lo + (Z.scale > 1 ? (hi - lo - need) * 0.3 : Math.min(90, (hi - lo - need) * 0.28))
      const bub = (t, x, yy, h, bg, fg, left) => `<div class="box" style="position:absolute;left:${o + x}px;top:${yy}px;width:860px;height:${h}px;background:${bg};color:${fg};${st};padding:35px 50px;border-radius:64px;${left ? 'border-bottom-left-radius:16px' : 'border-bottom-right-radius:16px'};box-shadow:0 8px 24px rgba(0,0,0,.18)">${esc(t)}</div>`
      const html = bub(a, 60, y, ha, '#fff', C.ink, true) + bub(b, 160, y + ha + 60, hb, th.bg === C.rosa ? C.butter : C.rosa, C.dunkel, false)
      return { html, zone: [y, y + need] }
    })
  }

  // ----- Schlussseite (Werbung / Hinweis) -----
  async function schluss(i, raw, th, PH, foto, k, angebot = '') {
    const o = i * W
    let t = raw
    const hatLink = /Link in der Bio/i.test(t)
    t = t.replace(/\s*Link in der Bio\.?/i, '').trim()
    const ss = sentences(t)
    const head = ss[0]
    const rest = ss.slice(1).join(' ')
    const lo = Z.lo, hi = PH - Z.hiPad
    return fit(foto ? [76, 68, 62, 56, 50, 46] : [110, 100, 90, 80, 72, 64, 58, 52], async (hs) => {
      const bs = Math.max(34, Math.min(46, Math.round(hs * 0.48)))
      const hH = await meas(esc(head), 900, '', hs, serifCss(th.fg))
      const bw = foto ? 500 : 860
      const bH = rest ? await meas(esc(rest), bw, '', bs, sansCss(th.body)) : 0
      const btnS = foto ? 42 : 54
      const btn = hatLink ? btnS + 52 : 0
      const spalte = (rest ? bH + 40 : 0) + btn
      const reihe = foto ? Math.max(spalte, 520) : spalte
      const need = hH + 44 + reihe
      if (need > (hi - lo) * 0.92) return null
      let y = lo + Math.max(0, (hi - lo - need) * 0.3)
      let html = `<div style="position:absolute;left:${o + 90}px;top:${y}px;width:900px;${serifCss(th.fg)};font-size:${hs}px">${esc(head)}</div>`
      y += hH + 44
      if (foto) {
        const cw = 380, chh = 500
        const inner = `<div style="position:absolute;left:18px;top:18px;width:${cw - 36}px;height:${chh - 96}px;background:url('${fotoUrl(foto)}') center/cover"></div><div style="position:absolute;left:0;right:0;bottom:14px;text-align:center;font:700 34px/1 'Caveat',cursive;color:${C.dunkel}">Zwischen Single-Sein &amp; falscher Nähe</div>`
        html += `<div class="box" style="position:absolute;left:${o + W - cw - 70}px;top:${y}px;width:${cw}px;height:${chh}px;background:#fff;transform:rotate(3.5deg);box-shadow:0 14px 26px rgba(0,0,0,.28)">${inner}<div style="position:absolute;left:${cw / 2 - 80}px;top:-22px;width:160px;height:44px;background:rgba(255,240,166,.92);transform:rotate(-4deg)"></div></div>`
      }
      if (rest) { html += `<div style="position:absolute;left:${o + 90}px;top:${y}px;width:${bw}px;${sansCss(th.body)};font-size:${bs}px">${esc(rest)}</div>`; y += bH + 40 }
      if (hatLink) html += `<div class="box" style="position:absolute;left:${o + 90}px;top:${y}px;background:${C.dunkel};color:${C.creme};font:600 ${btnS}px/1 ${SANS};letter-spacing:-.02em;padding:${Math.round(btnS * 0.5)}px ${Math.round(btnS * 0.9)}px;border-radius:70px;box-shadow:0 8px 20px rgba(0,0,0,.25);white-space:nowrap">Link in der Bio&nbsp;&nbsp;&#8599;</div>`
      const frei = hi - (lo + Math.max(0, (hi - lo - need) * 0.3) + need)
      if (!foto && ANGEBOT_STICKER[angebot.toLowerCase()] && frei >= 250) html += sticker(ANGEBOT_STICKER[angebot.toLowerCase()], o + W - 210, hi - 20 - (frei - 40) / 2, Math.min(250, frei - 30), -8)
      return { html, zone: [lo, lo + need + 30] }
    })
  }

  // ----- Cover -----
  async function cover(spec, p, th, N, PH, post, nr) {
    const cut = await freisteller(p)
    if (!cut) return null
    const { a, b } = teile(spec.head)
    const headHtml = (size) => `${esc(a)}${b ? `<br><span style="font-style:italic;font-weight:700;color:${th.it}">${esc(b)}</span>` : ''}`
    const f = cut.faces[0]
    const fb = pad(f, 10)
    const ftop = fb[1] / cut.h
    for (const modus of ['strip', 'unter']) {
      for (const size of [136, 124, 112, 102, 94, 86].map((x) => Math.round(x * Z.scale))) {
        const hHead = await meas(headHtml(size), 940, '', size, `${serifCss(th.fg)};line-height:1.0`)
        const subH = spec.sub ? await meas(esc(spec.sub), 800, '', 40, sansCss(th.papierT, 600)) : 0
        const subUnter = modus === 'unter' && spec.sub ? subH + 24 : 0
        const top = Z.top
        const cutY = top + hHead + subUnter + 26
        const k = Math.min(((PH - cutY) * 1.9) / cut.h, (W * 2.2) / cut.w)
        const cutH = cut.h * k, cutW = cut.w * k
        if (cutH < PH * 0.6) continue
        const faceCx = (fb[0] + fb[2] / 2) * k
        for (const shift of [40, -50, 130, -140]) {
          const cutX = W / 2 + shift - faceCx
          const fx0 = cutX + fb[0] * k, fx1 = fx0 + fb[2] * k
          if (fx0 < 40 || fx1 > W - 40) continue
          const faceBottom = cutY + (fb[1] + fb[3]) * k
          const stripH = spec.sub ? subH + 64 : 0
          const stripY = PH - stripH - Z.botPad
          if (modus === 'strip' && spec.sub && faceBottom + 34 > stripY) continue
          let html = ''
          // Papier hinter der Person, Kopf ragt darüber hinaus
          const paperTop = cutY + (fb[1] + fb[3] * 0.62) * k
          html += papier(30, paperTop, W - 60, PH, '', { rot: shift > 0 ? 1.6 : -1.6, seed: 40 + nr, bg: th.papier, tape: false }).replace('class="box"', 'class="box bgd"')
          html += `<img class="person" src="file://${cut.file}" style="position:absolute;left:${cutX}px;top:${cutY}px;width:${cutW}px;height:${cutH}px;clip-path:inset(0 ${Math.max(0, cutX + cutW - W)}px 0 ${Math.max(0, -cutX)}px);filter:drop-shadow(0 12px 20px rgba(0,0,0,.28))">`
          html += `<div style="position:absolute;left:60px;top:${top}px;width:960px;${serifCss(th.fg)};font-size:${size}px;line-height:1.0">${headHtml(size)}</div>`
          if (subUnter) html += `<div style="position:absolute;left:62px;top:${top + hHead + 18}px;width:800px;${sansCss(th.fg, 600)};font-size:40px;opacity:.9">${esc(spec.sub)}</div>`
          if (modus === 'strip' && spec.sub) html += papier(50, stripY, 900, stripH, `<div style="position:absolute;left:50px;top:32px;width:800px;${sansCss(th.papierT, 600)};font-size:40px">${esc(spec.sub)}</div>`, { rot: -1.8, seed: 70 + nr, bg: th.papier, tape: false })
          const seiteFrei = Math.min(cutX, W - cutX - cutW)
          const bboxRechts = cutX + cutW
          return { html, zone: [top, top + hHead + subUnter + 20], person: { x: cutX, w: cutW, y: cutY }, rechtsFrei: bboxRechts < W - 190, seiteFrei, faceBottom }
        }
      }
    }
    return null
  }

  // ----- Nina als Freisteller auf Innenseiten (unter dem Text, groß, unten angeschnitten) -----
  async function personInnen(i, p, zoneBottom, PH, side = 1) {
    const cut = await freisteller(p)
    if (!cut) return null
    const o = i * W
    const fb = pad(cut.faces[0], 10)
    const cutY = zoneBottom + 16
    if (PH - cutY < PH * 0.34) return null
    const k = Math.min(((PH - cutY) * 1.9) / cut.h, (W * 2.2) / cut.w)
    const cutH = cut.h * k, cutW = cut.w * k
    const faceCx = (fb[0] + fb[2] / 2) * k
    for (const shift of [side * 190, side * 100, 0, -side * 100]) {
      const x = o + W / 2 + shift - faceCx
      const fx0 = x + fb[0] * k - o, fx1 = fx0 + fb[2] * k
      if (fx0 < 40 || fx1 > W - 40) continue
      const l = Math.max(0, o - x), r = Math.max(0, x + cutW - (o + W))
      return { html: `<img class="person" src="file://${cut.file}" style="position:absolute;left:${x}px;top:${cutY}px;width:${cutW}px;height:${cutH}px;clip-path:inset(0 ${r}px 0 ${l}px);filter:drop-shadow(0 12px 20px rgba(0,0,0,.28))">`, mitte: x + cutW / 2 - o }
    }
    return null
  }

  // ----- Textcover (wenn alle Fotos schon Cover waren) -----
  async function coverText(spec, th, PH, nr) {
    const { a, b } = teile(spec.head)
    const headHtml = `${esc(a)}${b ? `<br><span style="font-style:italic;font-weight:700;color:${th.it}">${esc(b)}</span>` : ''}`
    const top = Z.lo
    for (const size of [176, 160, 146, 132, 120, 108, 98].map((x) => Math.round(x * Z.scale))) {
      const hHead = await meas(headHtml, 940, '', size, `${serifCss(th.fg)};line-height:1.0`)
      const subH = spec.sub ? await meas(esc(spec.sub), 780, '', 46, sansCss(C.dunkel, 600)) : 0
      const card = spec.sub ? subH + 110 : 0
      const ende = top + hHead + (card ? 70 + card : 0)
      if (ende > PH - Z.hiPad - 20) continue
      let html = `<div style="position:absolute;left:60px;top:${top}px;width:960px;${serifCss(th.fg)};font-size:${size}px;line-height:1.0">${headHtml}</div>`
      if (card) html += papier(70, top + hHead + 70, 860, card, `<div style="position:absolute;left:50px;top:50px;width:780px;${sansCss(C.dunkel, 600)};font-size:46px">${esc(spec.sub)}</div>`, { rot: -1.6, seed: 90 + nr })
      const frei = PH - Z.hiPad - ende
      if (frei >= 260) html += sticker(stickerFuer(spec.head + ' ' + (spec.sub || ''), nr), W - 260, PH - Z.hiPad - (frei - 30) / 2 - 10, Math.min(300, frei - 30), 8)
      return { html, zone: [top, ende + 20], rechtsFrei: true, person: null, textcover: true }
    }
    return null
  }

  // ----- Verbinder über die Seitenkanten -----
  function verbinder(N, zonen, post, th, cov, PH = 1350) {
    const angebot = (post.angebot || '').toLowerCase()
    let html = ''
    for (let s = 0; s < N - 1; s++) {
      const za = zonen[s], zb = zonen[s + 1]
      let size = s === 0 ? 190 : 170
      let lo = Z.lo - 10, hi = PH - Z.hiPad
      const belegt = [za, zb].filter(Boolean)
      if (s === 0 && cov && !cov.rechtsFrei) belegt.push([lo, PH])
      if (s === 0 && cov && cov.rechtsFrei) belegt.push([lo, cov.zone[1]])
      const oben = Math.min(...belegt.map((z) => z[0])) - lo
      const unten = hi - Math.max(...belegt.map((z) => z[1]))
      let cy
      const freiMax = Math.max(unten, oben)
      size = Math.max(size, Math.min(250, freiMax - 30))
      if (unten >= size + 20 && unten >= oben) cy = hi - unten / 2 - 5 + 0
      else if (oben >= size + 20) cy = lo + oben / 2
      else continue
      const name = s === 0 && ANGEBOT_STICKER[angebot] ? ANGEBOT_STICKER[angebot] : stickerFuer(post.pages[s + 1]?.text || '', post.nr + s)
      html += sticker(name, (s + 1) * W + (s % 2 ? 6 : -6), cy, size, [-9, 8, -6, 10][s % 4])
    }
    return html
  }

  return { himmel, personInnen, zone, renderSlide, cover, coverText, textSeite, zitatSeite, chatSeite, schluss, hintergrund, kopf, logoEl, verbinder, doc }
}

// ---------- Beitrag ----------
export async function buildDesigner(eng, post, outDir, { PH = 1350 } = {}) {
  const D = (eng._designer ||= createDesigner(eng))
  D.zone()
  fs.mkdirSync(outDir, { recursive: true })
  const N = post.pages.length
  const th = themen(post.nr, N)
  const sky = himmelFuer(post.nr)
  const log = []
  // Cover: Foto mit Freisteller, jedes Foto nur einmal
  const gesperrt = benutzteCoverFotos(`k${post.nr}`)
  const kands = process.env.DEMO_TEXTCOVER ? [] : ranked('portrait', new Set(), post.nr).filter((x) => !gesperrt.has(x.id))
  const covPg = post.pages[0]
  let cov = null, foto = null
  for (const p of kands) {
    cov = await D.cover(covPg, p, th[0], N, PH, post, post.nr)
    if (!cov) continue
    // Probelauf des Covers mit Gesichtsschutz
    const probe = path.join(outDir, '.probe.jpg')
    const html = D.himmel(N, PH, sky, post.nr) + D.kopf(0, th[0], PH) + cov.html + D.logoEl(0, th[0], PH, true)
    const probs = await D.renderSlide(html, probe, 0, N, PH, true)
    fs.rmSync(probe, { force: true })
    if (probs.length) { log.push(`  Cover: Foto ${p.id} verworfen (${probs[0]})`); cov = null; continue }
    foto = p
    break
  }
  if (!cov) {
    cov = await D.coverText(covPg, th[0], PH, post.nr)
    if (!cov) throw new Error(`Karussell ${post.nr}: kein Cover möglich`)
    log.push('  Cover: reines Textcover (keine freien Cover-Fotos)')
  }
  const buchFotos = ranked('buch', new Set(), post.nr)
  // Seiten layouten
  const teile = [{ zone: cov.zone, html: '' }]
  const benutzt = new Set(foto ? [foto.id] : [])
  const poolPersonen = ranked('portrait', new Set(), post.nr * 3).filter((x) => x.faces.length && fs.existsSync(new URL(`../data/masken/${x.id}.png`, import.meta.url)))
  for (let i = 1; i < N; i++) {
    const pg = post.pages[i]
    const raw = (pg.text || '').replace(/\s+/g, ' ').trim()
    const k = post.nr + i
    const m = raw.match(/^((?:Du sagst|Vorher)[^]*?)\s+((?:Manchmal meinst du|Nachher)[^]*)$/)
    const schlussSeite = pg.role === 'close' || pg.role === 'buch' || i === N - 1
    const gestalte = async () => {
      let r = null
      if (pg.role === 'quote') r = await D.zitatSeite(i, raw, th[i], PH, k)
      else if (m) r = await D.chatSeite(i, m[1], m[2], th[i], PH)
      else if (schlussSeite) r = await D.schluss(i, raw, th[i], PH, pg.role === 'buch' || /buch/i.test(post.angebot || '') ? buchFotos[0] : null, k, post.angebot || '')
      else r = await D.textSeite(i, raw, th[i], PH, ['papier', 'notiz', 'statement', 'label'][k % 4], k)
      if (!r && schlussSeite) r = await D.schluss(i, raw, th[i], PH, null, k, post.angebot || '')
      if (!r) r = await D.textSeite(i, raw, th[i], PH, 'statement', k)
      return r
    }
    // Nina als Freisteller auf jeder zweiten Innenseite (Referenz: Person wiederholt sich): Text kompakt oben, Nina groß darunter
    let r = null, person = null
    if (!schlussSeite && !m && pg.role !== 'quote' && (i % 2 === 1 || N <= 5)) {
      D.zone({ hiPad: Math.round(PH * 0.42), anchor: 0.04 })
      const kompakt = await gestalte()
      D.zone()
      if (kompakt) {
        for (const p of poolPersonen.filter((x) => !benutzt.has(x.id))) {
          person = await D.personInnen(i, p, kompakt.zone[1], PH, i % 4 === 1 ? 1 : -1)
          if (person) { benutzt.add(p.id); person.foto = p.id; break }
        }
        if (person) r = kompakt
      }
    }
    if (!r) r = await gestalte()
    if (!r) throw new Error(`Karussell ${post.nr} Seite ${pg.n}: Text passt nicht`)
    teile.push(person ? { ...r, person, zone: [r.zone[0], PH] } : r)
  }
  const zonen = teile.map((t) => t.zone)
  const conn = D.verbinder(N, zonen, post, th, cov, PH)
  const files = []
  for (let i = 0; i < N; i++) {
    const file = path.join(outDir, `${String(post.pages[i].n).padStart(2, '0')}.jpg`)
    // Reihenfolge auf der Leinwand: alle Hintergründe, Kopfzeilen, Inhalte; Cover-Person liegt vor dem Papier, Verbinder danach
    let html = ''
    html += D.himmel(N, PH, sky, post.nr)
    for (let j = 0; j < N; j++) html += D.kopf(j, th[j], PH)
    html += cov.html
    for (let j = 1; j < N; j++) html += (teile[j].person?.html || '') + teile[j].html + D.logoEl(j, th[j], PH, false, teile[j].person ? (teile[j].person.mitte < W / 2 ? 1 : -1) : 0)
    html += D.logoEl(0, th[0], PH, true)
    html += conn
    const probs = await D.renderSlide(html, file, i, N, PH, (i === 0 && !!foto) || !!teile[i].person)
    if (probs.length) throw new Error(`Karussell ${post.nr} Seite ${post.pages[i].n}: ${probs[0]}`)
    files.push(file)
    log.push(`  Seite ${post.pages[i].n}: ${i === 0 ? (foto ? `Cover (Freisteller, Foto ${foto.id})` : 'Cover (Text)') : post.pages[i].role}${teile[i].person ? `, Nina Foto ${teile[i].person.foto}` : ''}`)
  }
  if (!process.env.DEMO) registriereCover(`k${post.nr}`, foto ? foto.id : 'text')
  return { files, log }
}

// ---------- Reel-Bilder (1080 × 1920, sichere Zone für die Instagram-Oberfläche) ----------
const REEL_ZONE = { lo: 270, hiPad: 520, top: 280, botPad: 470, kopfY: 200, logoPad: 470, logoPadCover: 470, scale: 1.3, anchor: 0.42 }
/** Ein Reel-Bild im Designer-Stil. kind: cover | quote | text. Rückgabe { foto } (nur beim Cover ein Foto) oder null. */
export async function reelBild(eng, { kind, spec, cands, file, nr, index, log = [] }) {
  const D = (eng._designer ||= createDesigner(eng))
  const PH = 1920
  D.zone(REEL_ZONE)
  try {
    const th = TH
    const body = (html, t, cover) => D.himmel(1, PH, himmelFuer(nr + index), nr + index) + D.kopf(0, t, PH) + html + D.logoEl(0, t, PH, !!cover)
    const post = { nr, angebot: '', pages: [] }
    if (kind === 'cover') {
      for (const p of cands) {
        const cov = await D.cover(spec, p, th, 1, PH, post, nr)
        if (!cov) continue
        const probs = await D.renderSlide(body(cov.html, th, true), file, 0, 1, PH, true)
        if (!probs.length) { log.push(`Cover (Designer, Freisteller, Foto ${p.id})`); return { foto: p.id } }
        log.push(`Cover: Foto ${p.id} verworfen (${probs[0]})`)
      }
      const t = await D.coverText(spec, th, PH, nr)
      if (!t) return null
      const probs = await D.renderSlide(body(t.html, th, true), file, 0, 1, PH, false)
      if (probs.length) return null
      log.push('Cover (Designer, Text)')
      return { foto: null }
    }
    const raw = spec.text.replace(/\s+/g, ' ').trim()
    const m = raw.match(/^((?:Du sagst|Vorher)[^]*?)\s+((?:Manchmal meinst du|Nachher)[^]*)$/)
    const r = (m ? await D.chatSeite(0, m[1], m[2], th, PH) : null) ||
      (kind === 'quote' ? await D.textSeite(0, raw, th, PH, 'statement', nr + index) : null) ||
      (await D.textSeite(0, raw, th, PH, ['papier', 'label'][(nr + index) % 2], nr + index)) ||
      (await D.textSeite(0, raw, th, PH, 'statement', nr + index))
    if (!r) return null
    const probs = await D.renderSlide(body(r.html, th, false), file, 0, 1, PH, false)
    return probs.length ? null : { foto: null }
  } finally { D.zone() }
}
