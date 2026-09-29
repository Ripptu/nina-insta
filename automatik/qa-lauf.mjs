// Prüft alle Beiträge mit Status „neu“ mit dem unabhängigen Prüf-Agenten, mehrere gleichzeitig.
// Aufruf: node automatik/qa-lauf.mjs [--max N] [--parallel P]
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { ladeQueue, speichereQueue } from './queue.mjs'
import { pruefe } from './qa.mjs'

const ROOT = path.resolve(new URL('..', import.meta.url).pathname)
const arg = (n, d) => (process.argv.includes(n) ? +process.argv[process.argv.indexOf(n) + 1] : d)
const max = arg('--max', 99)
const parallel = arg('--parallel', 8)
const q = await ladeQueue()
const todo = q.filter((x) => x.status === 'neu').slice(0, max)
let n = 0
let next = 0
let kette = Promise.resolve()
const gitSichern = () => {
  if (!process.env.GITHUB_ACTIONS) return
  try {
    const g = (...a) => execFileSync('git', a, { stdio: 'ignore' })
    g('config', 'user.name', 'nina-insta-bot'); g('config', 'user.email', 'bot@users.noreply.github.com')
    g('add', '-A', 'plan')
    try { g('diff', '--cached', '--quiet') } catch { g('commit', '-q', '-m', 'Prüfung: Zwischenstand'); g('pull', '--rebase', '-q'); g('push', '-q') }
  } catch (e) { console.log('Zwischenspeichern fehlgeschlagen: ' + e.message.slice(0, 120)) }
}
const sichern = () => (kette = kette.then(async () => { await speichereQueue(q); if (n % 3 === 0) gitSichern() }))
const worker = async () => {
  while (next < todo.length) {
    const item = todo[next++]
    let v
    try { v = await pruefe(item, ROOT) } catch (e) { console.log(`${item.id}: Prüfung fehlgeschlagen (${e.message.slice(0, 200)}), bleibt neu`); continue }
    item.qa = { verdikt: v.verdikt, gruende: v.gruende, am: new Date().toISOString() }
    item.status = v.verdikt === 'ok' ? 'geprueft' : 'abgelehnt'
    n++
    await sichern()
    console.log(`${item.id} ${item.titel}: ${v.verdikt}${v.gruende.length ? ' – ' + v.gruende.join(' | ') : ''}`)
  }
}
await Promise.all(Array.from({ length: Math.min(parallel, todo.length) }, worker))
await kette
gitSichern()
console.log(`${n} geprüft.`)
