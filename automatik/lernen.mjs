// Was die Automatik aus den eigenen Zahlen und aus Ninas Rückmeldungen lernt, gebündelt für die Schreib-Prompts.
// - erfolgsmuster(): rechnet aus data/messwerte.json + Queue, welche Beiträge am besten liefen (nach Typ getrennt,
//   weil Reels systematisch mehr Reichweite haben) und wie Kernthema, Angebot und Format abschneiden. Nur Zahlen, kein Claude.
// - data/schreib-lernen.md: Schreibregeln, die der Denk-Lauf (think.mjs) jeden Sonntag aus erfolgsmuster() ableitet.
// - docs/nina-wuensche.md: Ninas Rückmeldungen, gelten immer und werden vom Denk-Lauf nie geändert.
// - buchQuellen(): Ninas eigene Texte (Hörbuch-Kapitel, Audio-Journal) aus stimme/*.json als inhaltliche Quelle.
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(new URL('..', import.meta.url).pathname)
const lies = (f) => (fs.existsSync(path.join(ROOT, f)) ? fs.readFileSync(path.join(ROOT, f), 'utf8') : '')

// Gewichtung nach dem, was Instagram für die Verbreitung zählt: Teilen und Speichern vor Likes, Follows am meisten.
const GEWICHT = { shares: 8, saved: 5, comments: 3, follows: 10 }
const MIN_ALTER_TAGE = 2
const KERNTHEMA = { 1: 'Muster in der Partnerwahl', 2: 'Nähe und die Angst davor', 3: 'sich in Beziehungen selbst verlieren', 4: 'allein sein, ohne zu warten' }

const punkte = (w) => (w.reach || 0) + Object.entries(GEWICHT).reduce((s, [k, g]) => s + g * (w[k] || 0), 0)
const schnitt = (xs) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0)

export function gemesseneBeitraege(mw, q, heute = new Date()) {
  const queue = new Map(q.map((x) => [x.id, x]))
  return Object.values(mw.beitraege || {})
    .filter((b) => b.id && b.verlauf?.length && b.typ !== 'story')
    .filter((b) => (heute - new Date(b.zeit)) / 864e5 >= MIN_ALTER_TAGE)
    .map((b) => {
      const w = b.verlauf[b.verlauf.length - 1]
      const it = queue.get(b.id) || {}
      return {
        id: b.id, titel: b.titel, typ: b.typ, zeit: b.zeit?.slice(0, 10), kernthema: b.kernthema, angebot: b.angebot || 'keins',
        format: it.format || (b.id.startsWith('v') ? 'Stimm-Reel' : null), buch: Boolean(it.buchquelle) || b.id.startsWith('v') || it.angebot === 'Buch', reach: w.reach || 0, saved: w.saved || 0, shares: w.shares || 0,
        comments: w.comments ?? w.kommentare ?? 0, follows: w.follows || 0, watch_ms: w.ig_reels_avg_watch_time || null, punkte: punkte(w),
      }
    })
}

function gruppe(posts, schluessel, name) {
  const g = {}
  for (const p of posts) (g[schluessel(p) ?? 'ohne'] ||= []).push(p)
  return Object.entries(g).filter(([, xs]) => xs.length >= 2).sort((a, b) => schnitt(b[1].map((x) => x.punkte)) - schnitt(a[1].map((x) => x.punkte)))
    .map(([k, xs]) => `- ${name(k)}: Ø ${schnitt(xs.map((x) => x.punkte))} Punkte, Ø Reichweite ${schnitt(xs.map((x) => x.reach))}, Speichern ${xs.reduce((s, x) => s + x.saved, 0)}, Teilen ${xs.reduce((s, x) => s + x.shares, 0)} (n=${xs.length})`)
}

const zeile = (p) => `- ${p.id} „${p.titel}“ (${p.zeit}, Kernthema ${p.kernthema ?? '?'}, Angebot ${p.angebot}${p.format ? `, ${p.format}` : ''}): ${p.punkte} Punkte, Reichweite ${p.reach}, gespeichert ${p.saved}, geteilt ${p.shares}, Kommentare ${p.comments}, Follows ${p.follows}${p.watch_ms ? `, Ø Sehdauer ${(p.watch_ms / 1000).toFixed(1)} s` : ''}`

export function erfolgsmuster(mw, q, heute = new Date()) {
  const posts = gemesseneBeitraege(mw, q, heute)
  if (posts.length < 4) return `Noch zu wenig gemessene Beiträge (${posts.length}).`
  const teile = [`Punkte = Reichweite + ${Object.entries(GEWICHT).map(([k, g]) => `${g} × ${k}`).join(' + ')}. Vergleich nur innerhalb eines Typs. ${posts.length} Beiträge, mindestens ${MIN_ALTER_TAGE} Tage alt.`]
  for (const typ of ['feed', 'reel']) {
    const xs = posts.filter((p) => p.typ === typ).sort((a, b) => b.punkte - a.punkte)
    if (xs.length < 3) continue
    const n = Math.min(5, Math.floor(xs.length / 2))
    teile.push(`\n### ${typ === 'feed' ? 'Karussells' : 'Reels'} (n=${xs.length}, Ø ${schnitt(xs.map((x) => x.punkte))} Punkte)\nAm stärksten:\n${xs.slice(0, n).map(zeile).join('\n')}\nAm schwächsten:\n${xs.slice(-n).reverse().map(zeile).join('\n')}`)
    teile.push(`Nach Kernthema:\n${gruppe(xs, (p) => p.kernthema, (k) => `${k} ${KERNTHEMA[k] || ''}`.trim()).join('\n') || '- zu wenig Daten'}`)
    teile.push(`Aus Ninas Buch/Hörbuch oder nicht:\n${gruppe(xs, (p) => (p.buch ? 'aus dem Buch' : 'nicht aus dem Buch'), (k) => k).join('\n') || '- zu wenig Daten'}`)
    teile.push(`Nach Angebot:\n${gruppe(xs, (p) => p.angebot, (k) => k).join('\n') || '- zu wenig Daten'}`)
    if (typ === 'reel') teile.push(`Nach Art:\n${gruppe(xs, (p) => (p.id.startsWith('v') ? 'Stimm-Reel (Ninas Texte, Kati Demiri)' : 'Clip-Reel mit Text'), (k) => k).join('\n') || '- zu wenig Daten'}`)
  }
  return teile.join('\n')
}

export function buchQuellen() {
  const dir = path.join(ROOT, 'stimme')
  if (!fs.existsSync(dir)) return ''
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => {
    try {
      const t = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).text?.trim()
      return t ? `[${f.replace(/\.json$/, '')}]\n${t}` : null
    } catch { return null }
  }).filter(Boolean).join('\n\n')
}

// Ein Block für alle Schreib-Prompts (Karussell, Reel, Story).
export function lernBlock() {
  const wuensche = lies('docs/nina-wuensche.md').trim()
  const regeln = lies('data/schreib-lernen.md').trim()
  const muster = lies('data/erfolgsmuster.md').trim()
  const buch = buchQuellen()
  return [
    wuensche && `NINAS WÜNSCHE (gelten immer, vor allen anderen Erkenntnissen):\n${wuensche}`,
    buch && `INHALTLICHE QUELLE: NINAS EIGENE TEXTE (Buch „Zwischen Single-Sein & falscher Nähe“, Hörbuch, Audio-Journal; gesprochen von Kati Demiri).\nJeder Beitrag baut auf genau einem Gedanken aus diesen Texten auf und gibt ihn in Ninas Worten wieder; höchstens ein kurzer Satz darf wörtlich übernommen werden. Kein allgemeines Coaching-Wissen, keine Themen, die hier nicht vorkommen. Schreibe in die Metazeile "- Buchquelle: <Dateiname>" (z. B. hoerbuch-selbstwert).\n${buch}`,
    regeln && `WAS BEI @ninahoemmencoaching NACHWEISLICH FUNKTIONIERT (aus den eigenen Zahlen, wöchentlich neu):\n${regeln}`,
    muster && `ZAHLEN DAZU (stärkste und schwächste Beiträge):\n${muster.slice(0, 5000)}`,
  ].filter(Boolean).join('\n\n')
}
