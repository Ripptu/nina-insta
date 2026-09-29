// Regel (Christian, 29.09.2026): Jedes Foto darf nur ein einziges Mal als Cover vorkommen, niemals zweimal.
// Cover = erste Seite eines Karussells und Titelbild eines Reels. Das Verzeichnis merkt sich, welches Foto welches Cover war.
import fs from 'node:fs'
const FILE = new URL('../data/cover-nutzung.json', import.meta.url)
export const ladeCovers = () => (fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : {})
/** Foto-IDs, die schon Cover waren (ohne das Cover des Beitrags `ausser`, damit erneutes Rendern desselben Beitrags möglich bleibt). */
export const benutzteCoverFotos = (ausser) => new Set(Object.entries(ladeCovers()).filter(([id, v]) => id !== ausser && typeof v === 'number').map(([, v]) => v))
/** foto = Foto-ID oder 'text' (reines Textcover). */
export function registriereCover(beitragId, foto) {
  const c = ladeCovers()
  c[beitragId] = foto
  fs.writeFileSync(FILE, JSON.stringify(c, null, 1))
}
export const freieCoverFotos = (katalog, ausser) => {
  const b = benutzteCoverFotos(ausser)
  return katalog.filter((p) => !b.has(p.id))
}
