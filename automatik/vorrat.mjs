// Prüft, wie viel unproduzierter Vorrat noch da ist, und lässt bei Bedarf neu schreiben.
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { ladeQueue } from './queue.mjs'
import { readPosts } from '../render/inhalt.mjs'
import { readReels } from '../render/reel.mjs'

const q = await ladeQueue()
const ids = new Set(q.map((x) => x.id))
const AUTO_P = new URL('../docs/content-posts-auto.md', import.meta.url), AUTO_R = new URL('../docs/content-reels-auto.md', import.meta.url)
const posts = [...readPosts(), ...(fs.existsSync(AUTO_P) ? readPosts(AUTO_P) : [])].filter((p) => !ids.has(`k${String(p.nr).padStart(2, '0')}`))
const reels = [...readReels(), ...(fs.existsSync(AUTO_R) ? readReels(AUTO_R) : [])].filter((r) => !ids.has(`r${String(r.nr).padStart(2, '0')}`) && !r.braucht_ton)
console.log(`Vorrat: ${posts.length} Karussells, ${reels.length} Reels (ohne Ton) unproduziert`)
const schreibe = (typ, n) => { try { execFileSync('node', ['automatik/neu-schreiben.mjs', '--typ', typ, '--anzahl', String(n)], { stdio: 'inherit' }) } catch { console.log(`Neuschreiben ${typ} fehlgeschlagen`) } }
if (posts.length < 6) schreibe('karussell', 4)
const reelsAn = JSON.parse(fs.readFileSync(new URL('../plan/params.json', import.meta.url), 'utf8')).reels_aktiv
if (reelsAn && reels.length < 4) schreibe('reel', 4)
