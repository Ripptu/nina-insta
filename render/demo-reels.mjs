import { createEngine } from './engine.mjs'
import { readReels, renderReel } from './reel.mjs'
const nrs = process.argv.slice(2).map(Number)
const eng = await createEngine()
const used = new Set()
for (const rl of readReels().filter((r) => nrs.includes(r.nr))) {
  const r = await renderReel(eng, rl, '../material/auto/reels', { used, coverRegistrieren: false })
  console.log(rl.nr, r.status, r.cover, r.log.filter((l) => /Cover/.test(l)).join(' | '))
}
await eng.close()
