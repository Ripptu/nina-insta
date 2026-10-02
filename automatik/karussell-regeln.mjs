// Feste Struktur für Karussell-Texte (Christian, 02.10.2026, „virale Karussells“):
//  Seite 1  Hook, höchstens 10 Wörter (Neugier oder ein Problem aufgemacht)
//  Seite 2 bis 5  Inhalt, ein Kerngedanke pro Seite, kurze Sätze, keine Textwüsten
//  Seite 6  CTA, eine klare Handlungsaufforderung (Speichern, Teilen, Kommentieren; bei Angebot „Link in der Bio“)
// Gibt eine Liste von Verstößen zurück (leer = in Ordnung).
export const MAX_HOOK = 10
export const MAX_INHALT = 20
export const MAX_CTA = 26
const woerter = (t) => String(t || '').replace(/\*\*/g, '').split(/\s+/).filter(Boolean).length
const saetze = (t) => (String(t || '').match(/[^.!?]+[.!?]+["“”]*/g) || [String(t || '')]).length
const CHAT = /^(Du sagst|Vorher)[^]*?(Manchmal meinst du|Nachher)/
const CTA_WORT = /speicher|teile|teil |schick|kommentier|schreib|link in der bio/i

export function pruefeStruktur(post) {
  const f = []
  const p = post.pages || []
  if (p.length !== 6) { f.push(`${p.length} statt 6 Seiten`); if (!p.length) return f }
  const cover = p[0]
  if (cover.role !== 'cover') f.push('Seite 1 ist kein Cover')
  const hook = woerter(`${cover.head || ''} ${cover.sub || ''}`)
  if (hook > MAX_HOOK) f.push(`Seite 1: Hook hat ${hook} Wörter (höchstens ${MAX_HOOK})`)
  for (let i = 1; i <= 4 && i < p.length; i++) {
    const t = p[i].text || ''
    const w = woerter(t)
    const max = CHAT.test(t) ? 30 : MAX_INHALT
    if (p[i].role === 'close' || p[i].role === 'buch') f.push(`Seite ${i + 1}: Inhaltsseite darf keine Schlussseite sein`)
    if (w > max) f.push(`Seite ${i + 1}: ${w} Wörter (höchstens ${max}), Textwüste`)
    if (!CHAT.test(t) && saetze(t) > 2) f.push(`Seite ${i + 1}: mehr als zwei Sätze, ein Kerngedanke pro Seite`)
    if (/\|/.test(t) || /(^|\s)[1-9][.)]\s/.test(t)) f.push(`Seite ${i + 1}: Aufzählung oder Nummerierung`)
  }
  const cta = p[5]
  if (cta && cta.role !== 'close' && cta.role !== 'buch') f.push('Seite 6 ist keine Schlussseite (CTA)')
  const ct = cta?.text || ''
  if (woerter(ct) > MAX_CTA) f.push(`Seite 6: CTA hat ${woerter(ct)} Wörter (höchstens ${MAX_CTA})`)
  if (!CTA_WORT.test(ct)) f.push('Seite 6: keine klare Handlungsaufforderung (Speichern, Teilen, Kommentieren oder Link in der Bio)')
  const hatAngebot = post.angebot && !/^keins?$/i.test(String(post.angebot).trim())
  if (hatAngebot && !/link in der bio/i.test(ct)) f.push('Seite 6: Angebot ohne „Link in der Bio“')
  if (!hatAngebot && /link in der bio/i.test(ct)) f.push('Seite 6: „Link in der Bio“ ohne Angebot')
  return f
}
