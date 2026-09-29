// Wählt den nächsten Beitrag. Regeln: nur geprüfte Beiträge, „Frühestens“ beachten (Berliner Datum), Werbung nie zweimal
// hintereinander und nie unter den ersten drei, nie dasselbe Kernthema hintereinander, jeder dritte Beitrag ohne Angebot,
// nie zweimal dasselbe Angebot. Ist eine Regel mangels Auswahl nicht erfüllbar, wird sie der Reihe nach gelockert und das gemeldet.
import { berlin } from './zeit.mjs'

const zahl = (id) => Number(String(id).replace(/\D/g, '')) || 0
const norm = (a) => {
  const s = String(a ?? 'keins').toLowerCase().trim()
  return s === '' ? 'keins' : s.startsWith('veranstaltung') ? 'veranstaltungen' : s
}
export const hatAngebot = (x) => norm(x.angebot) !== 'keins'
const sortiert = (l) => [...l].sort((a, b) => zahl(a.id) - zahl(b.id))

export function veroeffentlichteFeed(q) {
  return q.filter((x) => x.status === 'veroeffentlicht' && (x.typ === 'karussell' || x.typ === 'reel')).sort((a, b) => (a.ig?.am || '').localeCompare(b.ig?.am || ''))
}

export function waehle(q, { typ, serie = false, jetzt = new Date(), log = () => {} }) {
  const heute = berlin(jetzt).datum
  let kand = q.filter((x) => x.status === 'geprueft' && x.typ === typ && (!x.fruehestens || x.fruehestens <= heute) && (x.versuche || 0) < 3)
  if (typ === 'reel') kand = kand.filter((x) => (serie ? !!x.serie : !x.serie))
  if (!kand.length) return null
  if (typ === 'story') return sortiert(kand)[0]
  const hist = veroeffentlichteFeed(q)
  const letzter = hist[hist.length - 1]
  const werbeVor = hist.slice(-3).some((x) => x.format === 'Werbung')
  const ohneNoetig = hist.length >= 2 && hist.slice(-2).every(hatAngebot)
  const regeln = [
    ['Werbung nie hintereinander und nie unter den ersten drei', (x) => !(x.format === 'Werbung' && (werbeVor || hist.length < 3))],
    ['nicht dasselbe Kernthema wie der letzte Beitrag', (x) => !(letzter && x.kernthema != null && x.kernthema === letzter.kernthema)],
    ['jeder dritte Beitrag ohne Angebot', (x) => !ohneNoetig || !hatAngebot(x)],
    ['nicht dasselbe Angebot wie der letzte Beitrag', (x) => !(letzter && hatAngebot(x) && norm(x.angebot) === norm(letzter.angebot))],
  ]
  let pool = kand
  for (const [name, ok] of regeln) {
    const n = pool.filter(ok)
    if (n.length) pool = n
    else log(`Regel gelockert (zu wenig Auswahl): ${name}`)
  }
  // ist Werbung fällig, kommt sie zuerst
  if (typ === 'karussell' && !werbeVor && hist.length >= 3 && !ohneNoetig) {
    const mit = pool.filter((x) => x.format === 'Werbung')
    if (mit.length) pool = mit
  }
  return sortiert(pool)[0]
}
