// Innenseiten im Stil Foto-Typo (Referenz: Instagram-Grid mit Vollbild-Fotos, riesiger enger Grotesk, Handschrift,
// Pfeilen, Kringeln, gestapeltem Wort, iMessage-Blasen; Christian 29.09.2026, „sei sehr kreativ“).
// Jede Seite ist ein Foto von Nina (anderer Ausschnitt, anderes Foto je Seite), der Text liegt im freien Band ohne Gesicht.
import * as Y from './typo.mjs'
import { pickCrop } from './engine.mjs'
import { teile } from './viral.mjs'

const esc = Y.esc
const ohneAnf = (t) => t.replace(/[„“”"]/g, '').replace(/\s+/g, ' ').trim()
const W = 1080
const sentences = (t) => t.match(/[^.!?]+[.!?]+["“”]*\s*|[^.!?]+$/g)?.map((s) => s.trim()) ?? [t]
const STOP = new Set('wenn dass damit weil aber oder dann doch wie was wer wo ich du mich dich mir dir nachher vorher manchmal sagst sag nimm nur auch noch schon immer wieder eigentlich vielleicht'.split(' '))
const langesWort = (t) => t.replace(/[.,!?„“"”:;]/g, '').split(/\s+/).slice(1).filter((w) => /^[A-ZÄÖÜ]/.test(w) && w.length >= 4 && !w.includes('-') && !STOP.has(w.toLowerCase())).sort((a, b) => b.length - a.length)[0] || ''
export const VARIANTEN = ['gross', 'stapel', 'markiert', 'hand', 'blase']

export function createInnen(eng) {
  const { meas, rects, pageHtml, bgFull, bandShade, logo } = eng._i

  const finish = (p, crop, body, y, need, PH, dark = 0.1, a = 0.34) => ({
    html: pageHtml(bandShade(y - 10, y + need + 10, a) + body + logo(PH), PH, bgFull(p, crop, PH, dark)), crop,
  })
  const ort = (crop, need) => (crop.top ? crop.band[0] : crop.band[1] - need)
  const pick = (p, need, PH, lo, hi, prefer = 'any') => pickCrop(p, need, { PW: W, PH, lo, hi, prefer })
  const kringel = (x, y, w, farbe = Y.PINK, rot = -3) => Y.curl(x, y, { w, rot, color: farbe })

  /** Riesige Überschrift (letzter Teil in Butter), darunter der Rest, Kringel als Zierde. */
  async function gross(spec, p, { PH, lo, hi }) {
    const ss = sentences(spec.text), head = ohneAnf(ss[0]), rest = ss.slice(1).join(' ')
    const { a, b } = teile(head)
    const hh = `${esc(a)}${b ? ` <span style="color:${Y.BUTTER}">${esc(b)}</span>` : ''}`
    for (const size of [150, 132, 116, 104, 94, 84, 76]) {
      const hH = await meas(hh, 960, 'hd', size, 'color:#fff')
      const bs = Math.round(Math.max(38, Math.min(52, size * 0.4)))
      const rH = rest ? await meas(esc(rest), 900, 'tx', bs, 'color:#fff') : 0
      const need = hH + (rest ? rH + 34 : 0)
      const crop = pick(p, need, PH, lo, hi)
      if (!crop) continue
      const y = ort(crop, need)
      let body = `<div class="abs hd" style="left:60px;top:${y}px;width:960px;font-size:${size}px;color:#fff">${hh}</div>`
      if (rest) body += `<div class="abs tx" style="left:60px;top:${y + hH + 34}px;width:900px;font-size:${bs}px;color:#fff">${esc(rest)}</div>`
      if (y + need + 80 < hi) body += kringel(W - 300, y + need + 10, 220, Y.PINK, -4)
      return finish(p, crop, body, y, need, PH)
    }
    return null
  }

  /** Kernwort dreifach gestapelt (zwei Umrisse, ein volles Wort), darunter die Aussage. */
  async function stapel(spec, p, { PH, lo, hi }) {
    const ss = sentences(spec.text), head = ohneAnf(ss[0])
    const w = langesWort(head).toUpperCase()
    if (!w || w.length > 11) return null
    const rest = ss.slice(1).join(' ')
    for (const size of [220, 190, 165, 140, 120]) {
      const r = await rects(esc(w), 4000, 'hd', size, 'color:#fff;white-space:nowrap;display:inline-block')
      const wordW = r.lines[0]?.[2] ?? 9999
      if (wordW > 960) continue
      const rowH = size * 0.74
      const hs = 70
      const hH = await meas(esc(head), 960, 'hd', hs, 'color:#fff')
      const need = rowH * 2 + size * 0.92 + 28 + hH
      const crop = pick(p, need, PH, lo, hi)
      if (!crop) continue
      const y = ort(crop, need)
      const row = (i, solid) => `<div class="big" style="left:60px;top:${y + i * rowH}px;font-size:${size}px;white-space:nowrap;${solid ? 'color:#fff' : 'color:transparent;-webkit-text-stroke:3px #fff;text-shadow:none'}">${esc(w)}</div>`
      let body = row(0, false) + row(1, false) + row(2, true)
      body += `<div class="abs hd" style="left:60px;top:${y + rowH * 2 + size * 0.92 + 28}px;width:960px;font-size:${hs}px;color:${Y.BUTTER}">${esc(head)}</div>`
      return finish(p, crop, body, y, need, PH, 0.12, 0.3)
    }
    return null
  }

  /** Aussage als markierter Text im iOS-Textfeld mit „Kopieren / Alles auswählen“. */
  async function markiert(spec, p, { PH, lo, hi }) {
    const ss = sentences(spec.text), head = ss[0], rest = ss.slice(1).join(' ')
    for (const size of [72, 66, 60, 54, 50]) {
      const html = `${Y.hl(head)}${rest ? ' ' + esc(rest) : ''}`
      const h = await meas(html, 960, 'sel', size, 'position:static') + 14
      const need = h + 84
      const crop = pick(p, need, PH, lo, hi)
      if (!crop) continue
      const y = ort(crop, need)
      return finish(p, crop, Y.selection(html, { x: 60, y: y + 84, size, width: 960, tooltip: true }), y, need, PH, 0.12, 0.34)
    }
    return null
  }

  /** Überschrift plus handgeschriebene Randnotiz mit Pfeil (Caveat, gut lesbar). */
  async function hand(spec, p, { PH, lo, hi }) {
    const ss = sentences(spec.text), head = ohneAnf(ss[0])
    const note = ss.slice(1).join(' ')
    if (!note || note.length > 110) return null
    for (const size of [104, 94, 84, 76]) {
      const hH = await meas(esc(head), 960, 'hd', size, 'color:#fff')
      const nS = size > 90 ? 76 : 68
      const nH = await meas(esc(note), 760, 'hand', nS, 'position:static;line-height:1.02')
      const need = hH + 40 + nH
      const crop = pick(p, need, PH, lo, hi)
      if (!crop) continue
      const y = ort(crop, need)
      let body = `<div class="abs hd" style="left:60px;top:${y}px;width:960px;font-size:${size}px;color:#fff">${esc(head)}</div>`
      body += `<div class="hand" style="left:150px;top:${y + hH + 40}px;width:760px;font-size:${nS}px;line-height:1.02;transform:rotate(-2deg);color:${Y.BUTTER}">${esc(note)}</div>`
      body += Y.arrow(50, y + hH + 22, { w: 110, rot: 70, color: Y.BUTTER })
      return finish(p, crop, body, y, need, PH)
    }
    return null
  }

  /** Aussage und Fortsetzung als iMessage-Blasen. */
  async function blase(spec, p, { PH, lo, hi }) {
    let a, b
    const m = spec.text.match(/^((?:Du sagst|Vorher)[^]*?)\s+((?:Manchmal meinst du|Nachher)[^]*)$/)
    if (m) { a = m[1]; b = m[2] } else { const ss = sentences(spec.text); a = ss[0]; b = ss.slice(1).join(' ') }
    if (!b) return null
    for (const size of [56, 52, 48, 44, 40]) {
      const st = `font-weight:500;line-height:1.14;letter-spacing:-.02em`
      const ha = (await meas(esc(a), 792, 'tx', size, st)) + 60
      const hb = (await meas(esc(b), 792, 'tx', size, st)) + 60
      const need = ha + hb + 34
      const crop = pick(p, need, PH, lo, hi)
      if (!crop) continue
      const y = ort(crop, need)
      const bub = (t, x, yy, h, bg, left) => `<div class="abs bubble" style="left:${x}px;top:${yy}px;width:860px;height:${h}px;font-size:${size}px;background:${bg};color:#1c1c1c;line-height:1.14;letter-spacing:-.02em;padding:30px 34px;border-radius:52px;${left ? 'border-bottom-left-radius:14px' : 'border-bottom-right-radius:14px'}">${esc(t)}</div>`
      const body = bub(a, 60, y, ha, '#fff', true) + bub(b, 160, y + ha + 34, hb, Y.PINK, false)
      return finish(p, crop, body, y, need, PH, 0.1, 0.16)
    }
    return null
  }

  const FN = { gross, stapel, markiert, hand, blase }
  /** Variante wechselt je Beitrag und Seite; ist sie für den Text ungeeignet, kommt „gross“. */
  async function seite(spec, p, opts) {
    const reihe = [opts.variante, 'gross'].filter((v, i, a) => v && a.indexOf(v) === i)
    for (const v of reihe) { const r = await FN[v](spec, p, opts); if (r) return { ...r, variante: v } }
    return null
  }
  return { seite }
}
export const varianteFuer = (nr, i) => VARIANTEN[(nr + i * 2) % VARIANTEN.length]
