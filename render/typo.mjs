// Stil „Foto-Typo“ (Referenz docs/referenz/stil-typo-raster.webp): Vollbild-Foto, riesige enge Schrift in Butter und Rosa,
// kleine Handschrift-Notizen, iMessage-Blasen, Markierung wie im iOS-Text, Pillen mit Fakten.
import fs from 'node:fs'

export const BUTTER = '#fff0a6'
export const PINK = '#ffc4e4'
export const WHITE = '#ffffff'
export const BROWN = '#2a1710'

const fontCss = fs.readFileSync(new URL('./fonts/all.css', import.meta.url), 'utf8')
const ASSETS = new URL('../assets/', import.meta.url).pathname

const CSS = `
${fontCss}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1080px}
.page{position:relative;width:1080px;height:1350px;overflow:hidden;background:${BROWN};font-family:'Inter Tight',sans-serif;color:${WHITE}}
.photo{position:absolute;inset:0;background-size:cover;background-repeat:no-repeat}
.shade{position:absolute;inset:0}
.abs{position:absolute}
.big{position:absolute;font-weight:700;letter-spacing:-.045em;line-height:.86;text-shadow:0 2px 24px rgba(0,0,0,.28)}
.hand{position:absolute;font-family:'Reenie Beanie';line-height:1;color:${WHITE};text-shadow:0 1px 10px rgba(0,0,0,.4)}
.script{position:absolute;font-family:'Mrs Saint Delafield';line-height:.9;color:#fff;text-shadow:0 1px 12px rgba(0,0,0,.45)}
.pill{position:absolute;background:#fff;color:#1c1c1c;font-weight:500;font-size:34px;letter-spacing:-.01em;padding:10px 24px;border-radius:40px;box-shadow:0 3px 10px rgba(0,0,0,.16);white-space:nowrap}
.bubble{position:absolute;padding:26px 34px;border-radius:44px;font-weight:500;font-size:42px;line-height:1.14;letter-spacing:-.02em;box-shadow:0 4px 16px rgba(0,0,0,.18)}
.sel{position:absolute;font-weight:500;letter-spacing:-.03em;line-height:1.14;color:#fff}
.sel mark{background:${BUTTER};color:#1c1c1c;padding:0 4px;border-radius:3px}
.logo{position:absolute;opacity:.92}
`

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')

/** grade: Farbstimmung des Fotos. dark = Stärke der Abdunklung (0 bis .7). */
export function photoPage(body, { photo, pos = 'center', size = 'cover', dark = 0.32, grade = 'saturate(.86) contrast(1.06) brightness(.9)', top = 0, bottom = 0.45, logo = true } = {}) {
  const bg = photo
    ? `<div class="photo" style="background-image:url('file://${photo}');background-size:${size};background-position:${pos};filter:${grade}"></div>
       <div class="shade" style="background:linear-gradient(rgba(20,10,5,${dark + top}) 0%,rgba(20,10,5,${dark}) 45%,rgba(20,10,5,${dark + bottom}) 100%)"></div>`
    : ''
  const lg = logo ? `<img class="logo" src="file://${ASSETS}logo-creme.png" style="width:150px;left:44px;bottom:38px">` : ''
  return `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body><div class="page">${bg}${body}${lg}</div></body></html>`
}

/** Große enge Textzeile. */
export function big(text, { x = 50, y = 100, size = 150, color = BUTTER, align = 'left', width = 980, rot = 0, weight = 700 } = {}) {
  const ax = align === 'right' ? `right:${1080 - x - width}px` : align === 'center' ? `left:${x}px` : `left:${x}px`
  return `<div class="big" style="${ax};top:${y}px;width:${width}px;font-size:${size}px;color:${color};text-align:${align};transform:rotate(${rot}deg);font-weight:${weight}">${text}</div>`
}

/** Handschrift-Notiz. */
export function hand(text, { x = 60, y = 100, size = 50, rot = -6, color = WHITE, width = 400 } = {}) {
  return `<div class="hand" style="left:${x}px;top:${y}px;font-size:${size}px;transform:rotate(${rot}deg);color:${color};width:${width}px">${esc(text)}</div>`
}

export function pill(text, { x, y }) {
  return `<div class="pill" style="left:${x}px;top:${y}px">${esc(text)}</div>`
}

/** iMessage-Blase. side: 'in' (weiß, links) oder 'out' (rosa, links auch, wie in der Referenz). */
export function bubble(text, { x, y, width = 520, kind = 'pink' } = {}) {
  const bg = kind === 'pink' ? '#ffc4e4' : '#ffffff'
  return `<div class="bubble" style="left:${x}px;top:${y}px;width:${width}px;background:${bg};color:#1c1c1c">${esc(text)}</div>`
}

/** Markierter Text wie im iOS-Textfeld mit „Kopieren / Alles auswählen“ darüber. */
export function selection(html, { x = 60, y = 500, size = 60, width = 900, tooltip = true } = {}) {
  const tip = tooltip
    ? `<div class="abs" style="left:${x}px;top:${y - 70}px;background:#fff;color:#1c1c1c;font-size:24px;font-weight:500;border-radius:14px;padding:12px 22px;box-shadow:0 3px 12px rgba(0,0,0,.25);white-space:nowrap">Kopieren&nbsp;&nbsp;&nbsp;Alles auswählen&nbsp;&nbsp;&nbsp;Nachschlagen &rsaquo;</div>`
    : ''
  return `${tip}<div class="sel" style="left:${x}px;top:${y}px;width:${width}px;font-size:${size}px">${html}</div>`
}

export const hl = (t) => `<mark>${esc(t)}</mark>`

/** Cover: Wörter gestapelt, jedes mit eigener Farbe, dazu Notizen. */
export function cover({ photo, pos, lines, notes = [], pills = [], dark }) {
  const body = lines.map((l) => big(l.t, l)).join('') + notes.map((n) => hand(n.t, n)).join('') + pills.map((p) => pill(p.t, p)).join('')
  return photoPage(body, { photo, pos, dark })
}

/** Textseite auf dunklem Braun oder Foto: Fließtext mit markierter Kernstelle. */
export function textDark({ photo, pos, dark = 0.55, html, size = 66, y = 360, tooltip = true, note, noteAt }) {
  const body = selection(html, { x: 60, y, size, width: 960, tooltip }) + (note ? hand(note, { ...noteAt, size: 56 }) : '')
  return photoPage(body, { photo, pos, dark })
}

/** Dünne Schreibschrift-Notiz wie in der zweiten Referenz. */
export function script(text, { x = 60, y = 100, size = 96, rot = -4, width = 600, color = '#fff' } = {}) {
  return `<div class="script" style="left:${x}px;top:${y}px;font-size:${size}px;transform:rotate(${rot}deg);width:${width}px;color:${color}">${esc(text)}</div>`
}

/** Handgezeichneter Pfeil (Schwung), rot dreht die Richtung. */
export function arrow(x, y, { w = 170, rot = 0, flip = false, color = '#fff' } = {}) {
  return `<svg class="abs" style="left:${x}px;top:${y}px;width:${w}px;transform:rotate(${rot}deg) scaleX(${flip ? -1 : 1});filter:drop-shadow(0 1px 6px rgba(0,0,0,.4))" viewBox="0 0 170 90" fill="none" stroke="${color}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 70 C 30 8, 100 4, 150 44"/><path d="M128 28 L152 46 L122 58"/></svg>`
}

/** Kringel/Schleife als Zierlinie. */
export function curl(x, y, { w = 160, rot = 0, color = '#fff' } = {}) {
  return `<svg class="abs" style="left:${x}px;top:${y}px;width:${w}px;transform:rotate(${rot}deg);filter:drop-shadow(0 1px 6px rgba(0,0,0,.4))" viewBox="0 0 160 60" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round"><path d="M4 40 C 30 4, 60 4, 50 30 C 44 50, 20 40, 40 22 C 70 -4, 110 20, 156 14"/></svg>`
}

/** Wort mehrfach untereinander mit Versatz, wie „VLOG“ in der Referenz. */
export function echo(text, { x = 50, y = 100, size = 200, n = 3, step = 0.7, color = '#fff', width = 980 } = {}) {
  return Array.from({ length: n }, (_, i) => big(text, { x, y: y + i * size * step, size, color, width })).join('')
}
