// Wählt den nächsten Beitrag. Regeln: nur geprüfte Beiträge, „Frühestens“ beachten, Angebote im Wechsel,
// jeder dritte Beitrag ohne Angebot, nie zweimal dasselbe Kernthema hintereinander, mittwochs das Serien-Reel.
export function veroeffentlichteFeed(q) {
  return q.filter((x) => x.status === 'veroeffentlicht' && (x.typ === 'karussell' || x.typ === 'reel')).sort((a, b) => (a.ig?.am || '').localeCompare(b.ig?.am || ''))
}

export function waehle(q, { typ, serie = false, jetzt = new Date() }) {
  const heute = jetzt.toISOString().slice(0, 10)
  let kand = q.filter((x) => x.status === 'geprueft' && x.typ === typ && (!x.fruehestens || x.fruehestens <= heute) && (x.versuche || 0) < 3)
  if (typ === 'reel') kand = kand.filter((x) => (serie ? !!x.serie : !x.serie))
  if (!kand.length) return null
  const letzte = veroeffentlichteFeed(q).slice(-2)
  const ohneAngebotNoetig = letzte.length === 2 && letzte.every((x) => x.angebot && x.angebot !== 'keins')
  let pool = kand
  if (ohneAngebotNoetig) pool = kand.filter((x) => !x.angebot || x.angebot === 'keins')
  else pool = kand.filter((x) => !(letzte.length && letzte[letzte.length - 1].angebot === x.angebot && x.angebot !== 'keins'))
  if (!pool.length) pool = kand
  const lastThema = letzte.length ? letzte[letzte.length - 1].kernthema : null
  const anders = pool.filter((x) => x.kernthema !== lastThema)
  const wahl = (anders.length ? anders : pool)
  return wahl.sort((a, b) => (a.id < b.id ? -1 : 1))[0]
}
