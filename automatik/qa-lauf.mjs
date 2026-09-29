// Prüft alle Beiträge mit Status „neu“ mit dem unabhängigen Prüf-Agenten.
// Aufruf: node automatik/qa-lauf.mjs [--max N]
import path from 'node:path'
import { ladeQueue, speichereQueue } from './queue.mjs'
import { pruefe } from './qa.mjs'

const ROOT = path.resolve(new URL('..', import.meta.url).pathname)
const max = process.argv.includes('--max') ? +process.argv[process.argv.indexOf('--max') + 1] : 99
const q = await ladeQueue()
let n = 0
for (const item of q) {
  if (item.status !== 'neu' || n >= max) continue
  n++
  const v = await pruefe(item, ROOT)
  item.qa = { verdikt: v.verdikt, gruende: v.gruende, am: new Date().toISOString() }
  item.status = v.verdikt === 'ok' ? 'geprueft' : 'abgelehnt'
  await speichereQueue(q)
  console.log(`${item.id} ${item.titel}: ${v.verdikt}${v.gruende.length ? ' – ' + v.gruende.join(' | ') : ''}`)
}
console.log(`${n} geprüft.`)
