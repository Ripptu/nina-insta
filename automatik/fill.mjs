// Hält den Puffer gefüllt: produziert nach, prüft, wiederholt bis genug geprüfte Beiträge da sind.
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { ladeQueue } from './queue.mjs'

const params = JSON.parse(fs.readFileSync(new URL('../plan/params.json', import.meta.url), 'utf8'))
const git = (...a) => execFileSync('git', a, { stdio: 'inherit' })
// In Actions nach jedem Schritt speichern, damit ein Abbruch keine Arbeit kostet
const sichern = () => {
  if (!process.env.GITHUB_ACTIONS) return
  try {
    git('config', 'user.name', 'nina-insta-bot'); git('config', 'user.email', 'bot@users.noreply.github.com')
    git('add', '-A', 'plan', 'out', 'data', 'docs')
    try { execFileSync('git', ['diff', '--cached', '--quiet']) } catch { git('commit', '-q', '-m', 'Produktion: Zwischenstand'); git('pull', '--rebase', '-q'); git('push', '-q') }
  } catch (e) { console.log('Zwischenspeichern fehlgeschlagen: ' + e.message) }
}
const run = (args) => { try { execFileSync('node', args, { stdio: 'inherit' }) } catch (e) { console.log(`Schritt ${args.join(' ')} fehlgeschlagen: ${e.message}`) } sichern() }
const zaehle = async () => {
  const q = await ladeQueue()
  return {
    feed: q.filter((x) => x.status === 'geprueft' && (x.typ === 'karussell' || (params.reels_aktiv && x.typ === 'reel'))).length,
    stories: q.filter((x) => x.status === 'geprueft' && x.typ === 'story').length,
    neu: q.filter((x) => x.status === 'neu').length,
  }
}
for (let runde = 1; runde <= 14; runde++) {
  const z = await zaehle()
  console.log(`Runde ${runde}: Feed ${z.feed}/${params.puffer_min}, Stories ${z.stories}/6, ungeprüft ${z.neu}`)
  if (z.neu) { run(['automatik/qa-lauf.mjs', '--max', '6']); continue }
  if (z.feed >= params.puffer_min && z.stories >= 6) break
  if (z.feed < params.puffer_min) {
    run(['automatik/produce.mjs', '--typ', 'karussell', '--anzahl', '3'])
    if (params.reels_aktiv) run(['automatik/produce.mjs', '--typ', 'reel', '--anzahl', '3'])
  }
  if (z.stories < 6) run(['automatik/produce.mjs', '--typ', 'story', '--anzahl', '3'])
  run(['automatik/qa-lauf.mjs', '--max', '6'])
}
const z = await zaehle()
console.log(`Ende: Feed ${z.feed}, Stories ${z.stories}`)
if (z.feed < params.puffer_min) console.log('HINWEIS: Vorrat erschöpft oder Prüfung lehnt ab. Neue Inhalte nötig (neu-schreiben.mjs).')
