// Prüft, wie viel unproduzierter Vorrat noch da ist, und lässt bei Bedarf neu schreiben.
// Karussells und Stories: unter 6 unproduzierte, dann 4 neue. Reels: unter 4 (nur wenn reels_aktiv).
// Ohne erreichbares Claude (lokal nicht angemeldet) meldet neu-schreiben.mjs das mit einer Zeile (Exit-Code 2), hier läuft alles weiter.
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { ladeQueue } from './queue.mjs'
import { readPosts } from '../render/inhalt.mjs'
import { readReels } from '../render/reel.mjs'
import { alleStories } from '../render/story.mjs'

const STORY_VORRAT_MIN = 6, STORY_NEU = 4
const q = await ladeQueue()
const ids = new Set(q.map((x) => x.id))
const AUTO_P = new URL('../docs/content-posts-auto.md', import.meta.url), AUTO_R = new URL('../docs/content-reels-auto.md', import.meta.url)
const posts = [...readPosts(), ...(fs.existsSync(AUTO_P) ? readPosts(AUTO_P) : [])].filter((p) => !ids.has(`k${String(p.nr).padStart(2, '0')}`))
const reels = [...readReels(), ...(fs.existsSync(AUTO_R) ? readReels(AUTO_R) : [])].filter((r) => !ids.has(`r${String(r.nr).padStart(2, '0')}`) && !r.braucht_ton)
// Stories aus docs/content-posts.md und docs/content-stories-auto.md; nur ohne Queue-Eintrag zählen sie als Vorrat
const stories = alleStories().filter((s) => !ids.has(`s${String(s.nr).padStart(2, '0')}`))
console.log(`Vorrat: ${posts.length} Karussells, ${reels.length} Reels (ohne Ton), ${stories.length} Stories unproduziert`)
const P0 = JSON.parse(fs.readFileSync(new URL('../plan/params.json', import.meta.url), 'utf8'))
// Seit 29.10.2026 aus: Der Auto-Schreiber kennt Ninas Buch nicht (es liegt nur lokal) und schrieb Beiträge, die nicht von ihr stammen.
if (P0.auto_schreiben === false) { console.log('Auto-Schreiben ist aus (plan/params.json): neue Beiträge nur aus Ninas Buch, von Hand.'); process.exit(0) }
const schreibe = (typ, n) => { try { execFileSync('node', ['automatik/neu-schreiben.mjs', '--typ', typ, '--anzahl', String(n)], { stdio: 'inherit' }) } catch (e) { if (e.status !== 2) console.log(`Neuschreiben ${typ} fehlgeschlagen`) } }
if (posts.length < 6) schreibe('karussell', 4)
const params = JSON.parse(fs.readFileSync(new URL('../plan/params.json', import.meta.url), 'utf8'))
if (params.reels_aktiv && reels.length < 4) schreibe('reel', 4)
if (params.stories && stories.length < STORY_VORRAT_MIN) schreibe('story', STORY_NEU)
