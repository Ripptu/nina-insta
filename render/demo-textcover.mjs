import { createEngine } from './engine.mjs'
import { readPosts } from './inhalt.mjs'
import fs from 'node:fs'
const eng = await createEngine()
fs.mkdirSync('../material/auto/tc', { recursive: true })
const posts = readPosts().slice(0, 3)
for (const [i, p] of posts.entries()) {
  const r = await eng.coverText(p.pages[0], { variant: i })
  console.log(await eng.renderHtml(r.html, `../material/auto/tc/0${i + 1}.jpg`, 1350))
}
await eng.close()
