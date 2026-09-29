// Vorlagen im Collage-Stil (docs/gestaltung.md). Jede Funktion liefert das HTML einer Seite.
// Farben nur: Salbei, Creme, Hellgrau-Grün. Schrift lokal eingebunden (fonts/).
import fs from 'node:fs'

export const SAGE = '#6d7965'
export const CREME = '#f9f7f4'
export const MIST = '#d7dfde'

const fontCss = fs.readFileSync(new URL('./fonts/fonts.css', import.meta.url), 'utf8')

const CSS = `
${fontCss}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1080px;background:${CREME}}
.page{position:relative;width:1080px;height:var(--h,1350px);overflow:hidden;color:${SAGE};
  background-color:${CREME};
  background-image:linear-gradient(rgba(109,121,101,.13) 1.5px,transparent 1.5px),linear-gradient(90deg,rgba(109,121,101,.13) 1.5px,transparent 1.5px);
  background-size:60px 60px;background-position:30px 20px}
.abs{position:absolute}
.handle{position:absolute;top:34px;left:0;right:0;text-align:center;font:500 26px 'Barlow Condensed';letter-spacing:.06em;opacity:.7}
.script{font-family:'Pinyon Script';font-weight:400;line-height:.9}
.cond{font-family:'Barlow Condensed';font-weight:600;line-height:.98;letter-spacing:-.005em}
.hand{font-family:'Reenie Beanie';font-weight:400;line-height:1}
.blob{position:absolute;background:${SAGE}}
.mistblob{position:absolute;background:${MIST}}
.sticker{position:absolute;filter:drop-shadow(0 6px 10px rgba(0,0,0,.18))}
.tape{position:absolute;width:220px;height:62px;background:${MIST};opacity:.92;box-shadow:0 2px 4px rgba(0,0,0,.12)}
.wordmark{position:absolute;right:52px;bottom:40px;font-size:46px;line-height:1}
`

const ASSETS = new URL('../assets/', import.meta.url).pathname
const doodle = (size = 90, color = SAGE, extra = '') => {
  const st = (extra.match(/style="([^"]*)"/) || [, ''])[1]
  const file = color === CREME ? 'doodle-creme.png' : 'doodle-sage.png'
  return `<img class="abs" src="file://${ASSETS}${file}" style="height:${size * 2.1}px;${st}">`
}

const heart = (size, fill, stroke, rot = 0, style = '') => `
<svg class="sticker" style="width:${size}px;height:${size}px;transform:rotate(${rot}deg);${style}" viewBox="0 0 100 100">
  <path d="M14 16 h72 a10 10 0 0 1 10 10 v40 a10 10 0 0 1 -10 10 h-30 l-16 16 v-16 h-26 a10 10 0 0 1 -10 -10 v-40 a10 10 0 0 1 10 -10 z" fill="${fill}" stroke="${stroke}" stroke-width="3"/>
  <path d="M50 66 C 26 50 30 30 42 30 C 47 30 50 34 50 34 C 50 34 53 30 58 30 C 70 30 74 50 50 66 Z" fill="${stroke}"/>
</svg>`

const question = (size, color, rot = 0, style = '') => `
<svg class="sticker" style="width:${size}px;height:${size}px;transform:rotate(${rot}deg);${style}" viewBox="0 0 100 100">
  <path d="M30 34 C 30 14 70 14 70 36 C 70 52 50 52 50 66" fill="none" stroke="${color}" stroke-width="13" stroke-linecap="round"/>
  <circle cx="50" cy="86" r="8" fill="${color}"/>
</svg>`

const arrow = (w, rot = 0, style = '') => `
<svg class="abs" style="width:${w}px;transform:rotate(${rot}deg);${style}" viewBox="0 0 140 70" fill="none" stroke="${SAGE}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
  <path d="M6 50 C 40 8 90 6 126 34"/><path d="M104 20 L128 36 L100 46"/>
</svg>`

const scribbleCircle = (w, h, style = '') => `
<svg class="abs" style="width:${w}px;height:${h}px;${style}" viewBox="0 0 200 100" fill="none" stroke="${SAGE}" stroke-width="4" stroke-linecap="round">
  <path d="M30 20 C 80 -6 170 8 188 44 C 200 76 120 96 60 88 C 8 80 -6 40 40 18 C 70 6 110 4 150 12"/>
</svg>`

const page = (body, h = 1350) => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head>
<body><div class="page" style="--h:${h}px">${body}<div class="handle">@ninahoemmencoaching</div></div></body></html>`

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
const logo = (color = SAGE, style = 'right:44px;bottom:36px') => `<img class="abs" src="file://${ASSETS}${color === CREME ? 'logo-creme.png' : 'logo-sage.png'}" style="width:250px;${style}">`
const wordmark = logo()
const imgUrl = (p) => `file://${p}`

const sparkle = (size, style = '', color = SAGE) => `
<svg class="abs" style="width:${size}px;height:${size}px;${style}" viewBox="0 0 100 100"><path d="M50 4 C 54 34 66 46 96 50 C 66 54 54 66 50 96 C 46 66 34 54 4 50 C 34 46 46 34 50 4 Z" fill="${color}"/></svg>`

const underline = (w, style = '') => `
<svg class="abs" style="width:${w}px;${style}" viewBox="0 0 300 30" fill="none" stroke="${SAGE}" stroke-width="7" stroke-linecap="round"><path d="M6 20 C 60 6 120 26 180 12 C 220 4 260 16 294 8"/></svg>`

/** Cover mit freigestelltem Foto: Nina groß im Vordergrund, das Schreibschrift-Wort läuft hinter ihr. */
export function coverFoto({ script, headline, subline, foto, hint = 'mehr in der Caption' }) {
  return page(`
    <div class="blob" style="left:-160px;top:640px;width:1300px;height:900px;border-radius:520px 0 0 0;transform:rotate(-3deg)"></div>
    <div class="mistblob" style="right:-260px;top:250px;width:760px;height:760px;border-radius:50%"></div>
    <div class="abs script" style="left:40px;top:105px;font-size:300px;color:${SAGE};white-space:nowrap">${esc(script)}</div>
    <div class="abs cond" style="left:70px;top:420px;width:560px;font-size:132px;line-height:.96">${esc(headline)}</div>
    ${underline(330, 'left:76px;top:820px')}
    <div class="abs hand" style="left:76px;top:880px;width:400px;font-size:66px;line-height:.95;color:${CREME}">${esc(subline)}</div>
    <img class="sticker" src="${imgUrl(foto)}" style="right:-170px;bottom:-70px;height:1230px;transform:rotate(-2deg);filter:drop-shadow(10px 12px 0 rgba(109,121,101,.28)) drop-shadow(0 10px 18px rgba(0,0,0,.2))">
    ${heart(170, MIST, SAGE, -10, 'left:560px;top:520px')}
    ${question(120, SAGE, 12, 'right:50px;top:70px')}
    ${sparkle(70, 'left:640px;top:330px', CREME)}
    ${sparkle(44, 'right:110px;top:560px')}
    ${sparkle(34, 'left:560px;top:250px')}
    <div class="abs hand" style="left:80px;top:1095px;font-size:50px;color:${CREME}">${esc(hint)}</div>
    ${arrow(110, 8, `left:350px;top:1130px;opacity:.95;stroke:${CREME}`)}
    ${doodle(70, CREME, `style="left:64px;bottom:40px"`)}
  `)
}

const P2 = '#f9f7f5' // Papierfarbe als eigener Marker, applyPalette setzt hier das Papier der Palette ein
const SHADOW = "filter:drop-shadow(10px 12px 0 rgba(109,121,101,.30)) drop-shadow(0 10px 18px rgba(0,0,0,.2))"
const dots = (size, style) => `<div class="abs" style="width:${size}px;height:${size}px;border-radius:50%;background-image:radial-gradient(${SAGE} 22%,transparent 24%);background-size:26px 26px;opacity:.16;${style}"></div>`

/** Hingucker-Cover: Vollfläche, Schreibschrift-Wort mit hartem Schatten, Headline auf schiefen Papierstreifen, Nina riesig davor. */
export function coverViral({ script, lines, subline, foto, swipe = 'wisch weiter' }) {
  const strips = lines.map((t, i) => {
    const last = i === lines.length - 1
    const rot = [-2.5, 1.8, -1.6, 2][i % 4]
    return `<div class="abs cond" style="left:${44 + (i % 2) * 44}px;top:${445 + i * 176}px;font-size:132px;font-weight:700;line-height:1;padding:4px 30px 14px;transform:rotate(${rot}deg);background:${last ? SAGE : P2};color:${last ? P2 : SAGE};box-shadow:10px 10px 0 ${last ? MIST : SAGE}">${esc(t)}</div>`
  }).join('')
  return page(`
    <div class="blob" style="inset:0"></div>
    ${dots(1050, 'right:-380px;top:120px')}
    <div class="abs" style="right:-150px;top:190px;width:820px;height:820px;border-radius:50%;background:${P2}"></div>
    <div class="abs script" style="left:20px;top:88px;font-size:318px;color:${P2};transform:rotate(-5deg);text-shadow:9px 9px 0 ${SAGE};white-space:nowrap">${esc(script)}</div>
    ${strips}
    <img class="sticker" src="${imgUrl(foto)}" style="right:-215px;bottom:-110px;height:1290px;transform:rotate(-3deg);${SHADOW}">
    <div class="abs hand" style="left:52px;top:${445 + lines.length * 176 + 40}px;width:440px;font-size:60px;line-height:.95;color:${SAGE}">${esc(subline)}</div>
    ${heart(170, P2, SAGE, -12, 'left:520px;top:1010px')}
    ${question(130, SAGE, 14, 'right:40px;top:60px')}
    ${sparkle(84, 'left:660px;top:300px', P2)}
    ${sparkle(50, 'left:760px;top:220px', SAGE)}
    ${sparkle(46, 'right:60px;top:820px', P2)}
    <div class="abs hand" style="left:56px;bottom:44px;font-size:56px;color:${P2};background:${SAGE};padding:2px 30px 10px;transform:rotate(-3deg);box-shadow:6px 6px 0 ${MIST}">${esc(swipe)} &rarr;</div>
    ${doodle(56, SAGE, `style="left:400px;bottom:40px"`)}
  `)
}

/** Cover ohne Foto, mit gezeichneten Sticker-Objekten. */
export function coverText({ script, headline, subline, hint = 'mehr in der Caption' }) {
  return page(`
    <div class="blob" style="right:-160px;top:-100px;width:760px;height:760px;border-radius:50%"></div>
    <div class="mistblob" style="left:-140px;bottom:-120px;width:760px;height:560px;border-radius:0 300px 0 0"></div>
    <div class="abs script" style="left:64px;top:240px;font-size:250px">${esc(script)}</div>
    <div class="abs cond" style="left:70px;top:520px;width:900px;font-size:150px">${esc(headline)}</div>
    <div class="abs hand" style="left:74px;top:1000px;width:700px;font-size:74px;line-height:.95">${esc(subline)}</div>
    ${heart(190, CREME, SAGE, 8, 'right:90px;top:150px')}
    ${question(140, CREME, -10, 'right:300px;top:390px')}
    <div class="abs hand" style="right:70px;bottom:130px;font-size:56px;transform:rotate(-4deg)">${esc(hint)}</div>
    ${arrow(120, 0, 'right:230px;bottom:60px')}
    ${doodle(78, SAGE, `style="left:64px;bottom:50px"`)}
  `)
}

/** Textseite: Schlüsselwort in Schreibschrift, Text in Kondensschrift, Farbfläche wechselt die Seite. */
export function textSeite({ script, text, side = 'right', note = '' }) {
  const blob = side === 'right'
    ? `<div class="blob" style="right:-220px;top:-150px;width:640px;height:640px;border-radius:50%"></div><div class="mistblob" style="left:-160px;bottom:-160px;width:560px;height:560px;border-radius:50%"></div>`
    : `<div class="blob" style="left:-220px;top:-150px;width:640px;height:640px;border-radius:50%"></div><div class="mistblob" style="right:-160px;bottom:-160px;width:560px;height:560px;border-radius:50%"></div>`
  return page(`
    ${blob}
    <div class="abs script" style="left:80px;top:${script ? 190 : 150}px;font-size:190px">${esc(script || '')}</div>
    <div class="abs cond" style="left:80px;top:${script ? 470 : 260}px;width:900px;font-size:74px;line-height:1.08;font-weight:500">${esc(text)}</div>
    ${note ? `<div class="abs hand" style="left:84px;bottom:130px;font-size:62px;transform:rotate(-2deg)">${esc(note)}</div>` : ''}
    ${doodle(70, SAGE, `style="left:72px;bottom:44px"`)}
    ${wordmark}
  `)
}

/** Zitatseite: großes Zitat, Anführungszeichen als Schreibschrift, Klebeband oben. */
export function zitat({ quote, foto }) {
  return page(`
    <div class="blob" style="left:0;top:150px;width:1080px;height:760px;border-radius:0 340px 0 0"></div>
    <div class="tape" style="left:70px;top:112px;transform:rotate(-5deg)"></div>
    ${sparkle(70, 'right:330px;top:470px', CREME)}
    ${sparkle(40, 'right:250px;top:400px', CREME)}
    <div class="abs script" style="left:70px;top:210px;font-size:340px;color:${CREME};line-height:1">“</div>
    <div class="abs cond" style="left:110px;top:430px;width:620px;font-size:96px;color:${CREME};line-height:1.02">${esc(quote)}</div>
    ${foto ? `<img class="sticker" src="${imgUrl(foto)}" style="right:-90px;bottom:-140px;height:1130px;transform:rotate(-3deg);filter:drop-shadow(10px 12px 0 rgba(109,121,101,.28)) drop-shadow(0 10px 18px rgba(0,0,0,.2))">` : ''}
    ${logo(SAGE, 'left:64px;bottom:36px')}
  `)
}

/** Listenseite: Punkte als Klebestreifen-Zeilen. */
export function liste({ script, title, items }) {
  const rows = items.map((t, i) => `
    <div class="abs" style="left:${70 + (i % 2) * 40}px;top:${450 + i * 165}px;width:850px;background:${i % 2 ? SAGE : MIST};color:${i % 2 ? '#f9f7f5' : SAGE};border-radius:26px;padding:22px 40px;transform:rotate(${i % 2 ? 1.2 : -1.2}deg);box-shadow:0 3px 6px rgba(0,0,0,.12)">
      <div class="cond" style="font-size:52px;line-height:1.05;font-weight:500">${esc(t)}</div>
    </div>`).join('')
  return page(`
    <div class="abs script" style="left:80px;top:130px;font-size:180px">${esc(script)}</div>
    <div class="abs cond" style="left:84px;top:330px;width:900px;font-size:88px">${esc(title)}</div>
    ${rows}
    ${question(110, SAGE, 10, 'right:60px;top:120px')}
    ${doodle(70, SAGE, `style="left:72px;bottom:44px"`)}
    ${wordmark}
  `)
}

/** Schlussseite mit Foto und Aufruf. */
export function schluss({ script, text, cta, foto }) {
  return page(`
    <div class="blob" style="left:0;bottom:0;width:1080px;height:720px;border-radius:340px 0 0 0"></div>
    <div class="abs script" style="left:70px;top:110px;font-size:200px">${esc(script)}</div>
    <div class="abs cond" style="left:76px;top:350px;width:560px;font-size:66px;line-height:1.06;font-weight:500">${esc(text)}</div>
    <img class="sticker" src="${imgUrl(foto)}" style="right:-120px;bottom:-140px;height:1180px;transform:rotate(-2deg);filter:drop-shadow(10px 12px 0 rgba(109,121,101,.28)) drop-shadow(0 10px 18px rgba(0,0,0,.2))">
    <div class="abs hand" style="left:80px;bottom:330px;width:480px;font-size:80px;color:${CREME};transform:rotate(-3deg);line-height:.95">${esc(cta)}</div>
    ${arrow(130, 12, `left:330px;bottom:190px;stroke:${CREME}`)}
    ${sparkle(64, 'left:520px;top:640px')}
    ${sparkle(38, 'left:610px;top:580px')}
    ${heart(150, MIST, SAGE, -8, 'left:560px;top:740px')}
    ${doodle(78, CREME, `style="left:72px;bottom:50px"`)}
  `)
}

/** Farbvariante anwenden: ink = Text und Linien, main = große Fläche, light = zweite Fläche, onMain = Text auf der Fläche. */
export function applyPalette(html, { ink, main, light, paper = CREME, onMain = CREME }) {
  const rgb = ink.match(/\w\w/g).map((h) => parseInt(h, 16)).join(',')
  const inkAssets = onMain === ink
  html = inkAssets ? html.replace(/(logo|doodle)-(sage|creme)\.png/g, '$1-ink.png') : html
  return html
    .replaceAll('#6d7965', ink)
    .replaceAll('rgba(109,121,101', `rgba(${rgb}`)
    .replaceAll('#d7dfde', light)
    .replace(/(?<![-\w])color:#f9f7f4/g, `color:${onMain}`)
    .replaceAll('stroke:#f9f7f4', `stroke:${onMain}`)
    .replaceAll('#f9f7f4', paper)
    .replaceAll('#f9f7f5', paper)
    .replace('</style>', `.blob{background:${main}!important}</style>`)
}
