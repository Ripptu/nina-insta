// Prüft, was Facebook aus den zuletzt gespiegelten Beiträgen gemacht hat (Status, sichtbar ja/nein). Läuft nur per Hand: workflow „Facebook prüfen“.
import fs from 'node:fs'
const T = process.env.FB_PAGE_TOKEN, P = process.env.FB_PAGE_ID
const G = 'https://graph.facebook.com/v21.0'
const get = async (p) => (await fetch(`${G}/${p}${p.includes('?') ? '&' : '?'}access_token=${T}`)).json()
const q = JSON.parse(fs.readFileSync(new URL('../plan/queue.json', import.meta.url), 'utf8'))
const me = await get('me?fields=id,name')
console.log('Token gehört zu:', me.error ? 'FEHLER ' + me.error.message : `${me.name} (${me.id})`)
for (const x of q.filter((y) => y.fb?.id).sort((a, b) => (a.fb.am || '').localeCompare(b.fb.am || '')).slice(-6)) {
  const reel = x.typ === 'reel'
  const j = await get(`${x.fb.id}?fields=${reel ? 'id,published,status,length,permalink_url,created_time,title' : 'id,created_time,permalink_url,is_published'}`)
  console.log(x.id, x.typ, 'am', x.fb.am?.slice(0, 16), '→', JSON.stringify(j).slice(0, 400))
}
const vids = await get(`${P}/videos?fields=id,created_time,published,status,permalink_url&limit=5`)
console.log('Seiten-Videos:', JSON.stringify(vids).slice(0, 900))
const feed = await get(`${P}/posts?fields=id,created_time,message,is_published&limit=6`)
console.log('Seiten-Beiträge:', JSON.stringify(feed).slice(0, 1200))
const info = await get(`${P}?fields=id,name,link,username,fan_count,followers_count,verification_status,is_published,is_webhooks_subscribed`)
console.log('Seite:', JSON.stringify(info))
const alt = await get('61573364314285?fields=id,name,link,fan_count')
console.log('Seite 61573364314285:', JSON.stringify(alt).slice(0, 300))
const feed2 = await get(`${P}/published_posts?fields=id,created_time,permalink_url,status_type&limit=6`)
console.log('Veröffentlicht:', JSON.stringify(feed2).slice(0, 1500))
