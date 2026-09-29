// Handgezeichnete Deko (SVG, nur Linien) für Seiten ohne Foto. Alles eigene Zeichnungen, keine Fotos oder Clipart.
const wrap = (vb, body, { color, w, sw = 5, rot = 0, style = '' }) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${w}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" style="transform:rotate(${rot}deg);${style}">${body}</svg>`

export const DEKO = {
  herz: (o) => wrap('0 0 200 180', '<path d="M100 160 C 20 105, 8 55, 45 32 C 72 16, 96 34, 100 56 C 106 32, 132 14, 158 30 C 196 55, 178 108, 100 160 Z"/><path d="M52 44 C 44 50, 40 58, 40 66" opacity=".7"/>', o),
  funke: (o) => wrap('0 0 200 200', '<path d="M100 20 V70 M100 130 V180 M20 100 H70 M130 100 H180 M42 42 L74 74 M126 126 L158 158 M158 42 L126 74 M74 126 L42 158" />', o),
  stern: (o) => wrap('0 0 200 200', '<path d="M100 12 C 106 70, 130 94, 188 100 C 130 106, 106 130, 100 188 C 94 130, 70 106, 12 100 C 70 94, 94 70, 100 12 Z"/>', o),
  weg: (o) => wrap('0 0 220 240', '<path d="M110 230 C 108 190, 104 160, 108 130"/><path d="M108 130 C 96 96, 62 82, 34 34"/><path d="M108 130 C 122 96, 160 80, 188 30"/><path d="M14 52 L34 30 L58 46"/><path d="M166 24 L190 26 L192 52"/>', o),
  sprechblase: (o) => wrap('0 0 240 200', '<path d="M40 30 C 90 14, 170 12, 208 34 C 232 60, 224 108, 196 128 C 160 148, 120 146, 96 146 C 84 160, 66 172, 44 176 C 54 164, 56 154, 56 146 C 20 130, 10 70, 40 30 Z"/><path d="M78 76 H160 M78 104 H132" opacity=".8"/>', o),
  welle: (o) => wrap('0 0 320 120', '<path d="M8 60 C 30 12, 52 12, 74 60 S 118 108, 140 60 S 186 12, 208 60 S 254 108, 276 60 S 304 30, 312 40"/>', o),
  haus: (o) => wrap('0 0 220 200', '<path d="M24 100 L110 24 L196 100"/><path d="M42 88 V176 H178 V88"/><path d="M92 176 V126 H128 V176"/><path d="M150 44 V28 H170 V60" />', o),
  zweiKreise: (o) => wrap('0 0 260 160', '<circle cx="90" cy="80" r="62"/><circle cx="170" cy="80" r="62"/>', o),
  kreis: (o) => wrap('0 0 200 200', '<path d="M100 18 C 160 12, 190 60, 184 108 C 178 160, 130 188, 84 180 C 34 170, 10 122, 20 78 C 30 34, 70 20, 118 24"/>', o),
  zickzack: (o) => wrap('0 0 320 50', '<path d="M8 30 C 60 12, 110 42, 160 24 S 260 40, 312 18"/><path d="M40 44 C 100 30, 170 46, 240 34" opacity=".7"/>', o),
  sonne: (o) => wrap('0 0 220 220', '<circle cx="110" cy="110" r="42"/><path d="M110 22 V52 M110 168 V198 M22 110 H52 M168 110 H198 M48 48 L69 69 M151 151 L172 172 M172 48 L151 69 M69 151 L48 172"/>', o),
  pfeil: (o) => wrap('0 0 170 90', '<path d="M6 70 C 30 8, 100 4, 150 44"/><path d="M128 28 L152 46 L122 58"/>', o),
  kringel: (o) => wrap('0 0 160 60', '<path d="M4 40 C 30 4, 60 4, 50 30 C 44 50, 20 40, 40 22 C 70 -4, 110 20, 156 14"/>', o),
}

const KEYS = [
  [/herz|liebe|verlieb|gefühl|nähe suchen/i, 'herz'],
  [/weg|entscheid|richtung|muster|wiederhol|immer wieder/i, 'weg'],
  [/kopf|gedanke|satz|sätze|sagst|sagt|frage|antwort|sprech|nachricht/i, 'sprechblase'],
  [/körper|atem|ruhig|nerven|anspann|aufregung|angst|unruhe/i, 'welle'],
  [/zuhause|haus|wohn|vertraut/i, 'haus'],
  [/allein|abstand|distanz|nähe|beziehung|zu zweit|paar/i, 'zweiKreise'],
  [/hell|neu|anfang|morgen|frei|klar/i, 'sonne'],
]
/** Wählt eine passende Zeichnung zum Text; sonst abwechselnd Funke, Stern, Kreis. */
export function dekoFuer(text, index = 0) {
  for (const [re, k] of KEYS) if (re.test(text)) return k
  return ['funke', 'stern', 'kringel', 'kreis'][index % 4]
}
