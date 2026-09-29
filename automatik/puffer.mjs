// Meldet, ob nachproduziert werden muss (für die Workflow-Bedingung). Gibt „noetig=true|false“ aus.
import fs from 'node:fs'
import { ladeQueue } from './queue.mjs'
const params = JSON.parse(fs.readFileSync(new URL('../plan/params.json', import.meta.url), 'utf8'))
const q = await ladeQueue()
const bereit = q.filter((x) => x.status === 'geprueft' && (x.typ === 'karussell' || (params.reels_aktiv && x.typ === 'reel'))).length
const neu = q.filter((x) => x.status === 'neu').length
const noetig = bereit < params.puffer_min || neu > 0
console.log(`Puffer: ${bereit} geprüft, ${neu} ungeprüft, Ziel ${params.puffer_min}`)
console.log(`noetig=${noetig}`)
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `noetig=${noetig}\n`)
