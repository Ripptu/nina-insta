// Viral-Cover: mehrere Cover-Vorlagen im Stil Foto-Typo. Jede prüft selbst, dass kein Gesicht verdeckt wird.
//  behind   Riesige Schrift HINTER Nina (Freisteller-Maske), Kopf und Körper ragen davor
//  message  Hook als iMessage-Chat mit „schreibt …“-Blase
//  markiert Hook als markierter iOS-Text mit „Kopieren / Alles auswählen“
//  kreis    Hook groß, Kernwort handgezeichnet eingekreist, Pfeil und „swipe“
//  stapel   Kernwort dreifach gestapelt (Echo) über der Überschrift
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
import * as Y from './typo.mjs'
import { fotoUrl, place, pickCrop, freeBand, pad, inside } from './engine.mjs'
import { COLLECT, findFaces, overlap } from './render.mjs'

const HERE = new URL('.', import.meta.url).pathname
const esc = Y.esc
const GRADE = 'saturate(.9) contrast(1.06) brightness(.92)'

// ---------- Maske ----------
const MASKS = new Map()
export async function maskGrid(id) {
  if (MASKS.has(id)) return MASKS.get(id)
  const f = HERE + '../data/masken/' + id + '.png'
  let g = null
  if (fs.existsSync(f)) {
    const { data, info } = await sharp(f).ensureAlpha().extractChannel(3).resize(108, 144, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true })
    g = { w: info.width, h: info.height, data }
  }
  MASKS.set(id, g)
  return g
}
/** Anteil der Fläche von box (Seitenkoordinaten), der von der Person überdeckt wird. */
function coverage(pl, p, g, box, step = 10) {
  let n = 0, c = 0
  for (let y = box[1] + step / 2; y < box[1] + box[3]; y += step)
    for (let x = box[0] + step / 2; x < box[0] + box[2]; x += step) {
      n++
      const u = (x - pl.x) / pl.dw, v = (y - pl.y) / pl.dh
      if (u < 0 || v < 0 || u >= 1 || v >= 1) continue
      if (g.data[Math.floor(v * g.h) * g.w + Math.floor(u * g.w)] > 127) c++
    }
  return n ? c / n : 0
}
const core = (f) => [f[0] + f[2] * 0.08, f[1] + f[3] * 0.08, f[2] * 0.84, f[3] * 0.84]

// ---------- Hook zerlegen ----------
export function teile(head) {
  const h = head.replace(/\s+/g, ' ').trim()
  let a = h, b = ''
  const m = h.match(/^(.*[,:;.!?][“”"]?)\s+(.+)$/)
  if (m) { a = m[1]; b = m[2] } else { const w = h.split(' '); if (w.length >= 5) { a = w.slice(0, -2).join(' '); b = w.slice(-2).join(' ') } }
  return { a, b, mehrTeile: !!m }
}
const schluesselwort = (b) => (b || '').replace(/[.,!?„“"]/g, '').split(' ').sort((x, y) => y.length - x.length)[0] || ''

export function createViral(eng) {
  const { ctx, meas, rects, pageHtml, bandShade, logo, W } = eng._i

  const photoLayer = (p, pl, dark = 0.16) =>
    `<div class="photo" style="background-image:url('${fotoUrl(p)}');background-size:${pl.dw}px ${pl.dh}px;background-position:${pl.x}px ${pl.y}px;filter:${GRADE}"></div><div class="shade" style="background:rgba(12,14,12,${dark})"></div>`
  const personLayer = (p, pl, outline = false) => {
    const m = `url('file://${HERE}../data/masken/${p.id}.png')`
    const sz = `${pl.dw}px ${pl.dh}px`, ps = `${pl.x}px ${pl.y}px`
    const inner = `position:absolute;inset:0;background-image:url('${fotoUrl(p)}');background-size:${sz};background-position:${ps};background-repeat:no-repeat;-webkit-mask-image:${m};-webkit-mask-size:${sz};-webkit-mask-position:${ps};-webkit-mask-repeat:no-repeat;filter:${GRADE}`
    // weißer Rand um die Person: Kopie der Maske aufgeweitet dahinter (drop-shadow auf einer Ebene mit Maske)
    return outline
      ? `<div class="person" style="position:absolute;inset:0;filter:drop-shadow(0 0 0 #fff) drop-shadow(5px 0 0 #fff) drop-shadow(-5px 0 0 #fff) drop-shadow(0 5px 0 #fff) drop-shadow(0 -5px 0 #fff)"><div style="${inner}"></div></div>`
      : `<div class="person" style="${inner}"></div>`
  }

  // ---------- Rendern mit Gesichtsschutz (auch für Text hinter der Person) ----------
  async function render(html, file, PH) {
    const page = await ctx.newPage()
    await page.setViewportSize({ width: W, height: PH })
    const tmp = path.join(path.dirname(file), '.v-' + path.basename(file) + '.html')
    fs.writeFileSync(tmp, html)
    await page.goto('file://' + path.resolve(tmp))
    await page.evaluate(() => document.fonts.ready)
    await page.waitForFunction(() => [...document.images].every((im) => im.complete))
    const problems = []
    const rs = await page.evaluate(COLLECT)
    const bare = file + '.bare.png'
    const hide = await page.addStyleTag({ content: '.page > *:not(.photo){visibility:hidden!important}' })
    await page.screenshot({ path: bare, type: 'png' })
    const faces = findFaces(bare)
    fs.rmSync(bare)
    await hide.evaluate((el) => el.remove())
    for (const f of faces) for (const { label, r } of rs) if (overlap(f, r) > 0) problems.push(`„${label}“ über Gesicht`)
    if (html.includes('class="hd abs behind"') || html.includes('behind')) {
      // Text hinter der Person: Gesicht muss mit und ohne Text gleich aussehen
      const letters = await page.evaluate(() => {
        const out = []
        for (const el of document.querySelectorAll('.behind')) {
          const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
          for (let n = tw.nextNode(); n; n = tw.nextNode())
            for (let i = 0; i < n.data.length; i++) {
              if (!/\p{L}/u.test(n.data[i])) continue
              const rg = document.createRange(); rg.setStart(n, i); rg.setEnd(n, i + 1)
              const r = rg.getBoundingClientRect()
              if (r.width > 2) out.push([r.left, r.top, r.width, r.height, n.data[i]])
            }
        }
        return out
      })
      const off = await page.addStyleTag({ content: '.behind{visibility:hidden!important}' })
      const a = await page.screenshot({ type: 'png' })
      await off.evaluate((el) => el.remove())
      const b = await page.screenshot({ type: 'png' })
      // Jeder Buchstabe muss im fertigen Bild sichtbar sein (Bild mit und ohne Schrift vergleichen)
      const fa = await sharp(a).raw().toBuffer({ resolveWithObject: true }), fb = await sharp(b).raw().toBuffer()
      const { width: iw, height: ih, channels: ch } = fa.info
      for (const [lx, ly, lw, lh, c] of letters) {
        const x0 = Math.max(0, Math.floor(lx)), x1 = Math.min(iw, Math.ceil(lx + lw)), y0 = Math.max(0, Math.floor(ly)), y1 = Math.min(ih, Math.ceil(ly + lh))
        let diff = 0, tot = 0
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
          const o = (y * iw + x) * ch
          tot++
          if (Math.abs(fa.data[o] - fb[o]) + Math.abs(fa.data[o + 1] - fb[o + 1]) + Math.abs(fa.data[o + 2] - fb[o + 2]) > 40) diff++
        }
        if (tot && diff / tot < 0.1) { problems.push(`Buchstabe „${c}“ verdeckt`); break }
      }
      for (const f of faces) {
        const box = { left: Math.max(0, Math.round(f[0] + f[2] * 0.2)), top: Math.max(0, Math.round(f[1] + f[3] * 0.3)), width: Math.round(f[2] * 0.6), height: Math.round(f[3] * 0.5) }
        const ra = await sharp(a).extract(box).raw().toBuffer(), rb = await sharp(b).extract(box).raw().toBuffer()
        let d = 0
        for (let i = 0; i < ra.length; i++) d += Math.abs(ra[i] - rb[i])
        if (d / ra.length > 3) problems.push('Text scheint durch das Gesicht')
      }
    }
    if (!problems.length) await page.screenshot({ path: file, type: 'jpeg', quality: 93 })
    await page.close()
    fs.rmSync(tmp)
    return problems
  }

  const headHtml = (a, b, ca, cb, br) => `${esc(a)}${b ? `${br ? '<br>' : ' '}<span id="kb" style="color:${cb}">${esc(b)}</span>` : ''}`

  // ---------- Vorlage: Text hinter Nina ----------
  async function behind(spec, p, { PH = 1350, outline = false, lo: LO, hi: HI } = {}) {
    const g = await maskGrid(p.id)
    if (!g || !p.faces.length) return null
    const { a, b, mehrTeile } = teile(spec.head)
    // Zeilen einzeln setzen, damit jede Zeile ihre eigene Verdeckung bekommt
    const html = headHtml(a, b, '#fff', Y.PINK, true)
    for (const size of [230, 200, 176, 154, 136, 120]) {
      const r = await rects(html, 980, 'hd', size, 'text-align:center;line-height:.88;color:#fff')
      const lines = r.lines
      if (!lines.length || lines.length > 5 || r.h > PH * 0.62) continue
      const sub = spec.sub ? await meas(esc(spec.sub), 640, 'hand', 64, 'position:static;line-height:1.02') : 0
      let best = null
      for (const zoom of [1.05, 1.18, 1.32])
        for (const ay of [1, 0.7, 0.4])
          for (const ax of [0.5, 0.3, 0.7]) {
            const pl = place(p, W, PH, zoom, ax, ay)
            if (pl.faces.some((f) => inside(f, W, PH) < 0.98)) continue
            // Gesichtskern muss von der Person überdeckt sein, sonst würde Text durchscheinen
            if (pl.faces.some((f) => coverage(pl, p, g, core(f), 8) < 0.97)) continue
            for (let y = LO ?? 70; y + r.h <= (HI ?? PH - 260); y += 20) {
              let mx = 0, sum = 0
              for (const l of lines) {
                const cov = coverage(pl, p, g, [30 + l[0], y + l[1], l[2], l[3]], 12)
                mx = Math.max(mx, cov); sum += cov
              }
              const avg = sum / lines.length
              if (mx > 0.22 || avg < 0.03) continue
              // jedes einzelne Wort muss zu mindestens 70 % (kurze Wörter zu 80 %) sichtbar bleiben
              let wortOk = true
              for (const w of r.words || []) {
                if (coverage(pl, p, g, [30 + w[0], y + w[1], w[2], w[3]], 8) > (w[4].replace(/[^\p{L}]/gu, '').length <= 3 ? 0.2 : 0.3)) { wortOk = false; break }
                // kein einzelner Buchstabe darf stark verdeckt sein (sonst liest sich „Zuhause“ als „uhause“)
                for (const c of w[5] || []) if (/\p{L}/u.test(c[4]) && coverage(pl, p, g, [30 + c[0], y + c[1], c[2], c[3]], 4) > 0.45) { wortOk = false; break }
                if (!wortOk) break
              }
              if (!wortOk) continue
              const score = -Math.abs(avg - 0.1) * 40 - (zoom - 1) * 25 - Math.abs(ax - 0.5) * 10 - y * 0.004
              if (!best || score > best.score) best = { pl, y, score }
            }
          }
      if (!best) continue
      const { pl, y } = best
      let body = bandShade(PH - 420, PH, 0.42)
      body += `<div class="abs hd behind" style="left:50px;top:${y}px;width:980px;font-size:${size}px;text-align:center;line-height:.88;color:#fff;text-shadow:none">${html}</div>`
      body += personLayer(p, pl, outline)
      if (sub) body += `<div class="hand" style="left:${W / 2 - 320}px;top:${PH - 190 - sub}px;width:640px;text-align:center;font-size:64px;line-height:1.02;transform:rotate(-2deg)">${esc(spec.sub)}</div>`
      return { html: pageHtml(body + logo(PH), PH, photoLayer(p, pl, 0.24)), crop: { pl } }
    }
    return null
  }

  // ---------- Vorlage: Chat ----------
  async function message(spec, p, { PH = 1350, lo: LO, hi: HI } = {}) {
    const { a, b } = teile(spec.head)
    const texts = b ? [a, b] : [a]
    for (const size of [72, 64, 58, 52, 46]) {
      const hs = []
      for (const t of texts) hs.push(await meas(esc(t), 900 - 88, 'tx', size, 'position:static;line-height:1.14;font-weight:500') + 64)
      const typing = 96
      const need = hs.reduce((s, h) => s + h + 22, 0) + typing + 22 + 44
      const crop = pickCrop(p, need, { PH, lo: LO ?? 90, hi: HI ?? PH - 220, prefer: 'bottom' })
      if (!crop) continue
      let y = crop.top ? crop.band[0] : crop.band[1] - need
      const y0 = y
      let body = bandShade(y0, y0 + need, 0.38)
      texts.forEach((t, i) => {
        const pink = i === texts.length - 1 && texts.length > 1
        body += `<div class="abs bubble" style="left:${pink ? 120 : 60}px;top:${y}px;width:auto;max-width:900px;font-size:${size}px;background:${pink ? Y.PINK : '#fff'};color:#1c1c1c;line-height:1.14;letter-spacing:-.02em;padding:30px 44px;border-radius:64px;border-bottom-${pink ? 'right' : 'left'}-radius:18px">${esc(t)}</div>`
        y += hs[i] + 22
      })
      body += `<div class="abs bubble" style="left:${texts.length > 1 ? 60 : 60}px;top:${y}px;width:auto;height:${typing}px;padding:0 44px;border-radius:64px;border-bottom-left-radius:18px;background:#fff;display:flex;align-items:center;gap:14px">${'<i style="display:block;width:22px;height:22px;border-radius:50%;background:#b9b9bf"></i>'.repeat(3)}</div>`
      return { html: pageHtml(body + logo(PH), PH, `<div class="photo" style="background-image:url('${fotoUrl(p)}');background-size:${crop.pl.dw}px ${crop.pl.dh}px;background-position:${crop.pl.x}px ${crop.pl.y}px;filter:${GRADE}"></div><div class="shade" style="background:rgba(12,14,12,.2)"></div>`), crop }
    }
    return null
  }

  // ---------- Vorlage: markierter Text ----------
  async function markiert(spec, p, { PH = 1350, lo: LO, hi: HI } = {}) {
    const { a, b } = teile(spec.head)
    const inner = `${esc(a)}${b ? ` <mark style="background:${Y.BUTTER};color:#1c1c1c;padding:0 8px;border-radius:6px;-webkit-box-decoration-break:clone;box-decoration-break:clone">${esc(b)}</mark>` : ''}`
    for (const size of [112, 100, 90, 80, 72, 64]) {
      const h = await meas(inner, 960, 'tx', size, 'position:static;font-weight:600;letter-spacing:-.035em;line-height:1.12')
      const sub = spec.sub ? await meas(esc(spec.sub), 700, 'hand', 66, 'position:static;line-height:1.02') + 30 : 0
      const need = h + 84 + sub
      const crop = pickCrop(p, need, { PH, lo: LO ?? 80, hi: HI ?? PH - 210, prefer: 'top' })
      if (!crop) continue
      const y = crop.top ? crop.band[0] : crop.band[1] - need
      let body = bandShade(y, y + need, 0.4)
      // Keine iOS-Menüleiste mehr („Kopieren / Alles auswählen / Nachschlagen“), Nina 14.10.2026
      body += `<div class="abs tx" style="left:60px;top:${y + 84}px;width:960px;font-size:${size}px;font-weight:600;letter-spacing:-.035em;line-height:1.12;color:#fff">${inner}</div>`
      if (sub) body += `<div class="hand" style="left:64px;top:${y + 84 + h + 26}px;width:700px;font-size:66px;line-height:1.02;transform:rotate(-2deg)">${esc(spec.sub)}</div>`
      return { html: pageHtml(body + logo(PH), PH, `<div class="photo" style="background-image:url('${fotoUrl(p)}');background-size:${crop.pl.dw}px ${crop.pl.dh}px;background-position:${crop.pl.x}px ${crop.pl.y}px;filter:${GRADE}"></div><div class="shade" style="background:rgba(12,14,12,.22)"></div>`), crop }
    }
    return null
  }

  // ---------- Vorlage: eingekreistes Kernwort ----------
  async function kreis(spec, p, { PH = 1350, lo: LO, hi: HI } = {}) {
    const { a, b, mehrTeile } = teile(spec.head)
    if (!b) return null
    const html = headHtml(a, b, '#fff', '#fff', mehrTeile)
    for (const size of [172, 152, 134, 118, 104, 92]) {
      const r = await rects(html, 960, 'hd', size, 'color:#fff;line-height:.88')
      if (!r.span || r.span.length !== 1) continue
      const sub = spec.sub ? await meas(esc(spec.sub), 640, 'hand', 66, 'position:static;line-height:1.02') + 30 : 0
      const need = r.h + sub + 60
      const crop = pickCrop(p, need, { PH, lo: LO ?? 90, hi: HI ?? PH - 210, prefer: 'top' })
      if (!crop) continue
      const y = (crop.top ? crop.band[0] : crop.band[1] - need) + 20
      const s0 = r.span[0], s1 = r.span[r.span.length - 1]
      const x0 = 60 + Math.min(s0[0], s1[0]) - 30, x1 = 60 + Math.max(s0[0] + s0[2], s1[0] + s1[2]) + 30
      const y0 = y + s0[1] - 10, y1 = y + s1[1] + s1[3] + 4
      const cw = x1 - x0, ch = y1 - y0
      // handgezeichnete, leicht offene Ellipse in Rosa
      const ell = `<svg class="abs" style="left:${x0 - 30}px;top:${y0 - 30}px;width:${cw + 60}px;height:${ch + 60}px;overflow:visible;filter:drop-shadow(0 2px 8px rgba(0,0,0,.4))" viewBox="0 0 ${cw + 60} ${ch + 60}" fill="none" stroke="${Y.PINK}" stroke-width="10" stroke-linecap="round"><path d="M${cw * 0.12 + 30} ${ch * 0.18 + 30} C ${cw * 0.35 + 30} -${6} , ${cw * 0.92 + 30} ${ch * 0.02 + 30} , ${cw * 0.98 + 30} ${ch * 0.5 + 30} C ${cw * 1.02 + 30} ${ch * 1.02 + 30} , ${cw * 0.3 + 30} ${ch * 1.1 + 30} , ${cw * 0.05 + 30} ${ch * 0.7 + 30} C ${-cw * 0.02 + 30} ${ch * 0.4 + 30} , ${cw * 0.1 + 30} ${ch * 0.2 + 30} , ${cw * 0.3 + 30} ${ch * 0.1 + 30}"/></svg>`
      let body = bandShade(y, y + need, 0.36)
      body += `<div class="abs hd" style="left:60px;top:${y}px;width:960px;font-size:${size}px;color:#fff;line-height:.88">${html}</div>${ell}`
      if (sub) body += `<div class="hand" style="left:64px;top:${y + r.h + 40}px;width:640px;font-size:66px;line-height:1.02;transform:rotate(-2deg)">${esc(spec.sub)}</div>`
      body += Y.arrow(560, y + r.h + 20, { w: 170, rot: 8 })
      return { html: pageHtml(body + logo(PH), PH, `<div class="photo" style="background-image:url('${fotoUrl(p)}');background-size:${crop.pl.dw}px ${crop.pl.dh}px;background-position:${crop.pl.x}px ${crop.pl.y}px;filter:${GRADE}"></div><div class="shade" style="background:rgba(12,14,12,.2)"></div>`), crop }
    }
    return null
  }

  // ---------- Vorlage: gestapeltes Echo-Wort ----------
  async function stapel(spec, p, { PH = 1350, lo: LO, hi: HI } = {}) {
    const { a, b, mehrTeile } = teile(spec.head)
    const wort = schluesselwort(b || a).toUpperCase()
    if (!wort || wort.length > 11) return null
    const full = `${esc(a)}${b ? ' ' + `<span style="color:${Y.PINK}">${esc(b)}</span>` : ''}`
    for (const es of [250, 210, 180, 150]) {
      const ew = await meas(esc(wort), 1400, 'hd', es, 'position:static;display:inline-block;white-space:nowrap')
      const wr = await rects(esc(wort), 2000, 'hd', es, 'white-space:nowrap')
      const width = wr.lines[0] ? wr.lines[0][2] : 9999
      if (width > 980) continue
      for (const hs of [84, 74, 66, 58]) {
        const h = await meas(full, 960, 'hd', hs, 'position:static;line-height:.95;letter-spacing:-.03em')
        const echoH = es * 0.8 * 2 + es * 0.9
        const need = echoH + 30 + h
        const crop = pickCrop(p, need, { PH, lo: LO ?? 80, hi: HI ?? PH - 210, prefer: 'top' })
        if (!crop) continue
        const y = crop.top ? crop.band[0] : crop.band[1] - need
        let body = bandShade(y, y + need, 0.34)
        ;[0, 1, 2].forEach((i) => {
          const st = i === 2 ? `color:#fff` : `color:transparent;-webkit-text-stroke:5px rgba(255,255,255,${i === 0 ? 0.35 : 0.65})`
          body += `<div class="abs hd" style="left:56px;top:${y + i * es * 0.8}px;width:1000px;font-size:${es}px;line-height:.9;white-space:nowrap;${st};text-shadow:none">${esc(wort)}</div>`
        })
        body += `<div class="abs hd" style="left:60px;top:${y + echoH + 30}px;width:960px;font-size:${hs}px;line-height:.95;letter-spacing:-.03em;color:#fff">${full}</div>`
        return { html: pageHtml(body + logo(PH), PH, `<div class="photo" style="background-image:url('${fotoUrl(p)}');background-size:${crop.pl.dw}px ${crop.pl.dh}px;background-position:${crop.pl.x}px ${crop.pl.y}px;filter:${GRADE}"></div><div class="shade" style="background:rgba(12,14,12,.22)"></div>`), crop }
      }
    }
    return null
  }

  return { behind, message, markiert, kreis, stapel, render }
}

export const VORLAGEN = ['behind-rand', 'message', 'kreis', 'markiert', 'stapel', 'behind']
/** Reihenfolge der Vorlagen für einen Beitrag: rotiert nach Nummer, damit nie zwei gleiche hintereinander laufen. */
export function vorlagenFuer(nr) {
  const start = (nr - 1) % VORLAGEN.length
  return [...VORLAGEN.slice(start), ...VORLAGEN.slice(0, start)]
}

/** Probiert Vorlagen × Fotos durch, bis eine ohne Gesichtsverletzung rendert. Gibt {foto, vorlage} oder null. */
export async function viralCover(V, spec, cands, file, { PH = 1350, nr = 1, lo, hi, nachher = (h) => h } = {}) {
  for (const p of cands) {
    for (const v of vorlagenFuer(nr)) {
      const vr = await V[v === 'behind-rand' ? 'behind' : v](spec, p, { PH, lo, hi, outline: v === 'behind-rand' })
      if (!vr) continue
      const pr = await V.render(nachher(vr.html), file, PH)
      if (!pr.length) return { foto: p.id, vorlage: v }
    }
  }
  return null
}
