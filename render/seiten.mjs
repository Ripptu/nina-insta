// Innenseiten ohne Foto: Farbfläche, riesige enge Schrift, Markierung, Chat-Blasen, handgezeichnete Deko.
// Fotos von Nina gibt es nur auf dem Cover (Regel von Christian, 29.09.2026).
import * as Y from './typo.mjs'
import { DEKO, dekoFuer } from './deko.mjs'

const HERE = new URL('.', import.meta.url).pathname
const INK = '#2a1710'
export const PALETTEN = {
  braun: { bg: '#33402f', h: Y.BUTTER, t: '#fff', acc: Y.PINK, mark: Y.BUTTER, markT: '#1c1c1c', dek: Y.PINK, logo: 'logo-creme.png', b1: '#fff', b1t: '#1c1c1c', b2: Y.PINK, b2t: '#1c1c1c' },
  rosa: { bg: Y.PINK, h: INK, t: INK, acc: '#fff', mark: '#fff', markT: INK, dek: INK, logo: 'logo-ink.png', b1: '#fff', b1t: '#1c1c1c', b2: INK, b2t: '#fff' },
  butter: { bg: Y.BUTTER, h: INK, t: INK, acc: Y.PINK, mark: Y.PINK, markT: INK, dek: INK, logo: 'logo-ink.png', b1: '#fff', b1t: '#1c1c1c', b2: Y.PINK, b2t: '#1c1c1c' },
  creme: { bg: '#f6efe6', h: INK, t: INK, acc: Y.PINK, mark: Y.BUTTER, markT: INK, dek: '#c2559a', logo: 'logo-ink.png', b1: '#fff', b1t: '#1c1c1c', b2: Y.BUTTER, b2t: '#1c1c1c' },
}
// Paare je Beitrag, damit die Seiten wechseln und Beiträge sich unterscheiden.
const PAARE = [['creme', 'rosa'], ['butter', 'rosa'], ['rosa', 'creme'], ['rosa', 'butter'], ['creme', 'butter'], ['butter', 'creme']]
export const paletteFor = (nr, seite) => PALETTEN[PAARE[(nr - 1) % PAARE.length][(seite - 1) % 2]]

const sentences = (t) => t.match(/[^.!?]+[.!?]+["“”]*\s*|[^.!?]+$/g)?.map((s) => s.trim()) ?? [t]
const esc = Y.esc
const W = 1080

export function createSeiten(eng) {
  const { meas, pageHtml, CSS } = eng._i

  const logoImg = (P, PH) => `<img class="logo" src="file://${HERE}../assets/${P.logo}" style="width:150px;left:44px;top:${PH - 190}px;opacity:.95">`
  const bg = (P) => `<div class="shade" style="background:${P.bg}"></div>`
  const deko = (name, P, w, x, y, rot = 0, sw = 5) => `<div class="abs" style="left:${x}px;top:${y}px;width:${w}px">${DEKO[name]({ color: P.dek, w, sw, rot })}</div>`

  /** Platziert eine passende Zeichnung im freien Raum um den Textblock. */
  function dekoPlatz(text, P, PH, y, need, lo, hi, index) {
    const name = dekoFuer(text, index)
    const frei = hi - (y + need)
    const proben = { welle: [340, 120], zickzack: [340, 60], pfeil: [190, 100], kringel: [190, 70], zweiKreise: [300, 185], haus: [240, 220], weg: [220, 240], sprechblase: [260, 215], herz: [240, 215], funke: [220, 220], stern: [220, 220], kreis: [220, 220], sonne: [230, 230] }
    const [dw, dh] = proben[name]
    const rot = [-6, 5, -3, 7][index % 4]
    if (frei >= dh + 50) return deko(name, P, dw, W - 60 - dw - (index % 2) * 40, y + need + (frei - dh) / 2 + 10, rot)
    if (y - lo >= dh + 30) return deko(name, P, Math.min(dw, 200), W - 60 - Math.min(dw, 200), lo + 8, rot)
    return ''
  }

  async function seite(spec, { PH = 1350, palette, index = 1, nr = 1, lo = 130, hi } = {}) {
    hi = hi ?? PH - 230
    const P = palette
    const raw = spec.text.replace(/\s+/g, ' ').trim()
    const role = spec.role || 'text'
    if (role === 'quote') return zitat(raw, P, PH, lo, hi, index)
    // Gegenüberstellung „Du sagst … / Manchmal meinst du …“ als Chat
    const m = raw.match(/^((?:Du sagst|Vorher)[^]*?)\s+((?:Manchmal meinst du|Nachher)[^]*)$/)
    if (m) return chat(m[1], m[2], P, PH, lo, hi)
    return text(raw, P, PH, lo, hi, index, role === 'close' || role === 'buch')
  }

  async function text(raw, P, PH, lo, hi, index, cta) {
    let t = raw, pill = ''
    if (cta) { const c = t.match(/\s*Link in der Bio\.?/i); if (c) { t = t.replace(c[0], '').trim(); pill = 'Link in der Bio' } }
    const ss = sentences(t)
    const head = ss[0], rest = ss.slice(1).join(' ')
    const markiert = index % 3 === 2 && !cta
    // Erst mit Platz für eine Zeichnung (Text höchstens 70 % der Fläche), erst dann ohne
    const kombis = []
    for (const anteil of [0.7, 1]) for (const hs of [...(PH > 1500 ? [150, 136, 122, 112] : []), 104, 94, 84, 76, 68, 62, 56, 52, 48]) kombis.push([hs, anteil])
    for (const [hs, anteil] of kombis) {
      const bs = Math.round(hs * 0.7)
      const tip = markiert ? 88 : 0
      const h1 = await meas(esc(head), 960, 'hd', hs, `line-height:1.0;letter-spacing:-.04em;color:${P.h}`)
      const h2 = rest ? await meas(esc(rest), 960, 'tx', bs, `color:${P.t}`) : 0
      const need = tip + h1 + (rest ? h2 + 44 : 0) + (pill ? 130 : 0)
      if (need > (hi - lo) * anteil) continue
      const y = lo + Math.max(0, (hi - lo - need) * (PH > 1500 ? 0.4 : anteil < 1 ? 0.18 : 0.28))
      let yy = y
      let body = ''
      if (markiert) {
        body += `<div class="abs" style="left:60px;top:${yy}px;background:#fff;color:#1c1c1c;font-size:26px;font-weight:500;border-radius:16px;padding:12px 24px;box-shadow:0 3px 14px rgba(0,0,0,.25);white-space:nowrap">Kopieren&nbsp;&nbsp;&nbsp;Alles auswählen&nbsp;&nbsp;&nbsp;Nachschlagen &rsaquo;</div>`
        yy += tip
        body += `<div class="abs hd" style="left:60px;top:${yy}px;width:960px;font-size:${hs}px;line-height:1.0;letter-spacing:-.04em;color:${P.h};text-shadow:none"><mark style="background:${P.mark};color:${P.markT};padding:0 10px;border-radius:8px;-webkit-box-decoration-break:clone;box-decoration-break:clone">${esc(head)}</mark></div>`
      } else {
        body += `<div class="abs hd" style="left:60px;top:${yy}px;width:960px;font-size:${hs}px;line-height:1.0;letter-spacing:-.04em;color:${P.h};text-shadow:none">${esc(head)}</div>`
      }
      yy += h1 + 44
      if (rest) { body += `<div class="abs tx" style="left:60px;top:${yy}px;width:960px;font-size:${bs}px;color:${P.t};text-shadow:none">${esc(rest)}</div>`; yy += h2 + 40 }
      if (pill) body += `<div class="abs cta" style="left:60px;top:${yy}px;font-size:50px;padding:18px 44px;${P.bg === Y.BROWN ? '' : `background:${INK};color:#fff`}">${pill}</div>`
      body += dekoPlatz(raw, P, PH, y, need, lo, hi, index)
      return { html: pageHtml(body + logoImg(P, PH), PH, bg(P)) }
    }
    return null
  }

  async function zitat(raw, P, PH, lo, hi, index) {
    const q = raw.replace(/^[„“"]|[“”"]$/g, '')
    for (const hs of [128, 116, 104, 92, 82, 72, 64]) {
      const h = await meas(esc(q), 900, 'hd', hs, `line-height:.98;letter-spacing:-.04em`)
      const need = h + 300
      if (need > hi - lo) continue
      const y = lo + Math.max(0, (hi - lo - need) * 0.4)
      let body = `<div class="abs hd" style="left:52px;top:${y - 60}px;font-size:360px;line-height:1;color:${P.acc};text-shadow:none;letter-spacing:0">„</div>`
      body += `<div class="abs hd" style="left:60px;top:${y + 250}px;width:940px;font-size:${hs}px;line-height:.98;letter-spacing:-.04em;color:${P.h};text-shadow:none">${esc(q)}</div>`
      body += deko('kringel', P, 190, W - 250, y + 250 + h + 30, -4)
      return { html: pageHtml(body + logoImg(P, PH), PH, bg(P)) }
    }
    return null
  }

  async function chat(a, b, P, PH, lo, hi) {
    for (const size of [64, 58, 52, 48, 44]) {
      const ha = await meas(esc(a), 860 - 96, 'tx', size, 'line-height:1.14;font-weight:500') + 64
      const hb = await meas(esc(b), 860 - 96, 'tx', size, 'line-height:1.14;font-weight:500') + 64
      const need = ha + hb + 70
      if (need > hi - lo) continue
      const y = lo + Math.max(0, (hi - lo - need) * 0.3)
      let body = `<div class="abs bubble" style="left:60px;top:${y}px;width:860px;font-size:${size}px;background:${P.b1};color:${P.b1t};line-height:1.14;letter-spacing:-.02em;padding:32px 48px;border-radius:64px;border-bottom-left-radius:18px;box-shadow:0 6px 24px rgba(0,0,0,.15)">${esc(a)}</div>`
      body += `<div class="abs bubble" style="left:160px;top:${y + ha + 36}px;width:860px;font-size:${size}px;background:${P.b2};color:${P.b2t};line-height:1.14;letter-spacing:-.02em;padding:32px 48px;border-radius:64px;border-bottom-right-radius:18px;box-shadow:0 6px 24px rgba(0,0,0,.15)">${esc(b)}</div>`
      const rest = hi - (y + need)
      if (rest > 240) body += deko('funke', P, 200, W - 280, y + need + (rest - 200) / 2, 8, 5)
      return { html: pageHtml(body + logoImg(P, PH), PH, bg(P)) }
    }
    return null
  }

  return { seite }
}
