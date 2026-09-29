// Hält den Puffer gefüllt: produziert nach, prüft, wiederholt bis genug geprüfte Beiträge da sind.
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { ladeQueue } from './queue.mjs'

const params = JSON.parse(fs.readFileSync(new URL('../plan/params.json', import.meta.url), 'utf8'))
const run = (args) => execFileSync('node', args, { stdio: 'inherit' })
const zaehle = async () => {
  const q = await ladeQueue()
  return {
    feed: q.filter((x) => x.status === 'geprueft' && (x.typ === 'karussell' || x.typ === 'reel')).length,
    stories: q.filter((x) => x.status === 'geprueft' && x.typ === 'story').length,
    neu: q.filter((x) => x.status === 'neu').length,
  }
}
for (let runde = 1; runde <= 4; runde++) {
  const z = await zaehle()
  console.log(`Runde ${runde}: Feed ${z.feed}/${params.puffer_min}, Stories ${z.stories}/6, ungeprüft ${z.neu}`)
  if (z.neu) { run(['automatik/qa-lauf.mjs']); continue }
  if (z.feed >= params.puffer_min && z.stories >= 6) break
  if (z.feed < params.puffer_min) {
    run(['automatik/produce.mjs', '--typ', 'karussell', '--anzahl', '2'])
    run(['automatik/produce.mjs', '--typ', 'reel', '--anzahl', '3'])
  }
  if (z.stories < 6) run(['automatik/produce.mjs', '--typ', 'story', '--anzahl', '3'])
  run(['automatik/qa-lauf.mjs'])
}
const z = await zaehle()
console.log(`Ende: Feed ${z.feed}, Stories ${z.stories}`)
if (z.feed < params.puffer_min) console.log('HINWEIS: Vorrat erschöpft oder Prüfung lehnt ab. Neue Inhalte nötig (neu-schreiben.mjs).')
