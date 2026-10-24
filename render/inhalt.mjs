// Liest docs/content-posts.md in Strukturen.
import fs from 'node:fs'

const strip = (s) => s.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim()

export function readPosts(file = new URL('../docs/content-posts.md', import.meta.url)) {
  const md = fs.readFileSync(file, 'utf8')
  const start = md.indexOf('# Karussells')
  const end = md.search(/^# Stories/m)
  const body = md.slice(start, end > 0 ? end : undefined)
  const posts = []
  for (const sec of body.split(/^## /m).slice(1)) {
    const head = sec.match(/^Karussell (\d+): (.+)/)
    if (!head) continue
    const meta = {}
    for (const m of sec.matchAll(/^- ([^:]+): (.+)$/gm)) meta[m[1].trim().toLowerCase()] = m[2].trim()
    const pages = []
    for (const line of sec.split('\n')) {
      const m = line.match(/^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*(.+?)\s*\|\s*$/)
      if (!m) continue
      const vorlage = m[2]
      const raw = m[3]
      const v = vorlage.toLowerCase()
      const role = v.includes('cover') ? 'cover' : v.includes('zitat') ? 'quote' : v.includes('schluss') ? (v.includes('buch') ? 'buch' : 'close') : 'text'
      if (role === 'cover') {
        const [h, ...s] = raw.split(' / ')
        pages.push({ n: +m[1], role, vorlage, head: strip(h), sub: strip(s.join(' / ')) })
      } else pages.push({ n: +m[1], role, vorlage, text: strip(raw).replace(/\s+\/\s+/g, ' ').replace(/^\/\s*/, '') })
    }
    const cap = sec.match(/\*\*Caption:\*\*\n([\s\S]*?)\n\*\*Hashtags:\*\*\s*(.+)/)
    posts.push({
      nr: +head[1], titel: head[2].trim(), format: meta.format, kernthema: meta.kernthema, angebot: meta.angebot,
      fruehestens: meta['frühestens'] || null, termin: meta.termin || null, coverFoto: meta['cover-foto'] || null, buchquelle: meta.buchquelle || null, pages, caption: cap ? cap[1].trim() : '', hashtags: cap ? cap[2].trim() : '',
    })
  }
  return posts
}
